<div align="center">
  <img src="assets/logo.png" width="160" height="160" alt="Meterplex Logo">
  <h1>Meterplex</h1>
  <p><strong>Open-source B2B usage metering, entitlements, and billing platform.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white" alt="NestJS">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma">
    <img src="https://img.shields.io/badge/Kafka-231F20?style=flat&logo=apachekafka&logoColor=white" alt="Kafka">
    <img src="https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white" alt="Redis">
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License">
    <img src="https://img.shields.io/badge/Version-0.4.2-blue" alt="Version">
    <a href="https://chitrank2050.github.io/meterplex/">
      <img src="https://img.shields.io/badge/Docs-Live-success?logo=github&logoColor=white" alt="Documentation">
    </a>
    <a href="https://ko-fi.com/D1D71U581P" target="_blank">
      <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Buy me a coffee at ko-fi.com">
    </a>
  </p>
</div>

---

# What is this?

> Meterplex is the backend that powers a SaaS or AI API company. It decides whether a tenant can use a feature, tracks usage events, enforces quotas and rate limits, calculates billable usage, handles payments and webhooks, and provides auditability with replay and reconciliation. Every mutation is recorded to an immutable audit log for compliance and forensics.

## Architecture

Modular monolith - one deployable unit with strict module boundaries. Each domain (tenants, billing, usage, payments) is a self-contained NestJS module that can be extracted into a microservice when scale demands it.

```
┌─────────────────────────────────────────────────────┐
│                    NestJS App                       │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Tenants │ │  Usage   │ │ Billing  │  ...more   │
│  │  Module  │ │  Module  │ │  Module  │  modules   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│       │             │            │                  │
│  ┌────▼─────────────▼────────────▼─────┐            │
│  │          Prisma (PostgreSQL)        │            │
│  └─────────────────────────────────────┘            │
│       │             │            │                  │
│  ┌────▼──┐    ┌─────▼───┐  ┌────▼──┐               │
│  │ Redis │    │  Kafka  │  │ Cron  │               │
│  └───────┘    └─────────┘  └───────┘               │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | NestJS 11 | Modular backend framework |
| Language | TypeScript 5.7 (strict mode) | Type safety |
| Database | PostgreSQL 17 | Primary data store |
| ORM | Prisma 7 | Type-safe database access |
| Message Broker | Apache Kafka 3.9 | Event streaming and async processing |
| Cache | Redis 7 | Caching and rate limiting |
| API Docs | Swagger/OpenAPI | Auto-generated from code |
| Containers | Docker Compose | Local development infrastructure |
| API Testing | Bruno | Git-friendly API collections |

## Quick Start

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9, Docker

# 1. Clone and install
git clone https://github.com/meterplex/meterplex.git

# If want to use ssh instead of https
git clone git@github.com:chitrank2050/meterplex.git

cd meterplex
pnpm install

# 2. Set up environment
cp .env.example .env

# 3. Start infrastructure (Postgres, Kafka, Redis)
pnpm docker:up

# 4. Run database migrations
pnpm prisma:migrate:dev

# 5. Seed development data
pnpm prisma:seed

# 6. Start the app
pnpm start:dev
```

The app runs at `http://localhost:3000`. API docs at `http://localhost:3000/api/docs`. Health check at `http://localhost:3000/health`.

## Project Structure

```
meterplex/
├── src/
│   ├── common/              # Cross-cutting concerns
│   │   ├── constants/       # Error codes, app constants
│   │   ├── decorators/      # @CurrentUser, @TenantId, @Roles
│   │   ├── dto/             # Shared DTOs (error response, pagination)
│   │   ├── filters/         # Global exception filter
│   │   ├── guards/          # TenantGuard, RolesGuard
│   │   ├── interceptors/    # (Phase 2) Audit log interceptor
│   │   ├── middleware/       # Correlation ID, request logging
│   │   ├── pipes/           # (future) Custom validation pipes
│   │   ├── interfaces/      # (future) Shared TypeScript types
│   │   └── utils/           # Prisma error helpers
│   ├── config/              # Environment validation and ConfigModule
│   ├── prisma/              # PrismaService and PrismaModule
│   ├── health/              # Health check endpoint
│   └── modules/
│       ├── tenants/         # Tenant CRUD, tenant-scoped queries
│       ├── users/           # User management, tenant membership
│       ├── auth/            # JWT, Passport, refresh tokens, password reset
│       └── api-keys/        # Server-to-server key management + auth guard
├── prisma/
│   ├── schema.prisma        # Database schema (single source of truth)
│   ├── seed.ts              # Development seed data
│   └── migrations/          # Prisma migration history
├── bruno/                   # API testing collection (Bruno)
├── docs/                    # MkDocs documentation
├── docker-compose.yml       # Postgres, Kafka, Redis
└── package.json
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm start:dev` | Start with hot reload |
| `pnpm start:prod` | Start production build |
| `pnpm build` | Compile TypeScript |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run end-to-end tests |
| `pnpm lint` | Lint and fix code |
| `pnpm prisma:generate` | Regenerate Prisma client |
| `pnpm prisma:migrate:dev` | Create and apply migration |
| `pnpm prisma:migrate:deploy` | Apply migrations (CI/prod) |
| `pnpm prisma:seed` | Seed development data |
| `pnpm prisma:studio` | Open Prisma data browser |
| `pnpm docker:up` | Start Docker containers |
| `pnpm docker:down` | Stop containers and remove volumes |
| `pnpm docker:logs` | Tail container logs |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Infrastructure health check |
| - | `/api/docs` | Swagger UI (development only) |

*More endpoints are added with each phase.*

## Documentation

🚀 **Live Docs:** [chitrank2050.github.io/meterplex](https://chitrank2050.github.io/meterplex/)

Detailed documentation is available in the [`docs/`](./docs) folder and on GitHub Pages:

- **[Architecture](./docs/architecture/overview.md)** - System design, module boundaries, data flow
- **[Development](./docs/development/setup.md)** - Setup guide, conventions, workflow
- **[API](./docs/api/overview.md)** - API design decisions, versioning, error format
- **[Phases](./docs/phases/phase-0.md)** - Build log for each development phase

## Development Phases

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Project setup, infrastructure, foundations | ✅ Complete |
| 1 | Auth, tenants, users, plans, subscriptions | ✅ Complete |
| 2 | Entitlements and usage tracking | 🔜 Next |
| 3 | Billing, invoices, payments | - |
| 4 | Kafka event pipeline, async processing | - |
| 5 | Observability, rate limiting, hardening | - |

## License

MIT — see [LICENSE](LICENSE) for details.

If you use Meterplex in your project, a star or credit is appreciated.

---

❤️ Developed by [Chitrank Agnihotri](https://www.chitrankagnihotri.com)