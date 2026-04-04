/**
 * JwtPayload — The data encoded inside every JWT token.
 *
 * When a user logs in, we sign this payload into a JWT.
 * When a request comes in with a JWT, Passport extracts and
 * verifies this payload, then attaches it to request.user.
 *
 * Keep the payload small — it's sent on EVERY request in the
 * Authorization header. Don't put large objects here.
 *
 * sub: JWT standard claim for "subject" (the user ID)
 * email: for convenience in logs and error messages
 * iat/exp: added automatically by @nestjs/jwt (issued at, expires at)
 */
export interface JwtPayload {
  /** User UUID — the "subject" of the token */
  sub: string;

  /** User's email — for display and logging */
  email: string;
}
