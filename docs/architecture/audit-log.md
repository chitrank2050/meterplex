# Audit Log

Meterplex records every mutation (create, update, delete) to an immutable `audit_logs` table in Postgres. This provides a queryable, tamper-resistant history of who did what, when, and to which tenant.

## Why Postgres over log aggregators?

A billing platform must prove who changed what. "Who revoked this API key?" and "Who changed the plan from Pro to Starter?" are questions your customers will ask. Log aggregators (Loki, ELK, CloudWatch) can lose data during outages or retention expiry. A database table with indexes gives you reliable, queryable history that survives infrastructure incidents.

Structured request logs still go to stdout for operational visibility (Phase 7 will route these to Loki). The audit log table is a **product feature**, not an infrastructure concern.

---

## Schema

```sql
CREATE TABLE "audit_logs" (
    "id"             UUID         PRIMARY KEY,
    "tenant_id"      UUID         NOT NULL,
    "actor_id"       VARCHAR(255) NOT NULL,
    "actor_type"     audit_actor_type NOT NULL,  -- USER | API_KEY | SYSTEM
    "action"         audit_action     NOT NULL,  -- CREATE | UPDATE | DELETE
    "resource"       VARCHAR(100) NOT NULL,
    "resource_id"    VARCHAR(255) NOT NULL,
    "changes"        JSONB        NOT NULL DEFAULT '{}',
    "ip_address"     VARCHAR(45),
    "user_agent"     VARCHAR(500),
    "correlation_id" VARCHAR(36),
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Column reference

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `tenant_id` | UUID | Which tenant was affected. Not a foreign key - survives tenant deletion |
| `actor_id` | VARCHAR(255) | User UUID or API key UUID of who performed the action |
| `actor_type` | ENUM | `USER` (JWT auth), `API_KEY` (server-to-server), or `SYSTEM` (internal ops) |
| `action` | ENUM | `CREATE`, `UPDATE`, or `DELETE` |
| `resource` | VARCHAR(100) | Resource type: `tenant`, `user`, `api_key`, `membership`, etc. |
| `resource_id` | VARCHAR(255) | UUID of the specific record that was affected |
| `changes` | JSONB | What changed - shape varies by action type (see below) |
| `ip_address` | VARCHAR(45) | Client IP. Supports IPv4 and IPv6 |
| `user_agent` | VARCHAR(500) | Client user agent string (truncated to 500 chars) |
| `correlation_id` | VARCHAR(36) | Links to the request log via `x-correlation-id` header |
| `created_at` | TIMESTAMP | When the action occurred. Immutable - no `updated_at` |

### Indexes

| Index | Columns | Use case |
|-------|---------|----------|
| `audit_logs_tenant_id_idx` | `tenant_id` | "Show all activity in Acme Corp" |
| `audit_logs_actor_id_idx` | `actor_id` | "Show everything Alice did" |
| `audit_logs_resource_resource_id_idx` | `resource, resource_id` | "Show the history of this specific API key" |
| `audit_logs_created_at_idx` | `created_at` | "Show activity from the last 24 hours" |

### Design decisions

- **No foreign keys.** `tenant_id`, `actor_id`, and `resource_id` are plain strings. Audit logs must survive even if the referenced record is deleted. If a user is removed, their audit trail remains.
- **No `updated_at` column.** Audit logs are append-only. Nobody edits an audit log - that defeats the purpose.
- **JSONB for changes.** Flexible before/after diffs without schema changes per resource type.
- **VARCHAR(45) for IP.** Supports IPv4 (max 15 chars) and IPv6 (max 39 chars) with room for mapped addresses.

---

## How the interceptor works

The `AuditLogInterceptor` is registered globally in `main.ts`. It runs on every request without any per-controller decoration.

### Request lifecycle

```
Request in
  → CorrelationIdMiddleware (assigns x-correlation-id)
  → RequestLoggerMiddleware (logs method, path, status)
  → Guards (JwtAuthGuard → TenantGuard → RolesGuard)
  → Controller handler executes
  → AuditLogInterceptor observes the response (tap)
  → Response sent to client
  → Audit record written to Postgres (async, fire-and-forget)
