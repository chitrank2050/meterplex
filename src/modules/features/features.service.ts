/**
 * FeaturesService - CRUD for the feature catalog.
 *
 * Features are the global capabilities of your platform:
 * "API Calls", "SSO", "Storage", "Webhooks", "Team Seats".
 *
 * Business rules:
 *   - lookup_key must be unique (enforced by DB constraint)
 *   - lookup_key and type are immutable after creation
 *   - Features are ARCHIVED, never deleted (entitlements reference them)
 *   - ARCHIVED features can't be added to new entitlements
 *     but existing entitlements continue to work
 */
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@app-prisma/prisma.service';

import { ERRORS } from '@common/constants';
import {
  isNotFoundError,
  isUniqueConstraintError,
} from '@common/utils/prisma-errors';

import { Prisma } from '@prisma/client';

import { CreateFeatureDto, UpdateFeatureDto } from './dto';

@Injectable()
export class FeaturesService {
  private readonly logger = new Logger(FeaturesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Default select fields for feature queries.
   */
  private readonly DEFAULT_SELECT = {
    id: true,
    name: true,
    lookupKey: true,
    type: true,
    unit: true,
    description: true,
    status: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  /**
   * Create a new feature in the global catalog.
   *
   * @param dto - Feature name, lookupKey, type, and options
   * @returns The created feature
   * @throws ConflictException if lookupKey already exists
   */
  async create(dto: CreateFeatureDto) {
    try {
      const feature = await this.prisma.feature.create({
        data: {
          name: dto.name,
          lookupKey: dto.lookupKey,
          type: dto.type,
          unit: dto.unit,
          description: dto.description,
          metadata: (dto.metadata as Prisma.InputJsonValue) ?? {},
        },
        select: this.DEFAULT_SELECT,
      });

      this.logger.log(
        `Feature created: ${feature.name} (${feature.lookupKey}) [${feature.type}]`,
      );
      return feature;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          ERRORS.FEATURE.LOOKUP_KEY_EXISTS(dto.lookupKey),
        );
      }
      throw error;
    }
  }

  /**
   * List all features, ordered by name.
   *
   * @param includeArchived - Whether to include ARCHIVED features
   * @returns Array of features
   */
  async findAll(includeArchived = false) {
    const where = includeArchived ? {} : { status: 'ACTIVE' as const };

    const features = await this.prisma.feature.findMany({
      where,
      select: this.DEFAULT_SELECT,
      orderBy: { name: 'asc' },
    });

    return { data: features };
  }

  /**
   * Get a feature by UUID.
   *
   * @param id - Feature UUID
   * @returns Feature details
   * @throws NotFoundException if feature doesn't exist
   */
  async findById(id: string) {
    try {
      return await this.prisma.feature.findUniqueOrThrow({
        where: { id },
        select: this.DEFAULT_SELECT,
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.FEATURE.NOT_FOUND_ID(id));
      }
      throw error;
    }
  }

  /**
   * Get a feature by lookup key.
   *
   * @param lookupKey - Feature lookup key (e.g., "api_calls")
   * @returns Feature details
   * @throws NotFoundException if feature doesn't exist
   */
  async findByLookupKey(lookupKey: string) {
    try {
      return await this.prisma.feature.findUniqueOrThrow({
        where: { lookupKey },
        select: this.DEFAULT_SELECT,
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(
          ERRORS.FEATURE.NOT_FOUND_LOOKUP_KEY(lookupKey),
        );
      }
      throw error;
    }
  }

  /**
   * Update a feature.
   *
   * lookup_key and type are NOT updatable:
   *   - lookup_key: code depends on it
   *   - type: entitlements are structured around the type
   *
   * @param id - Feature UUID
   * @param dto - Fields to update
   * @returns The updated feature
   * @throws NotFoundException if feature doesn't exist
   */
  async update(id: string, dto: UpdateFeatureDto) {
    try {
      const feature = await this.prisma.feature.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.unit !== undefined && { unit: dto.unit }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.metadata !== undefined && {
            metadata: dto.metadata as Prisma.InputJsonValue,
          }),
        },
        select: this.DEFAULT_SELECT,
      });

      this.logger.log(
        `Feature updated: ${feature.name} (${feature.lookupKey})`,
      );
      return feature;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.FEATURE.NOT_FOUND_ID(id));
      }
      throw error;
    }
  }
}
