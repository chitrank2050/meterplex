# Development Setup

## Prerequisites

| Tool | Minimum Version | Install | Check Command |
| :--- | :--- | :--- | :--- |
| Node.js | 20.0.0 | [nodejs.org](https://nodejs.org) | `node --version` |
| pnpm | 9.0.0 | `npm i -g pnpm` | `pnpm --version` |
| Docker | 24.0.0 | [docs.docker.com](https://docs.docker.com/get-docker/) | `docker --version` |
| Docker Compose | 2.20.0 | Bundled with Docker Desktop | `docker compose version` |
| gitleaks | 8.0.0 | `brew install gitleaks` | `gitleaks version` |
| zizmor | - | `brew install zizmor` | `zizmor --version` |
| knip | - | `pnpm install` (dev dep) | `pnpm lint:knip` |
| lefthook | - | `pnpm install` (dev dep) | `pnpm lefthook --version` |

## ⚡ Quick Start (Recommended)

The easiest way to get started is using our **Interactive Setup Wizard**. It handles dependency installation, environment configuration, infrastructure startup, and database seeding in one go.

```bash
# 1. Clone the repository
git clone https://github.com/chitrank2050/meterplex.git
cd meterplex

# 2. Run the Interactive Wizard
pnpm dev:init
```

The wizard will guide you through the process. Use **[Space]** to select tasks and **[Enter]** to start.

---

## 🛠️ Manual First-Time Setup

If you prefer to run commands manually or are in a non-interactive environment, follow these steps:

```bash
# 1. Install dependencies & generate Prisma client
pnpm run init

# 2. Start core infrastructure (Postgres, Redis, Kafka)
pnpm run docker:setup

# 3. (Optional) Start the Kafka Web UI
# We keep this dormant by default to save CPU load.
pnpm docker:ui

# 4. Start the application
pnpm start:dev
```

## Verify Everything Works

```bash
# Health check (should return status: ok)
curl http://localhost:3000/health | jq

# Swagger docs (open in browser)
open http://localhost:3000/api/docs

# Check database has seed data
docker compose exec postgres psql -U meterplex -d meterplex -c "SELECT name, slug FROM tenants"
```

## Developer Tooling

Two tools are wired into the git hooks and lint scripts. **You must have them available locally or the pre-commit hook will fail.**

### gitleaks - Secret scanning

gitleaks scans every staged change before a commit is accepted, blocking any accidentally included credentials, API keys, or tokens.

```bash
# macOS
brew install gitleaks

# Linux (download from GitHub Releases)
# https://github.com/gitleaks/gitleaks/releases

# Verify
gitleaks version
```

> **Note:** The pre-commit hook runs `gitleaks protect --staged --redact -v`. If gitleaks is not on your `PATH`, the commit will fail with a "command not found" error.

### knip - Dead code & unused dependency detection

knip is a dev dependency installed via `pnpm install`. It finds unused exports, files, and dependencies in the codebase.

```bash
# Run manually
pnpm lint:knip

# No separate install needed - knip is in devDependencies
```

### zizmor - GitHub Actions security auditor

zizmor is a high-performance security linter for GitHub Actions. It catches injection vulnerabilities, unpinned actions, and overly broad permissions.

```bash
# macOS
brew install zizmor

# Cargo
cargo install zizmor

# Verify
zizmor --version
```

> **Note:** The pre-commit hook automatically runs `zizmor` on any modified workflow files. If it's not installed, the hook will skip the check with a warning.

### lefthook - Git hooks manager

lefthook replaces Husky and lint-staged. It is a Go binary (fast, no extra runtime) installed as a dev dependency and activated by `pnpm install` via the `prepare` script.

```bash
# Hooks are auto-installed after pnpm install via the prepare script.
# To manually re-install:
pnpm lefthook install

# Hooks registered: pre-commit, commit-msg, pre-push
```

## Daily Workflow

```bash
# Start your day
pnpm docker:up          # Start core infra (silent/dormant)
pnpm start:dev          # Start NestJS app

# (Optional) Open the dashboards
pnpm docker:ui          # Open Kafka UI
pnpm db:studio          # Open Prisma Studio

# After changing schema.prisma
pnpm db:migrate:dev --name describe-your-change
pnpm db:generate        # Regenerate typed client

# Environment Maintenance (The Wizard)
# Use the wizard for Nuclear Resets, Hygiene Checks, or Dead-Code Analysis
pnpm setup
```

## Common Issues

### Port 5432 already in use

You have a local Postgres installation competing with Docker. Stop it:

```bash
# Homebrew
brew services stop postgresql@18

# Postgres.app
# Quit from menu bar
```

### Prisma "exports is not defined in ES module scope"

The Prisma client was generated without `moduleFormat = "cjs"`. Fix:

```bash
# Verify schema.prisma has moduleFormat = "cjs" in the generator block
pnpm db:generate
```

### Prisma "role does not exist"

Docker volume has stale data from a previous run with different credentials:

```bash
pnpm docker:down   # -v flag removes volumes
pnpm docker:up
pnpm db:migrate:dev
pnpm db:seed
```

## Environment Variables

All environment variables are documented in `.env.example`. The app validates every variable on startup - if any required variable is missing, the app crashes immediately with a clear error listing exactly what's missing.

See `src/config/env.validation.ts` for the validation schema.

## Conventions

### File Naming

- Files: `kebab-case.ts` (e.g., `correlation-id.middleware.ts`)
- Classes: `PascalCase` (e.g., `CorrelationIdMiddleware`)
- Barrel exports: `index.ts` in each module folder

### Import Aliases

| Alias | Resolves To |
| :--- | :--- |
| `@common/*` | `src/common/*` |
| `@config/*` | `src/config/*` |
| `@modules/*` | `src/modules/*` |

### Database Conventions

- Table names: `snake_case` plural (e.g., `tenants`)
- Column names: `snake_case` (e.g., `created_at`)
- Primary keys: UUID v4 (Postgres native `uuid` type)
- Prisma models: `PascalCase` singular with `@@map()` for table name
- Prisma fields: `camelCase` with `@map()` for column name
