/**
 * Prisma error utilities.
 *
 * Prisma throws specific error codes for database constraint violations.
 * These helpers provide type-safe detection without importing Prisma
 * internals into every service file.
 *
 * Common Prisma error codes we handle:
 *   P2002 — Unique constraint violation (duplicate slug, email, etc.)
 *   P2003 — Foreign key constraint violation (referencing non-existent record)
 *   P2025 — Record not found (update/delete on non-existent row)
 *   P2014 — Required relation violation (deleting a record that others depend on)
 *   P2024 — Timed out waiting for database connection (pool exhausted)
 *
 * Error codes reference: https://www.prisma.io/docs/orm/reference/error-reference
 */
import { Prisma } from '@generated/prisma/client';

// =============================================================
// Type Guards — Detect specific Prisma error types
// =============================================================

/**
 * Check if an error is a Prisma known request error.
 * Base check — use the specific helpers below for individual codes.
 *
 * @param error - The caught error
 * @returns true if this is a PrismaClientKnownRequestError
 */
export function isPrismaError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

/**
 * Check if an error is a Prisma unique constraint violation (P2002).
 *
 * Triggered when a CREATE or UPDATE violates a UNIQUE index/constraint.
 * Example: two concurrent register() calls with the same email.
 *
 * @param error - The caught error
 * @returns true if this is a P2002 unique constraint violation
 */
export function isUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError & { code: 'P2002' } {
  return isPrismaError(error) && error.code === 'P2002';
}

/**
 * Check if an error is a Prisma foreign key constraint violation (P2003).
 *
 * Triggered when a CREATE or UPDATE references a non-existent foreign key.
 * Example: creating an entitlement with a plan_id that doesn't exist.
 *
 * @param error - The caught error
 * @returns true if this is a P2003 foreign key violation
 */
export function isForeignKeyError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError & { code: 'P2003' } {
  return isPrismaError(error) && error.code === 'P2003';
}

/**
 * Check if an error is a Prisma "record not found" error (P2025).
 *
 * Triggered when update() or delete() targets a row that doesn't exist.
 * Also triggered by connectOrCreate when the connect condition fails
 * and create violates a constraint.
 *
 * @param error - The caught error
 * @returns true if this is a P2025 record not found error
 */
export function isNotFoundError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError & { code: 'P2025' } {
  return isPrismaError(error) && error.code === 'P2025';
}

/**
 * Check if an error is a Prisma required relation violation (P2014).
 *
 * Triggered when deleting a record that other records depend on
 * and the relation doesn't have onDelete: Cascade.
 * Example: deleting a plan that has active subscriptions.
 *
 * @param error - The caught error
 * @returns true if this is a P2014 relation violation
 */
export function isRelationViolationError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError & { code: 'P2014' } {
  return isPrismaError(error) && error.code === 'P2014';
}

/**
 * Check if an error is a Prisma connection timeout (P2024).
 *
 * Triggered when the connection pool is exhausted and a query
 * can't acquire a connection within the timeout period.
 * Usually indicates the app needs more connections or has a leak.
 *
 * @param error - The caught error
 * @returns true if this is a P2024 connection timeout
 */
export function isConnectionTimeoutError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError & { code: 'P2024' } {
  return isPrismaError(error) && error.code === 'P2024';
}

// =============================================================
// Field Extractors — Pull metadata from Prisma errors
// =============================================================

/**
 * Extract the field name(s) that caused a P2002 unique constraint violation.
 *
 * Prisma's P2002 error includes a `meta.target` array with the field names.
 * For example, a unique violation on `email` returns `['email']`.
 * A composite unique on (plan_id, feature_id) returns `['plan_id', 'feature_id']`.
 *
 * @param error - A Prisma known request error
 * @returns Array of field names, or empty array if not available
 */
export function getUniqueViolationFields(
  error: Prisma.PrismaClientKnownRequestError,
): string[] {
  const target = (error.meta as { target?: string[] })?.target;
  return target ?? [];
}

/**
 * Extract the field name that caused a P2003 foreign key violation.
 *
 * Prisma's P2003 error includes `meta.field_name` with the FK column.
 * Example: creating an entitlement with invalid plan_id returns "plan_id".
 *
 * @param error - A Prisma known request error
 * @returns The field name, or null if not available
 */
export function getForeignKeyField(
  error: Prisma.PrismaClientKnownRequestError,
): string | null {
  const fieldName = (error.meta as { field_name?: string })?.field_name;
  return fieldName ?? null;
}

/**
 * Extract the model name from a P2025 "record not found" error.
 *
 * Prisma's P2025 error includes `meta.cause` with a human-readable
 * description like "Record to update not found."
 *
 * @param error - A Prisma known request error
 * @returns The cause string, or null if not available
 */
export function getNotFoundCause(
  error: Prisma.PrismaClientKnownRequestError,
): string | null {
  const cause = (error.meta as { cause?: string })?.cause;
  return cause ?? null;
}

// =============================================================
// Error Code Matcher — Generic check for any Prisma error code
// =============================================================

/**
 * Check if an error matches a specific Prisma error code.
 *
 * Use this for less common error codes that don't have
 * a dedicated type guard above.
 *
 * @param error - The caught error
 * @param code - The Prisma error code to check (e.g., "P2021")
 * @returns true if the error matches the given code
 */
export function isPrismaErrorCode(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return isPrismaError(error) && error.code === code;
}
