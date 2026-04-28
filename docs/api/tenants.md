# Tenants API

The Tenants API manages organization lifecycle, memberships, and billing settings.

## Authorization Levels

| Endpoint                 | Requirement                             |
| :----------------------- | :-------------------------------------- |
| `POST /`, `GET /`        | Authenticated (JWT)                     |
| `GET /:id`, `PATCH /:id` | JWT + Tenant Membership (`x-tenant-id`) |
| `DELETE /:id`            | JWT + `OWNER` Role                      |

---

## Organization Management

### Create Tenant

Creates a new organization. The creator is automatically assigned the `OWNER` role.

**Endpoint:** `POST /api/v1/tenants`

### List My Tenants

Returns a paginated list of all organizations the current user is a member of.

**Endpoint:** `GET /api/v1/tenants`

### Update Tenant

Updates organization settings, such as name or metadata.

**Endpoint:** `PATCH /api/v1/tenants/:id`

**Required Header:** `x-tenant-id`  
**Required Role:** `OWNER` or `ADMIN`

### Cancel Tenant (Soft Delete)

Sets the tenant status to `CANCELLED`. This is a destructive action that freezes all API keys and subscriptions.

**Endpoint:** `DELETE /api/v1/tenants/:id`

**Required Header:** `x-tenant-id`  
**Required Role:** `OWNER`

---

## Discovery

### Check Slug Availability

Finds a tenant by its slug. This is often used by frontends to check for available names or resolve custom domains.

**Endpoint:** `GET /api/v1/tenants/slug/:slug` (Authenticated)
