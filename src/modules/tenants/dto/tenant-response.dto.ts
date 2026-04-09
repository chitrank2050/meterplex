/**
 * Response DTOs for tenant endpoints.
 *
 * These define the EXACT shape of every response so Scalar/Swagger
 * can display field types, descriptions, and examples without
 * running the API. The frontend team uses these as their contract.
 */
import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '@common/dto';
import { Tenant } from '@generated/prisma/client';

export class TenantResponseDto {
  @ApiProperty({ example: '0eed08b2-60b6-4578-ae98-a98f3b164c54' })
  id!: string;

  @ApiProperty({ example: 'Acme Corporation' })
  name!: string;

  @ApiProperty({ example: 'acme-corp' })
  slug!: string;

  @ApiProperty({
    enum: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
    example: 'ACTIVE',
  })
  status!: string;

  @ApiProperty({ example: { timezone: 'America/New_York' } })
  metadata!: Record<string, unknown>;

  @ApiProperty({ example: '2026-04-04T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-04T12:00:00.000Z' })
  updatedAt!: Date;

  /**
   * Factory method to map a service Tenant entity to this DTO.
   */
  static fromService(entity: Tenant): TenantResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      status: entity.status,
      metadata: (entity.metadata as Record<string, unknown>) ?? {},
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class TenantWithRoleResponseDto extends TenantResponseDto {
  @ApiProperty({
    enum: ['OWNER', 'ADMIN', 'DEVELOPER', 'BILLING'],
    example: 'OWNER',
    description: "The authenticated user's role in this tenant",
  })
  role!: string;

  /**
   * Factory method to map a Tenant entity + role string to this DTO.
   */
  static fromServiceWithRole(
    entity: Tenant & { role: string },
  ): TenantWithRoleResponseDto {
    return {
      ...TenantResponseDto.fromService(entity),
      role: entity.role,
    };
  }
}

export class TenantListResponseDto {
  @ApiProperty({ type: [TenantWithRoleResponseDto] })
  data!: TenantWithRoleResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;

  /**
   * Factory method to map a paginated list of tenant-role entities to this DTO.
   */
  static fromService(
    data: (Tenant & { role: string })[],
    meta: PaginationMetaDto,
  ): TenantListResponseDto {
    return {
      data: data.map((item) =>
        TenantWithRoleResponseDto.fromServiceWithRole(item),
      ),
      meta,
    };
  }
}
