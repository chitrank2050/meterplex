## [0.5.3] - 2026-04-24


### ⚙️ Maintenance

- Automate CHANGELOG.md updates in release workflow and document maintenance changes

### 📚 Documentation

- Add developer workflow and automated maintenance sections to documentation

### 🚀 Features

- Modernize documentation theme with custom CSS and enhanced MkDocs Material configuration


# Changelog

All notable changes to Meterplex API.

## [0.5.2] - 2026-04-24

### ⚙️ Maintenance

- Update lockfile dependencies
- Downgrade pnpm/action-setup to version 5
- Update dependency @swc/core to v1.15.30 (#57)
- Update redis docker tag to v8 (#56)
- Update linting & formatting (#16)
- Update pg dependency position and upgrade markdownlint-cli to v0.48.0
- Update markdown tables to use consistent left-aligned formatting
- Upgrade PostgreSQL to 18, Kafka to 4.2, and Redis to 8 across infrastructure and doc
- Update dependencies and add deps:update script
- Update workflow trigger paths and replace husky with lefthook configuration
- Prune pnpm dependency overrides and add automated maintenance workflow for cleanup
- Update lefthook configuration for improved pre-commit workflow
- Update lefthook configuration to optimize pre-commit hook execution
- Update git-cliff configuration with emojis and additional commit categories
- Update OSV-Scanner version to v2.3.5 in CI and maintenance workflows
- Enhance CI/CD workflow documentation and standardize naming with icons
- Improve workflow maintainability with descriptive comments and updated ignore patterns

### 🐛 Bug Fixes

- Update dependency uuid to v14 (#58)

### 👷 Continuous Integration

- Replace OSV-Scanner action with direct binary execution in CI and maintenance workflows
- Add zizmor workflow for security analysis of GitHub Actions
- Add semantic pull request title validation workflow

### 📚 Documentation

- Enhance README with badges and disable automatic documentation deploy workflow
- Replace em-dashes with hyphens in setup guide and cleanup lefthook configuration

### 🚜 Refactoring

- Replace Husky and lint-staged with Lefthook for git hook management

## [0.5.1] - 2026-04-16

### Build

- Bump globals from 16.5.0 to 17.5.0 (#40)

### Features

- Schema for usage events, outbox, aggregates, and dead letter queue

### Maintenance

- Update apache/kafka docker tag to v4 (#23)
- Update pnpm to v9.15.9 (#22)
- Upgrade pnpm/action-setup to v6 and update lockfile

## [0.5.0] - 2026-04-16

### Features

- Implement entitlement module DTOs and update eslint ignore configuration
- Implement entitlements module to manage plan-feature mappings and access rules
- Implement subscription module DTOs for creation and response handling
- Implement Subscriptions module with CRUD operations and tenant-scoped subscription management
- Implement EntitlementCheckModule for runtime feature gating and usage consumption
- Seed database with subscription plans, pricing, features, and entitlements
- Implement plans, features, entitlements, and subscription management system

### Maintenance

- Add Bruno collection for all Phase 2 endpoints
- Update linting & formatting (#26)
- Update postgres docker tag to v18 (#29)
- Update dependencies in pnpm-lock.yaml

## [0.4.5] - 2026-04-12

### Documentation

- Update project documentation in README.md

### Features

- Implement DTOs for feature management module
- Implement features module with CRUD operations for the global feature catalog
- Add DTOs for plan price creation and response schemas
- Implement plan pricing module with CRUD operations and nested routing
- Add documentation and task issue templates and set default assignees for all templates

### Maintenance

- Update issue template titles to follow conventional commit

### Refactoring

- Replace hardcoded enum strings with Prisma generated enums across all DTOs
- Replace hardcoded string enums with Prisma generated enum types across services

## [0.4.3] - 2026-04-12

### Documentation

- Update project documentation in README.md
- Update project documentation in README.md
- Update project documentation and installation instructions in README
- Update project documentation in README.md
- Update project documentation in README.md

### Features

- Add docker:prune script and include project banner assets
- Implement Winston logging, configure import sorting, and standardize database script
- Add markdownlint configuration and integrate linting into CI and pre-commit hooks
- Add weekly schedule to renovate configuration
- Enable Prisma client generation in CI pipeline
- Implement DTOs for plan creation, updates, and API responses
- Implement PlansService and expand Prisma error utility helpers for robust db constraint handle
- Migrate NestJS build and test compilation to SWC for improved performance
- Implement plans module with CRUD endpoints for billing plan management
- Add API documentation and Bruno collections for plans, auth, users, tenants, and API keys

### Maintenance

- Migrate dependency management from Dependabot to Renovate
- Update pnpm-lock.yaml dependencies
- Standardize markdown code blocks, update linting configuration, and improve docs formatting
- Reformat renovate config, add experimental path ignore rules, and disable vulnerability alert
- Replace em-dashes with hyphens and update import to type-only in logger configuration
- Update dependencies, configure pnpm settings, and enforce non-null database URL type
- Add format:check script and update CI workflow to use Node 24
- Reformat renovate configuration and disable Prisma client generation in CI workflow
- Update lockfile dependencies
- Update @hono/node-server and add glob dependency to package.json
- Move pg dependency from devDependencies to dependencies
- Move pg dependency from devDependencies to dependencies

### Refactoring

- Standardize import ordering and formatting across the codebase
- Rename prisma CLI scripts to db prefix across codebase and documentation
- Reformat renovate configuration and update experimental path pattern
- Centralize correlation ID header constant and exclude health checks from request logging
- Simplify environment variable usage
- Replace manual existence checks with Prisma findUniqueOrThrow and error handling utilities
- Migrate test runner from Jest to Vitest
- Reorder color scheme definitions in mkdocs.yml to set dark mode as default
- Migrate Prisma client generation to node_modules and update import paths

## [0.4.2] - 2026-04-10

### Documentation

- Update README and add CODEOWNERS file to define repository ownership

## [0.4.1] - 2026-04-10

### Build

- Bump @types/supertest from 6.0.3 to 7.2.0 (#10)

### Documentation

- Add audit log architecture documentation and standardize code comments

### Features

- Add AuditLog model and supporting enums to track system mutations
- Implement global audit log interceptor with skip decorator for mutation tracking
- Implement global audit log interceptor with SkipAudit decorator support
- Add audit log interceptor documentation and phase 1 summary updates
- Implement plans, features, and entitlements schema with supporting documentation
- Add support for plans, features, entitlements, and subscriptions to audit log resource mapping

### Maintenance

- Update project metadata, simplify license terms, and add branding assets
- Update package metadata and keywords for better project discoverability

## [0.4.0] - 2026-04-09

### Documentation

- Update project roadmap and document API authentication and endpoints

### Features

- Add Bruno API collection files for authentication endpoints
- Add Bruno API requests for retrieving and updating tenants
- Add Bruno API collections for tenant context and user management endpoints
- Add Bruno API collections for creating, listing, and revoking API keys

## [0.3.5] - 2026-04-09

### Refactoring

- Implement robust Prisma unique constraint error handling with dedicated utility

## [0.3.4] - 2026-04-09

### Build

- Bump @types/node from 22.19.15 to 25.5.2 (#9)
- Bump actions/setup-python in the all-actions group (#3)
- Bump dotenv in the patch-and-minor group (#8)
- Bump @types/uuid from 10.0.0 to 11.0.0 (#11)

### Features

- Add lodash dependency to package.json
- Add standard pagination and error response DTOs for API consistency
- Add TenantResponseDtos for API documentation
- Add UserResponseDto for standardized user API responses
- Add IsNotEmpty validation to password and refactor Auth API status codes to use enums
- Add installation and cleanup automation scripts with corresponding npm lifecycle commands
- Implement response DTOs for auth and api-keys modules
- Implement DTO factory methods and update tenant module to return typed responses
- Add Swagger response DTOs and error schemas to Auth and Users controllers

### Maintenance

- Centralize prettier endOfLine configuration in .prettierrc and remove from eslint config
- Update dependencies in pnpm-lock.yaml

### Refactoring

- Optimize membership lookup, update Swagger path, fix Prisma import, and standardize logger
- Centralize authentication error messages in constants and update auth service to use them
- Migrate to eslint-config-prettier and update configuration structure
- Standardize documentation by replacing em-dashes with hyphens across the codebase
- Add ErrorResponseDto to Swagger API response decorators in tenants controller
- Implement DTO factory methods for API key and tenant responses to decouple service layer
- Remove static DTO factory methods to rely on direct service return types for serialization

## [0.3.3] - 2026-04-04

### Documentation

- Add Phase 1 documentation
- Add summary of completed Phase 1 features to documentation

### Features

- Add API keys module with Stripe-style key generation, hashing, and revocation
- Update seed script with users, memberships, and API keys across tenants

## [0.3.2] - 2026-04-04

### Features

- Add custom decorators for CurrentUser, Roles, and TenantId extraction
- Implement TenantGuard and RolesGuard for multi-tenant RBAC enforcement
- Add protected endpoint to retrieve authenticated tenant context with guard validation
- Add guards to tenants and users controllers, RBAC enforcement, tenant-scoped user creation

### Maintenance

- Add Bruno collection with auto-login and environment variables

## [0.3.1] - 2026-04-04

### Build

- Bump the patch-and-minor group across 1 directory with 12 updates

### Features

- Add DTOs for token refresh and password management flows
- Implement full authentication lifecycle including refresh tokens, password management
- Add complete auth flow with dual JWT tokens, password reset, and token rotation

## [0.3.0] - 2026-04-04

### Bug Fixes

- Patch handlebars transitive dependency (CVE injection via AST)
- Patch hono transitive dependency (static file access bypass)
- Patch effect transitive dependency (ALS context leak)
- Patch @hono/node-server transitive dependency (static path bypass)

### Build

- Bump picomatch in the npm_and_yarn group across 1 directory
- Bump brace-expansion

### Documentation

- Update project documentation in README.md
- Add phase 1 ERD and placeholder docs

### Features

- Add User, Membership, and ApiKey models to Prisma schema
- Add CreateTenantDto and UpdateTenantDto for tenant management validation
- Implement TenantsService and update DTO metadata types with path aliases
- Add centralized error message constants for consistent application-wide error handling
- Add tenants CRUD module with pagination and validation
- Add bcryptjs dependency and implement user creation and update DTOs
- Implement UsersModule with CRUD operations and bcrypt password hashing
- Add JWT authentication support and environment configuration
- Implement AuthModule with JWT authentication and user registration flow
- Add PasswordResetToken model and database migration for secure password resets

### Maintenance

- Add project governance, security policy, and contribution templates
- Rename commit-lint
- Update pnpm overrides for hono, path-to-regexp, and picomatch

### Refactoring

- Replace hardcoded tenant error messages with centralized constants

## [0.2.1] - 2026-03-29

### Documentation

- Add phase 0 architecture diagram to documentation

### Features

- Add git-tag and git-release npm scripts
- Replace Swagger UI with Scalar API reference and update CSP configuration

### Maintenance

- Remove explicit pnpm version specification from CI workflows
- Update contents permission to write in docs workflow
- Update docs workflow to include changelog tracking, git configuration, and dependency caching
- Remove pip cache from docs workflow and delete unused e2e test file
- Restrict prettier check to src directory in CI workflow

### Refactoring

- Restrict prettier formatting scope to src directory in package.json

## [0.2.0] - 2026-03-29

### Bug Fixes

- Update middleware route pattern to include wildcard path parameter

### Documentation

- Initialize project documentation including development setup, architecture overview, and phase logs

### Features

- Initialize project with Prisma ORM, remove NestJS boilerplate, and configure core tooling and metadata.
- Set up local development environment with Docker Compose for core services and configure Prisma 7 database connection via `prisma.config.ts`.
- Implement robust environment variable validation and comprehensive global application bootstrapping with security, CORS, API versioning, and Swagger.
- Implement global PrismaModule and PrismaService for lifecycle-managed database connectivity
- Implement health check endpoint with Prisma connectivity monitoring and add Bruno API collection
- Modularize health check service and configure version-neutral endpoint
- Implement global exception filter and request tracing middleware for consistent error handling and logging
- Implement Tenant model with initial migration and database seeding script
- Add git-cliff configuration and release automation scripts with version bump to 0.2.0
- Copy root CHANGELOG.md to docs directory during CI build for MkDocs inclusion

### Maintenance

- Upgrade to Prisma 7 with driver adapter and CJS module configuration
- Add MIT license and update project documentation
- Implement husky git hooks, commitlint, and project documentation with MkDocs
- Setup CI/CD pipelines, Dependabot, funding, and update project documentation
- Add read permissions to CI workflow for contents access
