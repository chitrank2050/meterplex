# Authentication API

The Auth API handles user onboarding, session management, and security (passwords/tokens).

## Authorization

| Endpoint | Requirement |
| :--- | :--- |
| `POST /register`, `/login`, `/refresh` | Public |
| `POST /forgot-password`, `/reset-password` | Public |
| `GET /me`, `POST /change-password`, `/logout` | Authenticated (JWT) |

---

## Registration & Login

### Register

Creates a new user account, a tenant organization, and an `OWNER` membership in a single atomic transaction.

**Endpoint:** `POST /api/v1/auth/register`

### Login

Validates email and password. Returns a token pair.

**Endpoint:** `POST /api/v1/auth/login`

**Response (Token Pair):**

```json
{
  "accessToken": "ey...",
  "refreshToken": "ey...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

## Token Management

### Refresh Token

Exchanges a valid refresh token for a new set of tokens. This uses **Token Rotation**: the old refresh token is revoked immediately.

**Endpoint:** `POST /api/v1/auth/refresh`

### Logout

Revokes the provided refresh token, ending the session for the current device.

**Endpoint:** `POST /api/v1/auth/logout`

### Logout All

Revokes **all** active refresh tokens for the user across all devices.

**Endpoint:** `POST /api/v1/auth/logout-all` (JWT Required)

---

## Password Management

### Forgot Password

Generates a reset token. In development, the token is returned in the response. In production, it is sent via email.

**Endpoint:** `POST /api/v1/auth/forgot-password`

### Reset Password

Updates the password using a valid reset token. After reset: token is marked used, all sessions are revoked.

**Endpoint:** `POST /api/v1/auth/reset-password`

### Change Password

Updates the password for the currently logged-in user. Requires the current password for confirmation.

**Endpoint:** `POST /api/v1/auth/change-password` (JWT Required)