```

The interceptor uses RxJS `tap()` to observe the response after the handler completes. The audit write happens asynchronously - it never blocks or delays the response to the client.

### Why fire-and-forget?

Audit logging is important but not critical-path. If the database write fails (Postgres overloaded, disk full), the user's request still succeeds. The failure is logged to stdout where Loki/ELK will catch it in Phase 7. This is a deliberate trade-off: we accept the tiny risk of a missing audit record over the certainty of degraded response times.

---

## What gets audited

| HTTP Method | Audit Action | Audited? |
|-------------|-------------|----------|
| `POST` | `CREATE` | Yes |
| `PATCH` | `UPDATE` | Yes |
| `PUT` | `UPDATE` | Yes |
| `DELETE` | `DELETE` | Yes |
| `GET` | - | No (reads don't mutate) |
| `HEAD` | - | No |
| `OPTIONS` | - | No |

## What gets skipped

| Path pattern | Reason |
|-------------|--------|
| `/health` | Infrastructure check, not a business operation |
| `/api/v1/auth/*` | Auth endpoints (login, register, refresh, etc.) have their own security logging |
| Routes with `@SkipAudit()` | Explicit opt-out per handler |

---

## Detection logic

### Actor detection

| Source | Actor Type | How it's detected |
|--------|-----------|-------------------|
| JWT-authenticated user | `USER` | `request.user.id` set by `JwtAuthGuard` |
| API key | `API_KEY` | `request.apiKeyId` set by `ApiKeyAuthGuard` |
| Neither | `SYSTEM` | Fallback - shouldn't happen on guarded routes |

### Resource detection

The resource type is inferred from the URL path. The interceptor maps the first segment after `/api/v1/` to a normalized resource name:

| URL path | Resource |
|----------|----------|
| `/api/v1/tenants` | `tenant` |
| `/api/v1/tenants/:id` | `tenant` |
| `/api/v1/users` | `user` |
| `/api/v1/users/:id` | `user` |
| `/api/v1/api-keys` | `api_key` |
| `/api/v1/api-keys/:id` | `api_key` |

The resource ID comes from route params (`:id`) for updates and deletes, or from the response body (`id` field) for creates.

### Tenant detection

For most requests, the tenant ID comes from the `x-tenant-id` header or `request.tenantId` set by guards. For tenant creation (where the tenant doesn't exist yet), the interceptor extracts the ID from the response body.

---

## Changes payload

The `changes` JSONB column stores different shapes depending on the action:

### CREATE - full snapshot of the created resource

```json
{
  "after": {
    "id": "91a81431-8a42-406a-bbae-2de67a3f5d12",
    "name": "New Organization",
    "slug": "new-org",
    "status": "ACTIVE",
    "metadata": {},
    "createdAt": "2026-04-10T04:44:55.643Z",
    "updatedAt": "2026-04-10T04:44:55.643Z"
  }
}
```

### UPDATE - requested changes + resulting state

```json
{
  "requestedChanges": {
    "name": "Acme Corp (Updated)"
  },
  "after": {
    "id": "91a81431-...",
    "name": "Acme Corp (Updated)",
    "slug": "acme-corp",
    "status": "ACTIVE"
  }
}
```

!!! note
    The interceptor does not capture "before" state for updates. Querying the database before every update would add latency to every mutation. If specific services need before/after diffs, they can implement that at the service layer and pass the diff explicitly.

### DELETE - snapshot of the deleted resource

```json
{
  "before": {
    "id": "ec2decdf-...",
    "name": "Production backend",
    "keyPrefix": "mp_live_aB",
    "status": "REVOKED"
  }
}
```

---

## Sensitive field sanitization

The following fields are automatically stripped from the changes payload before storage. Passwords, tokens, and key material **never** appear in audit logs:

- `password`
- `passwordHash`
- `currentPassword`
- `newPassword`
- `key` (raw API key)
- `keyHash`
- `tokenHash`
- `refreshToken`
- `accessToken`

---

## Querying audit logs

### All activity for a tenant

```sql
SELECT action, resource, resource_id, actor_id, created_at
FROM audit_logs
WHERE tenant_id = '91a81431-8a42-406a-bbae-2de67a3f5d12'
ORDER BY created_at DESC
LIMIT 50;
```

### All actions by a specific user

```sql
SELECT action, resource, resource_id, tenant_id, created_at
FROM audit_logs
WHERE actor_id = '466c3507-3ecd-41fe-a98e-3ec5036a6413'
ORDER BY created_at DESC;
```

### History of a specific resource

```sql
SELECT action, actor_id, actor_type, changes, created_at
FROM audit_logs
WHERE resource = 'api_key'
  AND resource_id = 'ec2decdf-1e5d-4229-b43a-7f557741e207'
ORDER BY created_at ASC;
```

### Activity in a time range

```sql
SELECT action, resource, actor_id, created_at
FROM audit_logs
WHERE tenant_id = '91a81431-...'
  AND created_at >= '2026-04-01T00:00:00Z'
  AND created_at < '2026-04-11T00:00:00Z'
ORDER BY created_at DESC;
```

### Search within changes JSONB

```sql
-- Find all records where a tenant's name was changed
SELECT actor_id, changes, created_at
FROM audit_logs
WHERE resource = 'tenant'
  AND action = 'UPDATE'
  AND changes->'requestedChanges' ? 'name';
```

### Correlate with request logs

Every audit record includes a `correlation_id` that matches the `x-correlation-id` in the request logs. To trace a specific mutation:

1. Find the audit record
2. Copy its `correlation_id`
3. Grep your application logs (or search in Loki when Phase 7 is live)

```bash
# In development - grep stdout logs
grep "1b866c66-0b8c-4270-b4bd-7e1ff27ddd7f" logs/app.log
```

---

## Skipping audit on specific routes

Use the `@SkipAudit()` decorator on any controller method that should not produce an audit record:

```typescript
import { SkipAudit } from '@common/decorators';

@SkipAudit()
@Post('internal/sync')
async syncData() {
  // This mutation will NOT be audited
}
```

Use this for endpoints where auditing is not meaningful (internal sync operations) or where audit logging is handled manually in the service layer.

---

## Adding new resources (future phases)

When you add a new module (e.g., `plans` in Phase 2), the interceptor picks it up automatically as long as you add a mapping:

**In `src/common/interceptors/audit-log.interceptor.ts`:**

```typescript
const PATH_TO_RESOURCE: Record<string, string> = {
  tenants: 'tenant',
  users: 'user',
  'api-keys': 'api_key',
  memberships: 'membership',
  plans: 'plan',           // ← add this
  entitlements: 'entitlement', // ← add this
};
```

No other changes needed. The interceptor will automatically audit all POST, PATCH, PUT, DELETE requests to `/api/v1/plans/*` and `/api/v1/entitlements/*`.

---

## Future improvements

These are not built yet. Listed here so the design intent is clear:

- **Audit log API endpoint** - `GET /api/v1/audit-logs` for tenants to query their own audit trail via the API. Requires pagination, filtering, and tenant scoping.
- **Retention policy** - automated cleanup of audit records older than N days/months. Likely a cron job that runs `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years'`.
- **Before-state capture for updates** - for resources where the full diff matters (e.g., plan changes), the service layer can query the record before updating and attach the before-state to the audit log.
- **Bulk operation support** - if a future endpoint creates or updates multiple records in one request, the interceptor should write one audit record per resource, not one for the batch.
- **Export** - CSV/JSON export of audit logs for compliance teams.