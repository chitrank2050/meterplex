# Changelog

All notable changes to the Meterplex API and core platform.

## [0.5.7] - 2026-04-28

### ⚙️ Maintenance

- Update branch name validation error message and set default npm loglevel to error ([97371bc](https://github.com/chitrank2050/meterplex/commit/97371bcb29d2ea82111e2ec817507f45ec7679ba)) by [@chitrank2050](https://github.com/chitrank2050)
- Increase stale closure threshold and add pinned and security labels to exemption lists ([5e9a166](https://github.com/chitrank2050/meterplex/commit/5e9a166340188c93d48dfff4a4e653417664fac5)) by [@chitrank2050](https://github.com/chitrank2050)
- Renovate config to include merge confidence, refine matching rules & group actions deps ([196c80c](https://github.com/chitrank2050/meterplex/commit/196c80c104fd80c16f747cbb82910cdf747c429f)) by [@chitrank2050](https://github.com/chitrank2050)
- Update contents permission to write in auto-approve workflow ([23e6e24](https://github.com/chitrank2050/meterplex/commit/23e6e247454f491bd841d6998f70311182ec67fb)) by [@chitrank2050](https://github.com/chitrank2050)
- Standardize version sync workflow and update changelog formatting and tag pattern ([79339b3](https://github.com/chitrank2050/meterplex/commit/79339b3ebbec3f8891ea92b95d9121b0aeca14bc)) by [@chitrank2050](https://github.com/chitrank2050)
- Remove commitlint configuration and dependencies ([f4a884c](https://github.com/chitrank2050/meterplex/commit/f4a884cb4341b48f68aab9a932ee70be0991d876)) by [@chitrank2050](https://github.com/chitrank2050)
- Update git-cliff configuration with backend-focused commit parsing and templating ([3c1f521](https://github.com/chitrank2050/meterplex/commit/3c1f521eee376faf9ff3cd96b3836cfe5f07ed99)) by [@chitrank2050](https://github.com/chitrank2050)
- Remove *.md from .prettierignore to enable markdown formatting ([f2562d5](https://github.com/chitrank2050/meterplex/commit/f2562d550f3c726e536ca2fb213d430025aad774)) by [@chitrank2050](https://github.com/chitrank2050)
- Update CI workflow to remove commitlint config and point to new ESLint configuration file ([502c8aa](https://github.com/chitrank2050/meterplex/commit/502c8aaa9f528cf76a8164a48abfee4feb5e1c58)) by [@chitrank2050](https://github.com/chitrank2050)
- Remove nest-cli schema reference and suppress deprecation warnings in tsconfig ([1a39bf5](https://github.com/chitrank2050/meterplex/commit/1a39bf59b3ed3c4bd1cce5e69e340ecee1e7d880)) by [@chitrank2050](https://github.com/chitrank2050)
- Remove nest-cli schema reference and suppress deprecation warnings in tsconfig ([b8d9fb0](https://github.com/chitrank2050/meterplex/commit/b8d9fb04cd5837ad30185b4804f563bfd8abf621)) by [@chitrank2050](https://github.com/chitrank2050)
- Update lefthook configuration for improved pre-commit workflow efficiency ([90ef219](https://github.com/chitrank2050/meterplex/commit/90ef219b64094f0096b258105c0e665af8a5a1cd)) by [@chitrank2050](https://github.com/chitrank2050)
- Update git-hygiene action to v0.4.12 across workflow files ([d7bb52d](https://github.com/chitrank2050/meterplex/commit/d7bb52db5ade0ec1ba8272d0ec35e87e9ac6f48e)) by [@chitrank2050](https://github.com/chitrank2050)
- Update git-cliff configuration ([7c2bc0c](https://github.com/chitrank2050/meterplex/commit/7c2bc0cb138db43ad45fe86ffea02ce92b7a306e)) by [@chitrank2050](https://github.com/chitrank2050)
- Add workflow timeouts and update pnpm install commands to ignore scripts ([2ab4967](https://github.com/chitrank2050/meterplex/commit/2ab4967685efab0cb7bc42595ac3c912ed351efb)) by [@chitrank2050](https://github.com/chitrank2050)
- Update checkout action configuration with emoji and fetch-depth in lint workflow ([a8c0ba7](https://github.com/chitrank2050/meterplex/commit/a8c0ba7d9f6f9c702bb382631e7dadf8b1910cf6)) by [@chitrank2050](https://github.com/chitrank2050)

### 📚 Documentation

- Add header documentation to auto-approve workflow file ([a120849](https://github.com/chitrank2050/meterplex/commit/a120849a8211d5f7dd95d69cd42b7acb9cc59d9d)) by [@chitrank2050](https://github.com/chitrank2050)
- Update project documentation in README.md ([dd0edbb](https://github.com/chitrank2050/meterplex/commit/dd0edbbbc58e133ca723e3dc2b86994b23dc1892)) by [@chitrank2050](https://github.com/chitrank2050)

### 🚀 Features

- Implement conditional token selection in auto-approve workflow to handle bot-created PRs ([5d8d985](https://github.com/chitrank2050/meterplex/commit/5d8d985ec8619e3382926eb52a65b4ac0d61e097)) by [@chitrank2050](https://github.com/chitrank2050)
- Implement conditional token selection in auto-approve workflow and update changelog formatting ([8445a24](https://github.com/chitrank2050/meterplex/commit/8445a240b73aa1370fc6a8ccc4be9aeb588dd07a)) by [@chitrank2050](https://github.com/chitrank2050)
- Enable automatic staleness exemptions for assigned, milestoned, and draft issues and PRs ([1c5ec27](https://github.com/chitrank2050/meterplex/commit/1c5ec27f705734e26854d27cdb357ba332e440c1)) by [@chitrank2050](https://github.com/chitrank2050)
- Implement stricter security validation for auto-approvals & optimize PR verification workflow ([d354e07](https://github.com/chitrank2050/meterplex/commit/d354e07db1a44a69d0047d660ee1cb5811361d89)) by [@chitrank2050](https://github.com/chitrank2050)
- Add automatic PR approval step to the auto-approve workflow ([0b7fbde](https://github.com/chitrank2050/meterplex/commit/0b7fbde69842e3403e2dcc45c71ee8d03a1cccd2)) by [@chitrank2050](https://github.com/chitrank2050)
- Add chore/release-* branches to auto-approve workflow triggers and release detection ([a2ae18a](https://github.com/chitrank2050/meterplex/commit/a2ae18a8539945c52bfe9a779f86e672fcf2e216)) by [@chitrank2050](https://github.com/chitrank2050)
- Implement conditional PR approval logic to switch between bot identities based on author ([926bad6](https://github.com/chitrank2050/meterplex/commit/926bad63179db4b4bafbf1e6e28f10de272e3c81)) by [@chitrank2050](https://github.com/chitrank2050)

### 🚜 Refactoring

- Consolidate CI flow to run parallel build & quality checks and update doc Python deps ([b33bec4](https://github.com/chitrank2050/meterplex/commit/b33bec46e5d457919f9a090dbb97d749c8d63621)) by [@chitrank2050](https://github.com/chitrank2050)
- Improve auto-approve security by resolving true author & adding draft/mergeability checks ([0d2b880](https://github.com/chitrank2050/meterplex/commit/0d2b880b87b301aef2af61a5fdde474f08d67da7)) by [@chitrank2050](https://github.com/chitrank2050)
- Replace auto-approve logic with direct auto-merge enablement in CI workflow ([467f009](https://github.com/chitrank2050/meterplex/commit/467f00964e913d523234c98d29cd212f2c6018bc)) by [@chitrank2050](https://github.com/chitrank2050)
- Consolidate branch and PR title validation using git-hygiene ([333bfd3](https://github.com/chitrank2050/meterplex/commit/333bfd38b2853f58724f734160876b8e909f224b)) by [@chitrank2050](https://github.com/chitrank2050)
- Automate release versioning with git-hygiene and add build step to finalization workflow ([40aa8ed](https://github.com/chitrank2050/meterplex/commit/40aa8ed832c37101facb50f98389dc3b101153e6)) by [@chitrank2050](https://github.com/chitrank2050)
- Reformat doc and issue templates to improve table alignment & stylistic consistency ([9a3aec6](https://github.com/chitrank2050/meterplex/commit/9a3aec6fe83bf0bcaac57f11c2f9070a196f7c81)) by [@chitrank2050](https://github.com/chitrank2050)
- Standardize changelog architecture ([89c2a3b](https://github.com/chitrank2050/meterplex/commit/89c2a3bb49cc2f5422d37ad9239f3092f51502b0)) by [@chitrank2050](https://github.com/chitrank2050)
- Modernize git-cliff configuration and update CI workflow automation ([74334b3](https://github.com/chitrank2050/meterplex/commit/74334b3bf7c22813546a40408500f14cf8b756cd)) by [@chitrank2050](https://github.com/chitrank2050)

# Changelog

All notable changes to Meterplex API.

## [Unreleased]


### 🚀 Features

- Implement conditional token selection in auto-approve workflow to handle bot-created PRs (by @chitrank2050)

## [0.5.6] - 2026-04-26


### ⚙️ Maintenance

- Remove automated README version updates from release workflows (by @chitrank2050)
- Update Renovate reviewer settings and improve auto-approval workflow logic (by @chitrank2050)
- Clear assignees and enable grouping for non-major dependencies in renovate config (by @chitrank2050)
- Update auto-approve workflow to use generated GitHub token (by @chitrank2050)
- Update actions/attest-build-provenance action to v4 ([#76](https://github.com/chitrank2050/meterplex/issues/76)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update actions/cache action to v5 ([#82](https://github.com/chitrank2050/meterplex/issues/82)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update actions/stale action to v10 ([#84](https://github.com/chitrank2050/meterplex/issues/84)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update github/codeql-action action to v4 ([#77](https://github.com/chitrank2050/meterplex/issues/77)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update actions/labeler action to v6 ([#83](https://github.com/chitrank2050/meterplex/issues/83)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update pnpm to v10 ([#27](https://github.com/chitrank2050/meterplex/issues/27)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update lefthook configuration to optimize pre-commit hook execution (by @chitrank2050)
- Add release, maintenance, and automated-pr labels to semantic-pr ignore list (by @chitrank2050)
- Update actions/upload-artifact action to v7 ([#75](https://github.com/chitrank2050/meterplex/issues/75)) (by [renovate[bot]](https://github.com/apps/renovate))
- Bump version to v0.5.6 ([#93](https://github.com/chitrank2050/meterplex/issues/93)) (by [chitrank-actions[bot]](https://github.com/apps/chitrank-actions))

### 📚 Documentation

- Update CI/CD doc to reflect the new two-step release workflow & streamlined automation rules (by @chitrank2050)

### 🚀 Features

- Enable auto-merge and squash for approved pull requests in auto-approve workflow (by @chitrank2050)
- Implement two-step release workflow & add repository owner auth checks to automated workflows (by @chitrank2050)
- Add owner identity verification to git-tag and git-release scripts (by @chitrank2050)

### 🚜 Refactoring

- Restrict prepare & release jobs to trigger only on manual dispatch & tag pushes (by @chitrank2050)

## [0.5.5] - 2026-04-25


### ⚙️ Maintenance

- Harden CI/CD runners with step-security audit policy across all workflows (by @chitrank2050)
- Configure production environment and release URL in git-release workflow (by @chitrank2050)
- Pin mkdocs-material version to 9.7.6 in documentation workflow (by @chitrank2050)
- Add main, master, and gh-pages to branch name validation ignore list (by @chitrank2050)
- Allow main, master, and gh-pages branch names in validation rules (by @chitrank2050)
- Configure renovate bot with labels, assignees, and branch pattern support (by @chitrank2050)
- Restrict workflow triggers to main branch for branch validation and linting (by @chitrank2050)
- Restrict workflow triggers to main branch and update documentation deployment logic (by @chitrank2050)
- Categorize codebase ownership in CODEOWNERS file (by @chitrank2050)
- Update git-cliff configuration and reformat knip configuration file (by @chitrank2050)
- Set fetch-depth to 0 in branch-name workflow to ensure complete history access (by @chitrank2050)
- Organize package.json scripts with category labels and reorder entries (by @chitrank2050)
- Update actions/upload-artifact action to v4.6.2 ([#74](https://github.com/chitrank2050/meterplex/issues/74)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update dependency python to 3.14 ([#21](https://github.com/chitrank2050/meterplex/issues/21)) (by [renovate[bot]](https://github.com/apps/renovate))
- Apply principle of least privilege by scoping workflow permissions to specific jobs (by @chitrank2050)
- Update project metadata and add relevant keywords to package.json (by @chitrank2050)
- Update actions/stale action to v9.1.0 ([#81](https://github.com/chitrank2050/meterplex/issues/81)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update actions/cache action to v4.3.0 ([#80](https://github.com/chitrank2050/meterplex/issues/80)) (by [renovate[bot]](https://github.com/apps/renovate))
- Upgrade actions/create-github-app-token to v3.1.1 (by @chitrank2050)
- Update github app token credentials to use specific bot account secrets (by @chitrank2050)
- Include .github/actions directory in area/ci labeler configuration (by @chitrank2050)
- Remove redundant path filter from workflow linting action (by @chitrank2050)
- Update dependency knip to v6.7.0 ([#87](https://github.com/chitrank2050/meterplex/issues/87)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update node engine requirement to >=24.0.0 and sync README versions (by @chitrank2050)
- Configure git-cliff to ignore merge commits and redundant changelog updates (by @chitrank2050)
- Update build provenance attestation to target CHANGELOG.md instead of repository sha (by @chitrank2050)
- Enable GitHub authentication for git-cliff to resolve commit author usernames (by @chitrank2050)

### 🐛 Bug Fixes

- Broaden CI success criteria and relax Renovate actor validation in auto-approve workflow (by @chitrank2050)
- Add fallback logic to retrieve actor, branch, and PR number in auto-approve workflow (by @chitrank2050)
- Explicitly pass repository to gh cmd to ensure correct context resolution in auto-approve (by @chitrank2050)
- Update check logic in auto-approve flow to correctly filter by completion status & conclusion (by @chitrank2050)
- Remove auto flag from renovate pr merge command to prevent workflow errors (by @chitrank2050)
- Update git-cliff args to use HEAD and skip metadata fetch to resolve PR 404 errors (by @chitrank2050)

### 👷 Continuous Integration

- Add OpenSSF Scorecard workflow and update README documentation (by @chitrank2050)
- Workflow for automated PR and renovate auto approval ([#78](https://github.com/chitrank2050/meterplex/issues/78)) (by @chitrank2050)
- Add automated labeler and stale issue management workflows and update project documentation (by @chitrank2050)
- Add prisma schema validation and comment out experimental knip analysis in CI workflow (by @chitrank2050)
- Parallelize linting, formatting, and security audit tasks in the CI workflow (by @chitrank2050)
- Optimize Prisma caching in workflows, remove redundant pnpm & enforce zero warnings in TS lint (by @chitrank2050)
- Disable PR template autofill for releases, docs in CI change detection & release PR body content (by @chitrank2050)

### 📚 Documentation

- Add documentation for CI/CD infrastructure and automated maintenance workflows (by @chitrank2050)
- Add build provenance and production environment access control sections to CI/CD guide (by @chitrank2050)
- Update CI/CD documentation with performance optimizations and improved governance policies (by @chitrank2050)
- Update infrastructure principles and add documentation for Knip zombie code detection (by @chitrank2050)
- Update security policy & repo doc with current version sup & vulnerability report guidelines (by @chitrank2050)
- Update project documentation in README.md (by @chitrank2050)
- Update minimum Node.js version requirement to 24.0.0 in README and setup documentation (by @chitrank2050)

### 🚀 Features

- Add required permissions and build provenance attestation to release workflow (by @chitrank2050)
- Implement branch name validation workflow and configuration (by @chitrank2050)
- Implement smart auto-approval workflow for non-major Renovate deps updates and update doc (by @chitrank2050)
- Add security tool checks to installation script and expand obliviate cleanup scope (by @chitrank2050)
- Add Kafdrop Kafka UI and configure resource limits for infrastructure services (by @chitrank2050)
- Add automatic env configuration to install script & streamlined setup cmd in package.json (by @chitrank2050)
- Implement centralized shell logging utility and standardize developer CLI scripts (by @chitrank2050)
- Introduce interactive setup wizard with task selection and script execution automation (by @chitrank2050)
- Rename setup to dev:init, enhance wizard with knip & streamline infra orchestration doc (by @chitrank2050)
- Update Kafka volumes and refine Postgres health checks and migration commands in setup scripts (by @chitrank2050)
- Add Code of Conduct to docs, include transient files in CI, and configure Google Analytics (by @chitrank2050)
- Upgrade auto-approval workflow to use dedicated GitHub App token for enhanced permissions (by @chitrank2050)
- Workflow-generated pull requests to chitrank2050 across maintenance and release automation (by @chitrank2050)
- Add maintenance branch type, update labeling and CI logic, and doc automation standards (by @chitrank2050)
- Automated zero-noise PR descriptions using git-cliff and prune PR template boilerplate (by @chitrank2050)
- Add reopened trigger and workflow_dispatch to PR autofill action (by @chitrank2050)
- Skip PR autofill for release-labeled pull requests to preserve existing descriptions (by @chitrank2050)

### 🚜 Refactoring

- Migrate auto-approve workflow to triggered-by-workflow_run with verification logic (by @chitrank2050)
- Split linting jobs and add Prisma caching to CI while cleaning up auto-approve trigger (by @chitrank2050)
- Simplify branch validation logic by removing redundant steps and using regex  eval (by @chitrank2050)
- Centralized setup-bot action & update flows to use GH App tokens instead of GITHUB_TOKEN (by @chitrank2050)
- Refactor repo checkout order and adopt manual git authentication in CI workflows (by @chitrank2050)
- Rename to auto-approve instead of merging (by @chitrank2050)
- Consolidate linting and security audit jobs to reduce CI runner overhead (by @chitrank2050)
- Decouple release workflow into separate prepare and release stages with manual approval (by @chitrank2050)
- Move release PR check to job conditions & update auto-approve workflow to use GITHUB_TOKEN (by @chitrank2050)

## [0.5.4] - 2026-04-25


### ⚙️ Maintenance

- Update linting pipeline to run TypeScript and Markdown checks and disable Knip (by @chitrank2050)
- Add pnpm installation step to git-release workflow (by @chitrank2050)
- Update changelog generation to use git-cliff output directly instead of CLI command (by @chitrank2050)
- Enforce Node 24 for GitHub Actions in release and CI workflows (by @chitrank2050)
- Streamline changelog generation using git-cliff-action and clean up temporary files (by @chitrank2050)
- Pin GitHub Actions to specific commit hashes for security (by @chitrank2050)
- Update GitHub Actions dependencies to latest versions (by @chitrank2050)
- Disable persist-credentials in all GitHub Actions checkout steps (by @chitrank2050)
- Pass git-cliff output to gh release via environment variable (by @chitrank2050)
- Update orhun/git-cliff-action action to v4.7.1 ([#71](https://github.com/chitrank2050/meterplex/issues/71)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update dependency knip to v6.6.3 ([#69](https://github.com/chitrank2050/meterplex/issues/69)) (by [renovate[bot]](https://github.com/apps/renovate))

### 🏗️ Build

- Bump the all-actions group across 1 directory with 3 updates ([#72](https://github.com/chitrank2050/meterplex/issues/72)) (by [dependabot[bot]](https://github.com/apps/dependabot))

### 📚 Documentation

- Add zizmor installation guide and security audit documentation (by @chitrank2050)

### 🚀 Features

- Add workflow_dispatch support to trigger releases with custom tags (by @chitrank2050)
- Add zizmor linting for GitHub Actions to project scripts and lefthook configuration (by @chitrank2050)

### 🚜 Refactoring

- Update release workflow to generate changelog via automated PR instead of direct commit (by @chitrank2050)
- Replace action-gh-release with GitHub CLI for release creation (by @chitrank2050)

## [0.5.3] - 2026-04-24


### ⚙️ Maintenance

- Automate CHANGELOG.md updates in release workflow and document maintenance changes (by @chitrank2050)

### 📚 Documentation

- Add developer workflow and automated maintenance sections to documentation (by @chitrank2050)

### 🚀 Features

- Modernize documentation theme with custom CSS and enhanced MkDocs Material configuration (by @chitrank2050)

## [0.5.2] - 2026-04-24


### ⚙️ Maintenance

- Update lockfile dependencies (by @chitrank2050)
- Downgrade pnpm/action-setup to version 5 (by @chitrank2050)
- Update dependency @swc/core to v1.15.30 ([#57](https://github.com/chitrank2050/meterplex/issues/57)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update redis docker tag to v8 ([#56](https://github.com/chitrank2050/meterplex/issues/56)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update linting & formatting ([#16](https://github.com/chitrank2050/meterplex/issues/16)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update pg dependency position and upgrade markdownlint-cli to v0.48.0 (by @chitrank2050)
- Update markdown tables to use consistent left-aligned formatting (by @chitrank2050)
- Upgrade PostgreSQL to 18, Kafka to 4.2, and Redis to 8 across infrastructure and doc (by @chitrank2050)
- Update dependencies and add deps:update script (by @chitrank2050)
- Update workflow trigger paths and replace husky with lefthook configuration (by @chitrank2050)
- Prune pnpm dependency overrides and add automated maintenance workflow for cleanup (by @chitrank2050)
- Update lefthook configuration for improved pre-commit workflow (by @chitrank2050)
- Update lefthook configuration to optimize pre-commit hook execution (by @chitrank2050)
- Update git-cliff configuration with emojis and additional commit categories (by @chitrank2050)
- Update OSV-Scanner version to v2.3.5 in CI and maintenance workflows (by @chitrank2050)
- Enhance CI/CD workflow documentation and standardize naming with icons (by @chitrank2050)
- Improve workflow maintainability with descriptive comments and updated ignore patterns (by @chitrank2050)

### 🐛 Bug Fixes

- Update dependency uuid to v14 ([#58](https://github.com/chitrank2050/meterplex/issues/58)) (by [renovate[bot]](https://github.com/apps/renovate))

### 👷 Continuous Integration

- Replace OSV-Scanner action with direct binary execution in CI and maintenance workflows (by @chitrank2050)
- Add zizmor workflow for security analysis of GitHub Actions (by @chitrank2050)
- Add semantic pull request title validation workflow (by @chitrank2050)

### 📚 Documentation

- Enhance README with badges and disable automatic documentation deploy workflow (by @chitrank2050)
- Replace em-dashes with hyphens in setup guide and cleanup lefthook configuration (by @chitrank2050)

### 🚜 Refactoring

- Replace Husky and lint-staged with Lefthook for git hook management (by @chitrank2050)

## [0.5.1] - 2026-04-16


### ⚙️ Maintenance

- Update apache/kafka docker tag to v4 ([#23](https://github.com/chitrank2050/meterplex/issues/23)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update pnpm to v9.15.9 ([#22](https://github.com/chitrank2050/meterplex/issues/22)) (by [renovate[bot]](https://github.com/apps/renovate))
- Upgrade pnpm/action-setup to v6 and update lockfile (by @chitrank2050)

### 🏗️ Build

- Bump globals from 16.5.0 to 17.5.0 ([#40](https://github.com/chitrank2050/meterplex/issues/40)) (by [dependabot[bot]](https://github.com/apps/dependabot))

### 🚀 Features

- Schema for usage events, outbox, aggregates, and dead letter queue (by @chitrank2050)

## [0.5.0] - 2026-04-16


### ⚙️ Maintenance

- Add Bruno collection for all Phase 2 endpoints (by @chitrank2050)
- Update linting & formatting ([#26](https://github.com/chitrank2050/meterplex/issues/26)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update postgres docker tag to v18 ([#29](https://github.com/chitrank2050/meterplex/issues/29)) (by [renovate[bot]](https://github.com/apps/renovate))
- Update dependencies in pnpm-lock.yaml (by @chitrank2050)

### 🚀 Features

- Implement entitlement module DTOs and update eslint ignore configuration (by @chitrank2050)
- Implement entitlements module to manage plan-feature mappings and access rules (by @chitrank2050)
- Implement subscription module DTOs for creation and response handling (by @chitrank2050)
- Implement Subscriptions module with CRUD operations and tenant-scoped subscription management (by @chitrank2050)
- Implement EntitlementCheckModule for runtime feature gating and usage consumption (by @chitrank2050)
- Seed database with subscription plans, pricing, features, and entitlements (by @chitrank2050)
- Implement plans, features, entitlements, and subscription management system (by @chitrank2050)

## [0.4.5] - 2026-04-12


### ⚙️ Maintenance

- Update issue template titles to follow conventional commit (by @chitrank2050)

### 📚 Documentation

- Update project documentation in README.md (by @chitrank2050)

### 🚀 Features

- Implement DTOs for feature management module (by @chitrank2050)
- Implement features module with CRUD operations for the global feature catalog (by @chitrank2050)
- Add DTOs for plan price creation and response schemas (by @chitrank2050)
- Implement plan pricing module with CRUD operations and nested routing (by @chitrank2050)
- Add documentation and task issue templates and set default assignees for all templates (by @chitrank2050)

### 🚜 Refactoring

- Replace hardcoded enum strings with Prisma generated enums across all DTOs (by @chitrank2050)
- Replace hardcoded string enums with Prisma generated enum types across services (by @chitrank2050)

## [0.4.3] - 2026-04-12


### ⚙️ Maintenance

- Migrate dependency management from Dependabot to Renovate (by @chitrank2050)
- Update pnpm-lock.yaml dependencies (by @chitrank2050)
- Standardize markdown code blocks, update linting configuration, and improve docs formatting (by @chitrank2050)
- Reformat renovate config, add experimental path ignore rules, and disable vulnerability alert (by @chitrank2050)
- Replace em-dashes with hyphens and update import to type-only in logger configuration (by @chitrank2050)
- Update dependencies, configure pnpm settings, and enforce non-null database URL type (by @chitrank2050)
- Add format:check script and update CI workflow to use Node 24 (by @chitrank2050)
- Reformat renovate configuration and disable Prisma client generation in CI workflow (by @chitrank2050)
- Update lockfile dependencies (by @chitrank2050)
- Update @hono/node-server and add glob dependency to package.json (by @chitrank2050)
- Move pg dependency from devDependencies to dependencies (by @chitrank2050)
- Move pg dependency from devDependencies to dependencies (by @chitrank2050)

### 📚 Documentation

- Update project documentation in README.md (by @chitrank2050)
- Update project documentation in README.md (by @chitrank2050)
- Update project documentation and installation instructions in README (by @chitrank2050)
- Update project documentation in README.md (by @chitrank2050)
- Update project documentation in README.md (by @chitrank2050)

### 🚀 Features

- Add docker:prune script and include project banner assets (by @chitrank2050)
- Implement Winston logging, configure import sorting, and standardize database script (by @chitrank2050)
- Add markdownlint configuration and integrate linting into CI and pre-commit hooks (by @chitrank2050)
- Add weekly schedule to renovate configuration (by @chitrank2050)
- Enable Prisma client generation in CI pipeline (by @chitrank2050)
- Implement DTOs for plan creation, updates, and API responses (by @chitrank2050)
- Implement PlansService and expand Prisma error utility helpers for robust db constraint handle (by @chitrank2050)
- Migrate NestJS build and test compilation to SWC for improved performance (by @chitrank2050)
- Implement plans module with CRUD endpoints for billing plan management (by @chitrank2050)
- Add API documentation and Bruno collections for plans, auth, users, tenants, and API keys (by @chitrank2050)

### 🚜 Refactoring

- Standardize import ordering and formatting across the codebase (by @chitrank2050)
- Rename prisma CLI scripts to db prefix across codebase and documentation (by @chitrank2050)
- Reformat renovate configuration and update experimental path pattern (by @chitrank2050)
- Centralize correlation ID header constant and exclude health checks from request logging (by @chitrank2050)
- Simplify environment variable usage (by @chitrank2050)
- Replace manual existence checks with Prisma findUniqueOrThrow and error handling utilities (by @chitrank2050)
- Migrate test runner from Jest to Vitest (by @chitrank2050)
- Reorder color scheme definitions in mkdocs.yml to set dark mode as default (by @chitrank2050)
- Migrate Prisma client generation to node_modules and update import paths (by @chitrank2050)

## [0.4.2] - 2026-04-10


### 📚 Documentation

- Update README and add CODEOWNERS file to define repository ownership (by @chitrank2050)

## [0.4.1] - 2026-04-10


### ⚙️ Maintenance

- Update project metadata, simplify license terms, and add branding assets (by @chitrank2050)
- Update package metadata and keywords for better project discoverability (by @chitrank2050)

### 🎨 Styling

- Replace em-dashes with hyphens in documentation and DTO comments (by @chitrank2050)

### 🏗️ Build

- Bump @types/supertest from 6.0.3 to 7.2.0 ([#10](https://github.com/chitrank2050/meterplex/issues/10)) (by [dependabot[bot]](https://github.com/apps/dependabot))

### 📚 Documentation

- Add audit log architecture documentation and standardize code comments (by @chitrank2050)

### 🚀 Features

- Add AuditLog model and supporting enums to track system mutations (by @chitrank2050)
- Implement global audit log interceptor with skip decorator for mutation tracking (by @chitrank2050)
- Implement global audit log interceptor with SkipAudit decorator support (by @chitrank2050)
- Add audit log interceptor documentation and phase 1 summary updates (by @chitrank2050)
- Implement plans, features, and entitlements schema with supporting documentation (by @chitrank2050)
- Add support for plans, features, entitlements, and subscriptions to audit log resource mapping (by @chitrank2050)

## [0.4.0] - 2026-04-09


### 📚 Documentation

- Update project roadmap and document API authentication and endpoints (by @chitrank2050)

### 🚀 Features

- Add Bruno API collection files for authentication endpoints (by @chitrank2050)
- Add Bruno API requests for retrieving and updating tenants (by @chitrank2050)
- Add Bruno API collections for tenant context and user management endpoints (by @chitrank2050)
- Add Bruno API collections for creating, listing, and revoking API keys (by @chitrank2050)

## [0.3.5] - 2026-04-09


### 🚜 Refactoring

- Implement robust Prisma unique constraint error handling with dedicated utility (by @chitrank2050)

## [0.3.4] - 2026-04-09


### ⚙️ Maintenance

- Centralize prettier endOfLine configuration in .prettierrc and remove from eslint config (by @chitrank2050)
- Update dependencies in pnpm-lock.yaml (by @chitrank2050)

### 🏗️ Build

- Bump @types/node from 22.19.15 to 25.5.2 ([#9](https://github.com/chitrank2050/meterplex/issues/9)) (by [dependabot[bot]](https://github.com/apps/dependabot))
- Bump actions/setup-python in the all-actions group ([#3](https://github.com/chitrank2050/meterplex/issues/3)) (by [dependabot[bot]](https://github.com/apps/dependabot))
- Bump dotenv in the patch-and-minor group ([#8](https://github.com/chitrank2050/meterplex/issues/8)) (by [dependabot[bot]](https://github.com/apps/dependabot))
- Bump @types/uuid from 10.0.0 to 11.0.0 ([#11](https://github.com/chitrank2050/meterplex/issues/11)) (by [dependabot[bot]](https://github.com/apps/dependabot))

### 🚀 Features

- Add lodash dependency to package.json (by @chitrank2050)
- Add standard pagination and error response DTOs for API consistency (by @chitrank2050)
- Add TenantResponseDtos for API documentation (by @chitrank2050)
- Add UserResponseDto for standardized user API responses (by @chitrank2050)
- Add IsNotEmpty validation to password and refactor Auth API status codes to use enums (by @chitrank2050)
- Add installation and cleanup automation scripts with corresponding npm lifecycle commands (by @chitrank2050)
- Implement response DTOs for auth and api-keys modules (by @chitrank2050)
- Implement DTO factory methods and update tenant module to return typed responses (by @chitrank2050)
- Add Swagger response DTOs and error schemas to Auth and Users controllers (by @chitrank2050)

### 🚜 Refactoring

- Optimize membership lookup, update Swagger path, fix Prisma import, and standardize logger (by @chitrank2050)
- Centralize authentication error messages in constants and update auth service to use them (by @chitrank2050)
- Migrate to eslint-config-prettier and update configuration structure (by @chitrank2050)
- Standardize documentation by replacing em-dashes with hyphens across the codebase (by @chitrank2050)
- Add ErrorResponseDto to Swagger API response decorators in tenants controller (by @chitrank2050)
- Implement DTO factory methods for API key and tenant responses to decouple service layer (by @chitrank2050)
- Remove static DTO factory methods to rely on direct service return types for serialization (by @chitrank2050)

## [0.3.3] - 2026-04-04


### 📚 Documentation

- Add Phase 1 documentation (by @chitrank2050)
- Add summary of completed Phase 1 features to documentation (by @chitrank2050)

### 🚀 Features

- Add API keys module with Stripe-style key generation, hashing, and revocation (by @chitrank2050)
- Update seed script with users, memberships, and API keys across tenants (by @chitrank2050)

## [0.3.2] - 2026-04-04


### ⚙️ Maintenance

- Add Bruno collection with auto-login and environment variables (by @chitrank2050)

### 🚀 Features

- Add custom decorators for CurrentUser, Roles, and TenantId extraction (by @chitrank2050)
- Implement TenantGuard and RolesGuard for multi-tenant RBAC enforcement (by @chitrank2050)
- Add protected endpoint to retrieve authenticated tenant context with guard validation (by @chitrank2050)
- Add guards to tenants and users controllers, RBAC enforcement, tenant-scoped user creation (by @chitrank2050)

## [0.3.1] - 2026-04-04


### 🏗️ Build

- Bump the patch-and-minor group across 1 directory with 12 updates (by [dependabot[bot]](https://github.com/apps/dependabot))

### 🚀 Features

- Add DTOs for token refresh and password management flows (by @chitrank2050)
- Implement full authentication lifecycle including refresh tokens, password management (by @chitrank2050)
- Add complete auth flow with dual JWT tokens, password reset, and token rotation (by @chitrank2050)

## [0.3.0] - 2026-04-04


### ⚙️ Maintenance

- Add project governance, security policy, and contribution templates (by @chitrank2050)
- Rename commit-lint (by @chitrank2050)
- Update pnpm overrides for hono, path-to-regexp, and picomatch (by @chitrank2050)

### 🎨 Styling

- Standardize configuration files by converting double quotes to single quotes (by @chitrank2050)

### 🏗️ Build

- Bump picomatch in the npm_and_yarn group across 1 directory (by [dependabot[bot]](https://github.com/apps/dependabot))
- Bump brace-expansion (by [dependabot[bot]](https://github.com/apps/dependabot))

### 🐛 Bug Fixes

- Patch handlebars transitive dependency (CVE injection via AST) (by @chitrank2050)
- Patch hono transitive dependency (static file access bypass) (by @chitrank2050)
- Patch effect transitive dependency (ALS context leak) (by @chitrank2050)
- Patch @hono/node-server transitive dependency (static path bypass) (by @chitrank2050)

### 👷 Continuous Integration

- Refactor CI pipeline, update dependencies, and upgrade Python and Node.js versions (by @chitrank2050)

### 📚 Documentation

- Update project documentation in README.md (by @chitrank2050)
- Add phase 1 ERD and placeholder docs (by @chitrank2050)

### 🚀 Features

- Add User, Membership, and ApiKey models to Prisma schema (by @chitrank2050)
- Add CreateTenantDto and UpdateTenantDto for tenant management validation (by @chitrank2050)
- Implement TenantsService and update DTO metadata types with path aliases (by @chitrank2050)
- Add centralized error message constants for consistent application-wide error handling (by @chitrank2050)
- Add tenants CRUD module with pagination and validation (by @chitrank2050)
- Add bcryptjs dependency and implement user creation and update DTOs (by @chitrank2050)
- Implement UsersModule with CRUD operations and bcrypt password hashing (by @chitrank2050)
- Add JWT authentication support and environment configuration (by @chitrank2050)
- Implement AuthModule with JWT authentication and user registration flow (by @chitrank2050)
- Add PasswordResetToken model and database migration for secure password resets (by @chitrank2050)

### 🚜 Refactoring

- Replace hardcoded tenant error messages with centralized constants (by @chitrank2050)

## [0.2.1] - 2026-03-29


### ⚙️ Maintenance

- Remove explicit pnpm version specification from CI workflows (by @chitrank2050)
- Update contents permission to write in docs workflow (by @chitrank2050)
- Update docs workflow to include changelog tracking, git configuration, and dependency caching (by @chitrank2050)
- Remove pip cache from docs workflow and delete unused e2e test file (by @chitrank2050)
- Restrict prettier check to src directory in CI workflow (by @chitrank2050)

### 📚 Documentation

- Add phase 0 architecture diagram to documentation (by @chitrank2050)

### 🚀 Features

- Add git-tag and git-release npm scripts (by @chitrank2050)
- Replace Swagger UI with Scalar API reference and update CSP configuration (by @chitrank2050)

### 🚜 Refactoring

- Restrict prettier formatting scope to src directory in package.json (by @chitrank2050)

## [0.2.0] - 2026-03-29


### ⚙️ Maintenance

- Upgrade to Prisma 7 with driver adapter and CJS module configuration (by @chitrank2050)
- Add MIT license and update project documentation (by @chitrank2050)
- Implement husky git hooks, commitlint, and project documentation with MkDocs (by @chitrank2050)
- Setup CI/CD pipelines, Dependabot, funding, and update project documentation (by @chitrank2050)
- Add read permissions to CI workflow for contents access (by @chitrank2050)

### ⚙️ Miscellaneous Tasks

- Initialize NestJS project with basic application structure, configurations, and testing setup. (by @chitrank2050)

### 🎨 Styling

- Format prisma schema generator block and add newline to app module. (by @chitrank2050)

### 🐛 Bug Fixes

- Update middleware route pattern to include wildcard path parameter (by @chitrank2050)

### 📚 Documentation

- Initialize project documentation including development setup, architecture overview, and phase logs (by @chitrank2050)

### 🚀 Features

- Initialize project with Prisma ORM, remove NestJS boilerplate, and configure core tooling and metadata. (by @chitrank2050)
- Set up local development environment with Docker Compose for core services and configure Prisma 7 database connection via `prisma.config.ts`. (by @chitrank2050)
- Implement robust environment variable validation and comprehensive global application bootstrapping with security, CORS, API versioning, and Swagger. (by @chitrank2050)
- Implement global PrismaModule and PrismaService for lifecycle-managed database connectivity (by @chitrank2050)
- Implement health check endpoint with Prisma connectivity monitoring and add Bruno API collection (by @chitrank2050)
- Modularize health check service and configure version-neutral endpoint (by @chitrank2050)
- Implement global exception filter and request tracing middleware for consistent error handling and logging (by @chitrank2050)
- Implement Tenant model with initial migration and database seeding script (by @chitrank2050)
- Add git-cliff configuration and release automation scripts with version bump to 0.2.0 (by @chitrank2050)
- Copy root CHANGELOG.md to docs directory during CI build for MkDocs inclusion (by @chitrank2050)


