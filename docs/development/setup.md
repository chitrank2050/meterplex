# Development Setup

## Prerequisites

| Tool | Minimum Version | Install | Check Command |
| :--- | :--- | :--- | :--- |
| Node.js | 20.0.0 | [nodejs.org](https://nodejs.org) | `node --version` |
| pnpm | 9.0.0 | `npm i -g pnpm` | `pnpm --version` |
| Docker | 24.0.0 | [docs.docker.com](https://docs.docker.com/get-docker/) | `docker --version` |
| Docker Compose | 2.20.0 | Bundled with Docker Desktop | `docker compose version` |
| gitleaks | 8.0.0 | `brew install gitleaks` | `gitleaks version` |
| knip | — | `pnpm install` (dev dep) | `pnpm lint:knip` |

## First-Time Setup

```bash
# Clone the repo
git clone <repo-url>
cd meterplex

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Start infrastructure
pnpm docker:up

# Wait for containers to be healthy (~15 seconds)
docker compose ps

# Run database migrations
pnpm db:migrate:dev

# Seed development data
pnpm db:seed

# Start the app
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

### gitleaks — Secret scanning

gitleaks scans every staged change before a commit is accepted, blocking any accidentally included credentials, API keys, or tokens.

```bash
# macOS
brew install gitleaks

# Linux
gitHub Releases: https://github.com/gitleaks/gitleaks/releases

# Verify
gitleaks version
```

> **Note:** The pre-commit hook runs `gitleaks protect --staged --redact -v`. If gitleaks is not on your `PATH`, the commit will fail with a "command not found" error.

### knip — Dead code & unused dependency detection

knip is a dev dependency installed via `pnpm install`. It finds unused exports, files, and dependencies in the codebase.

```bash
# Run manually
pnpm lint:knip

# No separate install needed — knip is in devDependencies
```

---

## Daily Workflow

```bash
# Start your day
pnpm docker:up          # Start containers (if stopped)
pnpm start:dev          # Start app with hot reload

# After changing schema.prisma
pnpm db:migrate:dev --name describe-your-change
pnpm db:generate    # Regenerate typed client

# Nuclear reset (drops all data, re-runs everything)
pnpm docker:down        # Removes containers AND volumes
pnpm docker:up
pnpm db:migrate:dev
pnpm db:seed
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
