# Users API

The Users API handles profile management and the creation of users within specific tenant contexts.

## Authorization

| Endpoint | Requirement |
| :--- | :--- |
| `GET /me`, `GET /:id` | Authenticated (JWT) |
| `POST /`, `PATCH /:id` (others) | Authenticated + Tenant Member |

---

## Profile Management

### Get Current Profile

Returns the profile of the user associated with the provided JWT.

**Endpoint:** `GET /api/v1/users/me`

### Get User by ID

Returns public profile info for any user.

**Endpoint:** `GET /api/v1/users/:id`

### Update Profile

Updates user details. Users can update their own details. Admins can update users within their tenants.

**Endpoint:** `PATCH /api/v1/users/:id`

---

## Tenant User Management

### Create User in Tenant

Creates a new user account (or finds an existing one) and adds it to the target tenant with a specific role.

**Endpoint:** `POST /api/v1/users`

**Headers:**

| Header | Description |
| :--- | :--- |
| `x-tenant-id` | The UUID of the tenant to add the user to. |

**Permissions:**

* Requires `OWNER` or `ADMIN` role in the target tenant.

**Request Body:**

```json
{
  "email": "colleague@company.com",
  "password": "InitialPassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "DEVELOPER"
}
```
