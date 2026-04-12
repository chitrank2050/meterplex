# Plans API

The Plans API allows you to manage the billing catalog. Plans define the identity of your products (e.g., "Starter", "Pro", "Enterprise").

!!! info "Global Resources"
    Unlike Users and Tenants, Plans are **Global** resources. They do not belong to a specific tenant and are visible platform-wide.

## Authorization

| Endpoint | Requirement |
| :--- | :--- |
| `GET` (Fetch/List) | Public / No Auth |
| `POST` / `PATCH` | Authenticated (JWT) |

---

## List Plans

Returns a list of all active billing plans, sorted by `displayOrder`.

**Endpoint:** `GET /api/v1/plans`

### Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `includeArchived` | boolean | `false` | If true, returns plans with `ARCHIVED` status. |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Pro",
      "slug": "pro",
      "description": "For scaling startups",
      "status": "ACTIVE",
      "isPublic": true,
      "displayOrder": 2,
      "metadata": {},
      "prices": [
        {
          "id": "price-uuid",
          "interval": "MONTHLY",
          "amount": 9900,
          "currency": "usd",
          "isActive": true
        }
      ]
    }
  ]
}
```

---

## Get Plan by ID

Returns full details for a specific plan.

**Endpoint:** `GET /api/v1/plans/:id`

---

## Get Plan by Slug

Returns plan details using its URL-safe identifier.

**Endpoint:** `GET /api/v1/plans/slug/:slug`

---

## Create Plan

Creates a new billing plan.

**Endpoint:** `POST /api/v1/plans`

### Create Plan Request Body

```json
{
  "name": "Starter",
  "slug": "starter",
  "description": "Perfect for micro-projects",
  "isPublic": true
}
```

---

## Update Plan

Updates an existing plan. Note that the `slug` is immutable and cannot be changed after creation.

**Endpoint:** `PATCH /api/v1/plans/:id`

### Update Plan Request Body

```json
{
  "name": "Updated Name",
  "status": "ARCHIVED"
}
```
