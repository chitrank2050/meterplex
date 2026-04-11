# Contributing to Meterplex

Thank you for considering contributing. If you've noticed a bug or have a feature request, [open an issue](https://github.com/chitrank2050/meterplex/issues/new) before starting to code.

---

## Getting started

### Fork and create a branch

[Fork the repo](https://github.com/chitrank2050/meterplex/fork) and create a branch with a descriptive name:

```bash
git checkout -b 42-fix-cache-invalidation
```

### Set up the project

Follow the setup guide: [Setup & Installation](https://chitrank2050.github.io/meterplex/development/setup/)

### Make your changes

Follow the existing code style - strict TypeScript, Prettier formatting, ESLint rules.

```bash
pnpm lint
pnpm format
```

Husky runs lint-staged automatically on commit. If your code has lint errors, the commit will be rejected.

### Run tests

```bash
pnpm test
```

### Open a pull request

Push your branch and open a PR against `main`. Include:

- What the change does
- Why it's needed
- Any relevant issue numbers

CI runs lint, build, and tests on every PR. All checks must pass before merging.

---

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint:

```text
feat: add tenant CRUD endpoints
fix: resolve correlation ID missing on 500 errors
chore: update dependencies
docs: add Phase 1 build log
refactor(prisma): extract connection config to adapter
test: add unit tests for usage validation
build(docker): add Redis container to compose
```

Commits that don't follow this format will be rejected by the pre-commit hook. The changelog is auto-generated from these messages via git-cliff.

---

## Reporting security issues

Do NOT open a public issue for security vulnerabilities. Email the maintainer directly or follow the instructions in [SECURITY.md](SECURITY.md).
