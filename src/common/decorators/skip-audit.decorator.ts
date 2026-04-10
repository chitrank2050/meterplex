/**
 * @SkipAudit() - Marks a route handler to skip audit logging.
 *
 * Use this on endpoints where audit logging is either:
 *   - Not meaningful (bulk health checks, internal endpoints)
 *   - Handled manually (custom audit logic in the service layer)
 *
 * Usage:
 *   @SkipAudit()
 *   @Post('internal/sync')
 *   async syncData() { ... }
 */
import { SetMetadata } from '@nestjs/common';
import { SKIP_AUDIT_KEY } from '@common/interceptors/audit-log.interceptor';

export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
