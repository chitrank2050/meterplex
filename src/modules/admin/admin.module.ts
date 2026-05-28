/**
 * AdminModule - Platform-level admin endpoints.
 *
 * All endpoints require PlatformAdminGuard.
 * Currently provides: audit log queries.
 * Future: reconciliation, user management, system health.
 */
import { Module } from '@nestjs/common';

import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
})
export class AdminModule {}
