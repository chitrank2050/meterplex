/**
 * Response DTOs for API key endpoints.
 *
 * The CreateApiKeyResponseDto includes the raw key — this is
 * the ONLY time it appears. All other responses show only
 * the prefix and metadata.
 *
 * Each DTO has a static factory method (fromService) that maps
 * the service output to the exact API shape. This decouples the
 * database/service layer from the HTTP contract.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ApiKeyCreatorDto {
  @ApiProperty({ example: 'b1ccfb75-6d33-4be4-9556-6f3ac55456a1' })
  id!: string;

  @ApiProperty({ example: 'alice@meterplex.dev' })
  email!: string;

  @ApiProperty({ example: 'Alice' })
  firstName!: string;

  @ApiProperty({ example: 'Johnson' })
  lastName!: string;
}

export class CreateApiKeyResponseDto {
  @ApiProperty({ example: 'ec2decdf-1e5d-4229-b43a-7f557741e207' })
  id!: string;

  @ApiProperty({ example: 'Production backend' })
  name!: string;

  @ApiProperty({
    example: 'mp_live_aB',
    description: 'First 10 chars for identification',
  })
  keyPrefix!: string;

  @ApiProperty({ enum: ['ACTIVE', 'REVOKED', 'EXPIRED'], example: 'ACTIVE' })
  status!: string;

  @ApiPropertyOptional({ example: '2026-07-04T12:00:00.000Z', nullable: true })
  expiresAt!: Date | null;

  @ApiProperty({ example: '2026-04-04T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({
    example: 'mp_live_aBcDeFgHiJkLmNoPqRsTuVwXyZ012345',
    description: 'The full API key — shown ONCE, never again',
  })
  key!: string;

  @ApiProperty({
    example: 'Store this key securely. It will not be shown again.',
  })
  warning!: string;

  /**
   * Maps the service create() output to the creation response DTO.
   */
  static fromService(data: {
    id: string;
    name: string;
    keyPrefix: string;
    status: string;
    expiresAt: Date | null;
    createdAt: Date;
    key: string;
    warning: string;
  }): CreateApiKeyResponseDto {
    return {
      id: data.id,
      name: data.name,
      keyPrefix: data.keyPrefix,
      status: data.status,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt,
      key: data.key,
      warning: data.warning,
    };
  }
}

export class ApiKeyResponseDto {
  @ApiProperty({ example: 'ec2decdf-1e5d-4229-b43a-7f557741e207' })
  id!: string;

  @ApiProperty({ example: 'Production backend' })
  name!: string;

  @ApiProperty({ example: 'mp_live_aB' })
  keyPrefix!: string;

  @ApiProperty({ enum: ['ACTIVE', 'REVOKED', 'EXPIRED'], example: 'ACTIVE' })
  status!: string;

  @ApiPropertyOptional({ example: '2026-07-04T12:00:00.000Z', nullable: true })
  expiresAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-04-04T12:00:00.000Z', nullable: true })
  lastUsedAt!: Date | null;

  @ApiProperty({ example: '2026-04-04T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: ApiKeyCreatorDto })
  createdByUser!: ApiKeyCreatorDto;

  /**
   * Maps a Prisma selected API key (with createdByUser) to this DTO.
   */
  static fromService(data: {
    id: string;
    name: string;
    keyPrefix: string;
    status: string;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
    createdByUser: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }): ApiKeyResponseDto {
    return {
      id: data.id,
      name: data.name,
      keyPrefix: data.keyPrefix,
      status: data.status,
      expiresAt: data.expiresAt,
      lastUsedAt: data.lastUsedAt,
      createdAt: data.createdAt,
      createdByUser: data.createdByUser,
    };
  }
}

export class ApiKeyListResponseDto {
  @ApiProperty({ type: [ApiKeyResponseDto] })
  data!: ApiKeyResponseDto[];

  /**
   * Maps the service findAllForTenant() output to this DTO.
   */
  static fromService(
    data: Parameters<typeof ApiKeyResponseDto.fromService>[0][],
  ): ApiKeyListResponseDto {
    return {
      data: data.map((item) => ApiKeyResponseDto.fromService(item)),
    };
  }
}

export class ApiKeyRevokedResponseDto {
  @ApiProperty({ example: 'ec2decdf-1e5d-4229-b43a-7f557741e207' })
  id!: string;

  @ApiProperty({ example: 'Production backend' })
  name!: string;

  @ApiProperty({ example: 'mp_live_aB' })
  keyPrefix!: string;

  @ApiProperty({ example: 'REVOKED' })
  status!: string;

  @ApiProperty({ example: '2026-04-04T12:00:00.000Z' })
  createdAt!: Date;

  /**
   * Maps the service revoke() output to this DTO.
   */
  static fromService(data: {
    id: string;
    name: string;
    keyPrefix: string;
    status: string;
    createdAt: Date;
  }): ApiKeyRevokedResponseDto {
    return {
      id: data.id,
      name: data.name,
      keyPrefix: data.keyPrefix,
      status: data.status,
      createdAt: data.createdAt,
    };
  }
}
