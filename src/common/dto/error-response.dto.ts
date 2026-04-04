/**
 * ErrorResponseDto — The standard error response shape for Swagger docs.
 *
 * Every error from the API matches this shape — defined once here
 * so Scalar can display it on every error response.
 */
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Validation failed',
    description: 'Error message or array of validation errors',
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({ example: '13850bd4-08fe-4f22-bd5a-b09e13bc6ec2' })
  correlationId!: string;

  @ApiProperty({ example: '2026-04-04T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/tenants' })
  path!: string;
}
