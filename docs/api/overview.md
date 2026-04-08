# API Overview

## Base URL

```
http://localhost:3000/api/v1
```

All API endpoints are prefixed with `/api/v1`. The health check is the only exception - it lives at `/health` (no prefix, no version).

## Versioning

URI-based versioning: `/api/v1/tenants`, `/api/v2/tenants`.

When a breaking change is needed, a new version controller is created alongside the existing one. Old versions continue working. This is the same approach used by Stripe, GitHub, and Twilio.

A breaking change is: removing a field, changing a field's type, changing the meaning of a status code, or removing an endpoint. Adding new optional fields is NOT a breaking change.

## Authentication

*(Coming in Phase 1)*

Bearer token via the `Authorization` header:

```
Authorization: Bearer <token>
```

## Error Response Format

Every error from the API has this exact shape:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "correlationId": "13850bd4-08fe-4f22-bd5a-b09e13bc6ec2",
  "timestamp": "2026-03-29T11:43:32.488Z",
  "path": "/api/v1/tenants"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | number | HTTP status code |
| `message` | string or string[] | Human-readable error. Validation errors return an array of messages |
| `error` | string | HTTP status name |
| `correlationId` | string (UUID) | Unique request identifier for log tracing |
| `timestamp` | string (ISO 8601) | When the error occurred |
| `path` | string | The requested URL path |

### Correlation ID

Every request gets a unique `x-correlation-id` header (UUID v4). If the client sends their own, the server respects it. This ID appears in:

- Every error response body
- Every log line on the server
- The `x-correlation-id` response header

Use it when reporting issues: "Request `13850bd4-...` returned a 500." Support can grep logs instantly.

## Validation

Request bodies are validated automatically using `class-validator` decorators on DTOs. Invalid requests get a 400 with specific field-level errors:

```json
{
  "statusCode": 400,
  "message": [
    "name must be a string",
    "slug must be shorter than or equal to 100 characters"
  ],
  "error": "Bad Request",
  "correlationId": "...",
  "timestamp": "...",
  "path": "/api/v1/tenants"
}
```

Extra fields not defined in the DTO are rejected (`forbidNonWhitelisted`). This prevents mass-assignment attacks.

## Health Check

```
GET /health
```

Returns 200 if all dependencies are healthy, 503 if any are down:

```json
{
  "status": "ok",
  "info": {
    "postgres": { "status": "up" }
  },
  "error": {},
  "details": {
    "postgres": { "status": "up" }
  }
}
```

No authentication required. No API prefix. Used by load balancers and Kubernetes probes.