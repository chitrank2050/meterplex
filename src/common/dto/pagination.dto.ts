/**
 * PaginationMetaDto — Metadata shape returned with every paginated response.
 *
 * Consistent across all list endpoints so the frontend can build
 * one reusable pagination component that works with any resource.
 *
 * Example:
 *   {
 *     "total": 42,
 *     "page": 2,
 *     "limit": 20,
 *     "totalPages": 3
 *   }
 */
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 42, description: 'Total number of records' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Items per page' })
  limit!: number;

  @ApiProperty({ example: 3, description: 'Total number of pages' })
  totalPages!: number;
}
