# API Keys

API Keys allow for server-to-server authentication. They are scoped to a specific tenant and provide programmatic access to the platform.

## Security Pattern

Meterplex uses the industry-standard "Hash & Prefix" pattern (used by Stripe and AWS):

- **Prefix**: The first 7 characters (e.g., `mp_live_`) are stored in plain text for identification.
- **Hash**: We store only the SHA-256 hash of the full key.
- **One-Time Visibility**: The raw key is returned **exactly once** upon creation. It is never stored in our database.

---

## Manage Keys

### Create API Key

Creates a new key for the specified tenant.

**Endpoint:** `POST /api/v1/api-keys`  
**Required Header:** `x-tenant-id`  
**Required Role:** `OWNER` or `ADMIN`

**Response:**

```json
{
  "key": "mp_live_abc123...",
  "id": "uuid",
  "name": "Production Server",
  ...
}
```

### List My Keys

Returns all API keys for the provided tenant.

**Endpoint:** `GET /api/v1/api-keys`  
**Required Header:** `x-tenant-id`

### Revoke API Key

Permanently disables an API key. Once revoked, a key cannot be re-activated.

**Endpoint:** `DELETE /api/v1/api-keys/:id`  
**Required Header:** `x-tenant-id`  
**Required Role:** `OWNER` or `ADMIN`
