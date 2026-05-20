/**
 * RedisModule - Global Redis connection.
 *
 * Same pattern as PrismaModule and MessagingModule:
 * Global singleton, available everywhere without explicit imports.
 */
import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
