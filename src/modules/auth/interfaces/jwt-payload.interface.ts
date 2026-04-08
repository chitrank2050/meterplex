/**
 * JwtPayload - The data encoded inside every JWT token.
 *
 * When a user logs in, we sign this payload into a JWT.
 * When a request comes in with a JWT, Passport extracts and
 * verifies this payload, then attaches it to request.user.
 *
 * Keep the payload small - it's sent on EVERY request in the
 * Authorization header. Don't put large objects here.
 *
 * Standard JWT claims used:
 *   sub: "subject" - the user's UUID
 *   jti: "JWT ID" - unique token identifier (prevents hash collisions)
 *   iat/exp: added automatically by @nestjs/jwt (issued at, expires at)
 */
export interface JwtPayload {
  /** User UUID - the "subject" of the token. */
  sub: string;

  /** User's email - for display and logging. */
  email: string;

  /**
   * Unique token identifier - 16 bytes of randomness (hex encoded).
   * Ensures every token is unique even when signed at the same second
   * with the same payload. Without this, two tokens with identical
   * sub + email + iat produce the same hash → unique constraint violation.
   */
  jti: string;
}
