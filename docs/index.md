# Meterplex Documentation

> Welcome to the Meterplex documentation - a B2B usage metering, entitlements, and billing platform.

---

## Quick Links

| Section | What you'll find |
|---------|-----------------|
| [Architecture](architecture/overview.md) | System design, module boundaries, data flow, infrastructure decisions. |
| [Development](development/setup.md) | Setup guide, daily workflow, conventions, troubleshooting. |
| [API](api/overview.md) | API design decisions, versioning, error format, authentication. |
| [Build Phases](phases/phase-0.md) | Detailed log of each development phase - what was built, why, and lessons learned. |

---

## Getting Started

```bash
git clone git@github.com:chitrank2050/meterplex.git
cd meterplex
pnpm install
cp .env.example .env
pnpm docker:up
pnpm prisma:migrate:dev
pnpm prisma:seed
pnpm start:dev
```

App runs at `http://localhost:3000`. API docs at `http://localhost:3000/api/docs`.

---

## Current Status

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Project setup, infrastructure, foundations | ✅ Complete |
| 1 | Multi-tenant identity and access (auth, tenants, users, API keys) | ✅ Complete |
| 2 | Plans, entitlements, and quotas | 🔜 Next |
| 3 | Usage ingestion, outbox pattern, Kafka pipeline | - |
| 4 | Billing ledger and invoices | - |
| 5 | Payments and webhooks | - |
| 6 | Admin, audit log, reconciliation | - |
| 7 | Observability (Grafana, Loki, OpenTelemetry) | - |
| 8 | Scale, hardening, load testing | - |

## API Endpoints (Phase 1)

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register user + create tenant |
| POST | `/api/v1/auth/login` | Login, get JWT + refresh token |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user profile |
| POST | `/api/v1/auth/change-password` | Change password, revoke other sessions |
| POST | `/api/v1/auth/forgot-password` | Request password reset token |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| POST | `/api/v1/auth/logout` | Revoke a refresh token |
| POST | `/api/v1/auth/revoke-all` | Revoke all sessions |

### Tenants

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/tenants` | Create a tenant |
| GET | `/api/v1/tenants` | List tenants for current user |
| GET | `/api/v1/tenants/:id` | Get tenant by ID |
| GET | `/api/v1/tenants/slug/:slug` | Get tenant by slug |
| PATCH | `/api/v1/tenants/:id` | Update tenant |
| GET | `/api/v1/tenants/me/context` | Get current tenant context |

### Users

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/users` | Create user in tenant |
| GET | `/api/v1/users/:id` | Get user by ID |
| PATCH | `/api/v1/users/:id` | Update user profile |

### API Keys

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/api-keys` | Create API key (shown once) |
| GET | `/api/v1/api-keys` | List keys for tenant |
| DELETE | `/api/v1/api-keys/:id` | Revoke API key |