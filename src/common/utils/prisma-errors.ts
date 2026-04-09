/**
 * Prisma error utilities.
 *
 * Prisma throws specific error codes for database constraint violations.
 * These helpers let us detect them cleanly without importing Prisma
 * internals into every service file.
 *
 * Error codes reference: https://www.prisma.io/docs/orm/reference/error-reference
 */
import { Prisma } from '@generated/prisma/client';

/**
 * Check if an error is a Prisma unique constraint violation (P2002).
 *
 * This happens when a CREATE or UPDATE violates a UNIQUE index/constraint.
 * For example: two concurrent register() calls with the same email
 * both pass the findUnique check, then one create() succeeds and the
 * other throws P2002.
 *
 * @param error - The caught error
 * @returns true if this is a P2002 unique constraint violation
 */
export function isUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError & { code: 'P2002' } {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/**
 * Extract the field name(s) that caused a P2002 unique constraint violation.
 *
 * Prisma's P2002 error includes a `meta.target` array with the field names.
 * For example, a unique violation on `email` returns `['email']`.
 *
 * @param error - A P2002 Prisma error
 * @returns Array of field names, or empty array if not available
 */
export function getUniqueViolationFields(
  error: Prisma.PrismaClientKnownRequestError,
): string[] {
  const target = (error.meta as { target?: string[] })?.target;
  return target ?? [];
}
