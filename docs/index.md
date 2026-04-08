# Meterplex Documentation

> Welcome to the Meterplex documentation - a B2B usage metering, entitlements, and billing platform.

---

## Quick Links

| Section | What you'll find |
|---------|-----------------|
| [Architecture](architecture/overview.md) | System design, module boundaries, data flow, infrastructure decisions. |
| [Development](development/setup.md) | Setup guide, daily workflow, conventions, troubleshooting. |
| [API](api/overview.md) | API design decisions, versioning strategy, error response format, authentication. |
| [Build Phases](phases/phase-0.md) | Detailed log of each development phase - what was built, why, and lessons learned. |

---

## Getting Started
```bash
git clone <repo-url>
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
| 1 | Auth, tenants, users, plans, subscriptions | 🔜 Next |
| 2 | Entitlements and usage tracking | - |
| 3 | Billing, invoices, payments | - |
| 4 | Kafka event pipeline | - |
| 5 | Observability, rate limiting | - |