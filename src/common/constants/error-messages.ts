/**
 * Centralized error messages used across the application.
 *
 * Why centralize?
 *   - Frontend can match on error codes programmatically
 *   - Consistent wording across all modules
 *   - Easy to find and update all error messages in one place
 *   - Enables i18n (internationalization) later if needed
 *
 * Convention:
 *   - Group by module (TENANT, USER, AUTH, API_KEY)
 *   - Use functions for messages that include dynamic values
 *   - Keep messages user-friendly, not developer-internal
 */
export const ERRORS = {
  /**
   * Tenant related error messages
   */
  TENANT: {
    SLUG_EXISTS: (slug: string) => `Tenant with slug "${slug}" already exists`,
    NOT_FOUND_ID: (id: string) => `Tenant with ID "${id}" not found`,
    NOT_FOUND_SLUG: (slug: string) => `Tenant with slug "${slug}" not found`,
  },
  /**
   * User related error messages
   */
  USER: {
    EMAIL_EXISTS: (email: string) =>
      `User with email "${email}" already exists`,
    NOT_FOUND: (id: string) => `User with ID "${id}" not found`,
  },
  /**
   * Authentication related error messages
   */
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    INACTIVE_ACCOUNT: 'Account is disabled',
    TOKEN_EXPIRED: 'Token has expired',
  },
  /**
   * API key related error messages
   */
  API_KEY: {
    NOT_FOUND: 'API key not found or revoked',
    EXPIRED: 'API key has expired',
  },
  /**
   * Membership related error messages
   */
  MEMBERSHIP: {
    ALREADY_EXISTS: (email: string, slug: string) =>
      `User "${email}" is already a member of tenant "${slug}"`,
    NOT_FOUND: 'Membership not found',
    CANNOT_REMOVE_OWNER: 'Cannot remove the owner from a tenant',
  },
} as const;
