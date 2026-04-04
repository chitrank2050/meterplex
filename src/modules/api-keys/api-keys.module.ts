/**
 * ApiKeysModule — API key management and authentication.
 *
 * Exports:
 *   - ApiKeysService: used by ApiKeyAuthGuard to authenticate requests
 *   - ApiKeyAuthGuard: used on endpoints that accept API key auth
 *
 * The controller handles key MANAGEMENT (create, list, revoke).
 * The guard handles key AUTHENTICATION (validating keys on requests).
 * These are separate concerns used by different parts of the app.
 */
import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';

@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyAuthGuard],
  exports: [ApiKeysService, ApiKeyAuthGuard],
})
export class ApiKeysModule {}
