/**
 * Prisma Configuration - Runtime connection and migration settings.
 *
 * Prisma 7 moved all runtime config out of schema.prisma into this file.
 * This is where you configure:
 *   - Database connection URL (from .env in dev, from real env vars in prod)
 *   - Migration file location
 *   - Schema file location
 *   - Seed command
 *
 * "dotenv/config" import loads .env automatically so process.env.DATABASE_URL
 * is available. In production, your deployment platform sets real env vars
 * and this import is a harmless no-op.
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  /** Path to the Prisma schema file */
  schema: 'prisma/schema.prisma',

  /** Migration settings including seed command */
  migrations: {
    path: 'prisma/migrations',

    // Seed command - runs via `pnpm db:seed` or after `prisma migrate reset`.
    seed: 'npx tsx prisma/seed.ts',
  },

  /** Database connection - reads DATABASE_URL from environment */
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
