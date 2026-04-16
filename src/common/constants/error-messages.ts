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
    USER_NOT_FOUND: 'User not found',
    INVALID_CURRENT_PASSWORD: 'Invalid current password',
    INVALID_CREDENTIALS: 'Invalid email or password',
    INACTIVE_ACCOUNT: 'Account is disabled',
    TOKEN_EXPIRED: 'Token has expired',
    // Reset Password
    INVALID_RESET_TOKEN: 'Invalid reset token',
    RESET_TOKEN_ALREADY_USED: 'Reset token has already been used',
    RESET_TOKEN_EXPIRED: 'Reset token has expired',
    // Refresh TOken
    TOKEN_INVALID_OR_EXPIRED: 'Invalid or expired refresh token',
    REFRESSH_TOKEN_REVOKED: 'Refresh token has been revoked',
    REFRESH_TOKEN_EXPIRED: 'Refresh token has expired',
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
  /**
   * Generic database error messages
   */
  COMMON: {
    UNIQUE_CONSTRAINT: (field: string) =>
      `A record with this ${field} already exists`,
  },
  /**
   * Plan related error messages
   */
  PLAN: {
    SLUG_EXISTS: (slug: string) => `Plan with slug "${slug}" already exists`,
    NOT_FOUND_ID: (id: string) => `Plan with ID "${id}" not found`,
    NOT_FOUND_SLUG: (slug: string) => `Plan with slug "${slug}" not found`,
  },
  /**
   * Feature related error messages
   */
  FEATURE: {
    LOOKUP_KEY_EXISTS: (lookupKey: string) =>
      `Feature with lookup key "${lookupKey}" already exists`,
    NOT_FOUND_ID: (id: string) => `Feature with ID "${id}" not found`,
    NOT_FOUND_LOOKUP_KEY: (lookupKey: string) =>
      `Feature with lookup key "${lookupKey}" not found`,
  },
  /**
   * Plan price related error messages
   */
  PLAN_PRICE: {
    ALREADY_EXISTS: (planSlug: string, interval: string, currency: string) =>
      `Plan "${planSlug}" already has an active ${interval} price in ${currency}`,
    NOT_FOUND: 'Price not found or does not belong to this plan',
  },
  /**
   * Entitlement related error messages
   */
  ENTITLEMENT: {
    ALREADY_EXISTS: (planSlug: string, featureKey: string) =>
      `Plan "${planSlug}" already has an entitlement for feature "${featureKey}"`,
    NOT_FOUND: 'Entitlement not found or does not belong to this plan',
    PLAN_NOT_ACTIVE: (planSlug: string) =>
      `Plan "${planSlug}" is not active - cannot add entitlements to archived plans`,
    FEATURE_NOT_ACTIVE: (featureKey: string) =>
      `Feature "${featureKey}" is not active - cannot use archived features`,
    INVALID_BOOLEAN_FIELDS:
      'BOOLEAN features only accept "value". Do not set limit, overagePrice, or includedAmount',
    QUOTA_REQUIRES_LIMIT: 'QUOTA features require "limit" and "resetPeriod"',
    INVALID_QUOTA_FIELDS:
      'QUOTA features do not accept "value" or "includedAmount"',
    METERED_REQUIRES_PRICE:
      'METERED features require "overagePrice" and "resetPeriod"',
    INVALID_METERED_FIELDS:
      'METERED features do not accept "value", "limit", or "limitBehavior"',
  },
} as const;
