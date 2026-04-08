# Phase 1 - Multi-tenant identity and access

**Goal:** Support organizations using the platform with authentication, authorization, and tenant isolation.

**Status:** ✅ Complete

## TLDR:
Phase 1 is complete. Here's what you built:

- Multi-tenant user model with RBAC (4 roles)
- JWT authentication with access + refresh token rotation
- Password reset and change flows
- Stripe-style API keys with hash-only storage
- Tenant isolation proven at every layer (query, guard, API)
- Seed script with 5 users across 3 tenants with different roles
- All endpoints properly guarded

## What was built

### Data model

![Phase 1 ERD](../architecture/phase-1-erd.png)

Four new tables added to the Tenant model from Phase 0:

- **users** - global accounts with bcrypt-hashed passwords
- **memberships** - join table connecting users to tenants with roles
- **api_keys** - server-to-server authentication tokens (SHA-256 hashed)
- **refresh_tokens** - stateful token tracking for session management
- **password_reset_tokens** - single-use tokens for forgot-password flow

### Authentication

Two authentication mechanisms for two audiences:

- **JWT (access + refresh tokens)** - for dashboard/admin users via browser
  - Access token: 15 min, stateless, no DB lookup per request
  - Refresh token: 7 days, stateful (hashed in DB), token rotation on each refresh
  - Separate signing secrets for access and refresh tokens
- **API keys** - for server-to-server access (Stripe-style `mp_live_...` keys)
  - Raw key shown once at creation, SHA-256 hash stored
  - Key prefix stored for identification without exposure
  - Supports expiration and revocation

### Authorization (RBAC)

Four roles enforced via guards:

| Role | Manage users | Manage billing | Use APIs | Delete tenant |
|------|-------------|----------------|----------|---------------|
| OWNER | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ❌ |
| DEVELOPER | ❌ | ❌ | ✅ | ❌ |
| BILLING | ❌ | ✅ | ❌ | ❌ |

### Tenant isolation

- Users see only tenants they belong to (query-level filtering)
- `TenantGuard` validates `x-tenant-id` header + membership on every scoped request
- `RolesGuard` checks user's role within the specific tenant
- API keys are scoped to a single tenant - no cross-tenant access

### Password management

- **Registration** - creates user + tenant + OWNER membership in one transaction
- **Login** - validates credentials, returns access + refresh tokens
- **Forgot password** - generates crypto-random reset token (15 min, single-use)
- **Reset password** - validates token, updates password, revokes all sessions
- **Change password** - requires current password, revokes other sessions

## API endpoints

### Auth (public)

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Create user + tenant, return tokens |
| POST | /auth/login | Validate credentials, return tokens |
| POST | /auth/refresh | Exchange refresh token for new pair |
| POST | /auth/forgot-password | Generate reset token |
| POST | /auth/reset-password | Reset password with token |

### Auth (protected)

| Method | Path | Description |
|--------|------|-------------|
| GET | /auth/me | Current user profile |
| POST | /auth/change-password | Change password |
| POST | /auth/logout | Revoke refresh token |
| POST | /auth/logout-all | Revoke all sessions |

### Tenants (protected)

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| POST | /tenants | JWT | Create tenant (user becomes OWNER) |
| GET | /tenants | JWT | List user's tenants |
| GET | /tenants/slug/:slug | JWT | Look up by slug |
| GET | /tenants/:id | JWT + Tenant | Get tenant details |
| PATCH | /tenants/:id | JWT + Tenant + OWNER/ADMIN | Update tenant |
| DELETE | /tenants/:id | JWT + Tenant + OWNER | Cancel tenant |

### Users (protected)

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| POST | /users | JWT + Tenant + OWNER/ADMIN | Create user in tenant |
| GET | /users/me | JWT | Own profile |
| GET | /users/:id | JWT | User by ID |
| PATCH | /users/:id | JWT | Update profile |

### API Keys (protected)

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| POST | /api-keys | JWT + Tenant + OWNER/ADMIN | Create key (shown once) |
| GET | /api-keys | JWT + Tenant + OWNER/ADMIN | List keys |
| DELETE | /api-keys/:id | JWT + Tenant + OWNER/ADMIN | Revoke key |

## Key decisions

| Decision | Why |
|----------|-----|
| Multi-tenant users (one login, many orgs) | Matches Slack/GitHub model, more flexible than single-tenant |
| Memberships as join table | Users can have different roles in different tenants |
| Fixed roles (enum) over dynamic RBAC | Four roles is sufficient for a billing platform, no over-engineering |
| Dual JWT tokens (access + refresh) | Short-lived access limits stolen token damage, refresh enables session management |
| Separate secrets for access and refresh | Compromising one doesn't compromise the other |
| Token rotation on refresh | Detects stolen refresh tokens via reuse detection |
| API keys as SHA-256 hashes | Same pattern as Stripe - database breach doesn't expose keys |
| Soft-delete on tenants | Billing compliance requires data retention |
| Password reset via DB tokens (not JWT) | Audit trail, single-use enforcement, explicit revocation |
| x-tenant-id header over URL param | Keeps routes clean, matches Stripe's Connected Accounts pattern |

## Seed data

All passwords: `DevPass123`

| User | Acme Corp | Globex | Stark |
|------|-----------|--------|-------|
| alice@meterplex.dev | OWNER | ADMIN | - |
| bob@meterplex.dev | DEVELOPER | OWNER | - |
| carol@meterplex.dev | BILLING | - | OWNER |
| dave@meterplex.dev | DEVELOPER | DEVELOPER | - |
| eve@meterplex.dev | - | BILLING | ADMIN |

## Gotchas encountered

1. **JWT hash collision** - two tokens signed at the same second with identical payload produce the same hash. Fixed by adding `jti` (JWT ID) claim with random bytes.
2. **`@nestjs/jwt` type mismatch** - `expiresIn` accepts `string | number` at runtime but TypeScript overloads reject strings. Fixed by converting duration to seconds.
3. **Route ordering matters** - `/tenants/me/context` must be defined before `/tenants/:id` or NestJS interprets "me" as a UUID parameter.
4. **Guard chain order** - `JwtAuthGuard` must run before `TenantGuard` and `RolesGuard` because they depend on `request.user` being set.