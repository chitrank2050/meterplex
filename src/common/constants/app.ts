/**
 * Application-wide constants.
 *
 * Why constants?
 *   - Avoid magic strings/numbers across the codebase
 *   - Single source of truth for global configuration (like API versioning)
 *   - Decorators (@Controller) cannot use injected services, so they need
 *     compile-time constants or process.env access.
 */

/** The default API version used if not specified in a controller */
export const API_VERSION = process.env.API_VERSION ?? '1';

/** Global API prefix (e.g., /api) */
export const API_PREFIX = process.env.API_PREFIX ?? 'api';
