/**
 * AdminModule - Platform-level admin endpoints.
 *
 * All endpoints require PlatformAdminGuard.
 * Provides: audit log queries, dead letter management.
 */
import { Module } from '@nestjs/common';

import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { DeadLetterController } from './dead-letter.controller';
import { DeadLetterService } from './dead-letter.service';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';

@Module({
  controllers: [
    AuditLogsController,
    DeadLetterController,
    ReconciliationController,
  ],
  providers: [AuditLogsService, DeadLetterService, ReconciliationService],
})
export class AdminModule {}
