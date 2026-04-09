# Changelog

All notable changes to Meterplex API.

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


