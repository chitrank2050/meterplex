# Phase 5.5 - Security Hardening and Audit Fixes

**Goal:** Fix all security vulnerabilities and technical debt identified in the security audit. This is not a feature phase - it's a quality gate.

**Status:** ✅ Complete

---

## TLDR

11 issues resolved across authentication, authorization, billing, rate limiting, and code quality. Every finding from the Security Audit v2 (2026-05-20) has been addressed.

## What was fixed

### Critical (pre-production blockers)

**#140 - Tenant :id param vs x-tenant-id header mismatch.** An OWNER of Tenant A could modify Tenant B's data by setting `x-tenant-id: TenantA` but putting Tenant B's UUID in the URL. Fixed with controller-level comparison of `@Param('id')` against `@TenantId()`, returning 403 on mismatch. Applied to `findById`, `update`, and `remove` in `TenantsController`.

**#141 - User update endpoint allows any user to modify any profile.** Any JWT holder could PATCH any user's `firstName`, `lastName`, or `isActive`. Fixed with authorization logic: self-update allowed (except `isActive`), admin-update requires `x-tenant-id` + OWNER/ADMIN role + target must be a member of that tenant, `isActive` changes require OWNER.

**#142 - No PlatformAdminGuard for catalog mutations.** Any registered user could create plans, modify features, and change pricing. Added `isPlatformAdmin` boolean to User model, created `PlatformAdminGuard`, applied to all mutating endpoints on plans, features, entitlements, and plan-prices controllers. Read-only endpoints remain public/JWT-only.

**#143 - No rate limiting anywhere.** Auth brute force, usage flooding, and billing DoS were trivial. Implemented Redis-based rate limiting with `RateLimitGuard` (global, 200/min per user default) and `@RateLimit()` decorator with `RATE_LIMITS` presets for tiered limits. Auth: 10/min per IP. Usage: 100/min per tenant. Invoice generation: 5/min per tenant. Standard 429 with `Retry-After` and `X-RateLimit-*` headers. Fail-open on Redis errors.

### High priority

**#144 - Refresh token findUniqueOrThrow fails open on purged tokens.** Purged tokens caused a Prisma `NotFoundError` that bubbled up as 500 instead of 401. Replaced with `findUnique` + explicit null check throwing `UnauthorizedException`.

### Medium priority

**#145 - Cancel endpoint doesn't set status to CANCELLED.** `cancel()` set `cancelledAt` but left `status: ACTIVE`. Cancelled subscriptions continued passing entitlement checks and generating invoices. Added `status: SubscriptionStatus.CANCELLED` to the update.

**#146 - Consume endpoint doesn't persist usage events.** Redis counter was ephemeral - flushed Redis means lost usage, never billed. Added transaction writing `usage_event` + `outbox_event` after Redis increment. Events flow through the existing pipeline for billing durability.

**#147 - Audit log shallow sanitization + no size limit.** `sanitize()` only stripped top-level keys. Nested `{ user: { password: "secret" } }` persisted in plaintext. Replaced with recursive sanitization via `WeakSet` cycle detection, `SENSITIVE_KEYS` set with lowercase comparison, `toJSON()` delegation for Date/Decimal/custom classes, BigInt/Symbol/Function handling, and 10KB payload size limit with `_truncated` flag.

**#148 - Billing ledger endpoints missing RolesGuard.** Any tenant member including DEVELOPER could view financial data. Added `RolesGuard` with `@Roles(OWNER, ADMIN, BILLING)` to all four billing endpoints.

### Low priority

**#149 - Invoices controller has direct Prisma queries.** Created `InvoicesService` with `findAll`, `findById`, `findLineItems`, `generateForTenant`. Controller now delegates everything. Also fixed `generate()` returning inline `{ statusCode: 404 }` instead of throwing `NotFoundException`.

**#150 - Misc: process.env.PORT, pagination, duplicate comment.** Replaced `process.env.PORT` with `ConfigService.get('PORT')`. Added pagination to subscriptions and API keys list endpoints. Removed duplicate comment in `usage-aggregation.consumer.ts`.

## Key decisions

| Decision                                                    | Why                                                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Controller-level tenant ID check, not middleware            | Only affects routes with both `:id` param and `x-tenant-id`. Middleware would run on every request.                 |
| `@Headers('x-tenant-id')` on user update, not `@TenantId()` | The decorator assumes header is required (paired with TenantGuard). User self-update doesn't need tenant context.   |
| `isPlatformAdmin` in DB, not env var                        | Database-driven is more flexible. Can grant/revoke without restart.                                                 |
| Fixed-window rate limiting, not sliding window              | Simpler, sufficient for current scale. Sliding window can be swapped in later - same decorator interface.           |
| Fail-open rate limiting on Redis errors                     | Availability over security for non-auth endpoints. Auth endpoints should arguably fail-closed - future enhancement. |
| Recursive sanitize with `toJSON()` delegation               | Handles Date, Decimal, any custom class automatically. Future-proof.                                                |
| 10KB audit payload limit                                    | Prevents OOM on massive request bodies. `_truncated` flag preserves auditability.                                   |

## Schema changes

- Added `is_platform_admin` boolean to `users` table (default false)
- Migration: `add-is-platform-admin`

## Seed changes

- `alice@meterplex.dev` marked as `isPlatformAdmin: true`
