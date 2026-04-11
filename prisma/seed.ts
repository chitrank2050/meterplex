/**
 * seed.ts - Populates the database with development/testing data.
 *
 * Run with: pnpm db:seed
 * Also runs automatically on: pnpm db:migrate:reset
 *
 * This script creates a complete development environment:
 *   - 3 tenants (Acme, Globex, Stark)
 *   - 5 users with different roles across tenants
 *   - Memberships linking users to tenants with roles
 *   - 1 active API key per tenant
 *
 * IDEMPOTENT: Uses upsert for users and tenants, checks existence
 * for memberships and keys. Safe to run multiple times.
 *
 * All passwords are "DevPass123" for development convenience.
 * These credentials are documented here intentionally - this is
 * seed data, not production secrets.
 *
 * Dev accounts created:
 *   alice@meterplex.dev   → OWNER of Acme, ADMIN of Globex
 *   bob@meterplex.dev     → OWNER of Globex, DEVELOPER of Acme
 *   carol@meterplex.dev   → OWNER of Stark, BILLING of Acme
 *   dave@meterplex.dev    → DEVELOPER of Acme, DEVELOPER of Globex
 *   eve@meterplex.dev     → BILLING of Globex, ADMIN of Stark
 */
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/** All dev users share this password for convenience. */
const DEV_PASSWORD = 'DevPass123';
const SALT_ROUNDS = 12;

/** Hash a password with bcrypt. */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** SHA-256 hash for API key storage. */
function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function main(): Promise<void> {
  console.log('Seeding database...\n');

  const passwordHash = await hashPassword(DEV_PASSWORD);

  // =========================================================
  // TENANTS
  // =========================================================

  console.log('--- Tenants ---');

  const acme = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: { name: 'Acme Corporation' },
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      metadata: {
        timezone: 'America/New_York',
        billingEmail: 'billing@acme.example.com',
        industry: 'Technology',
      },
    },
  });
  console.log(`  Tenant: ${acme.name} (${acme.slug})`);

  const globex = await prisma.tenant.upsert({
    where: { slug: 'globex' },
    update: { name: 'Globex Industries' },
    create: {
      name: 'Globex Industries',
      slug: 'globex',
      metadata: {
        timezone: 'America/Chicago',
        billingEmail: 'accounts@globex.example.com',
        industry: 'Manufacturing',
      },
    },
  });
  console.log(`  Tenant: ${globex.name} (${globex.slug})`);

  const stark = await prisma.tenant.upsert({
    where: { slug: 'stark' },
    update: { name: 'Stark Enterprises' },
    create: {
      name: 'Stark Enterprises',
      slug: 'stark',
      metadata: {
        timezone: 'America/Los_Angeles',
        billingEmail: 'finance@stark.example.com',
        industry: 'Defense',
      },
    },
  });
  console.log(`  Tenant: ${stark.name} (${stark.slug})`);

  // =========================================================
  // USERS
  // =========================================================

  console.log('\n--- Users ---');

  const alice = await prisma.user.upsert({
    where: { email: 'alice@meterplex.dev' },
    update: {},
    create: {
      email: 'alice@meterplex.dev',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Johnson',
    },
  });
  console.log(`  User: ${alice.email} (${alice.firstName} ${alice.lastName})`);

  const bob = await prisma.user.upsert({
    where: { email: 'bob@meterplex.dev' },
    update: {},
    create: {
      email: 'bob@meterplex.dev',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Smith',
    },
  });
  console.log(`  User: ${bob.email} (${bob.firstName} ${bob.lastName})`);

  const carol = await prisma.user.upsert({
    where: { email: 'carol@meterplex.dev' },
    update: {},
    create: {
      email: 'carol@meterplex.dev',
      passwordHash,
      firstName: 'Carol',
      lastName: 'Williams',
    },
  });
  console.log(`  User: ${carol.email} (${carol.firstName} ${carol.lastName})`);

  const dave = await prisma.user.upsert({
    where: { email: 'dave@meterplex.dev' },
    update: {},
    create: {
      email: 'dave@meterplex.dev',
      passwordHash,
      firstName: 'Dave',
      lastName: 'Brown',
    },
  });
  console.log(`  User: ${dave.email} (${dave.firstName} ${dave.lastName})`);

  const eve = await prisma.user.upsert({
    where: { email: 'eve@meterplex.dev' },
    update: {},
    create: {
      email: 'eve@meterplex.dev',
      passwordHash,
      firstName: 'Eve',
      lastName: 'Davis',
    },
  });
  console.log(`  User: ${eve.email} (${eve.firstName} ${eve.lastName})`);

  // =========================================================
  // MEMBERSHIPS
  // =========================================================

  console.log('\n--- Memberships ---');

  const memberships = [
    // Acme Corp: Alice=OWNER, Bob=DEVELOPER, Carol=BILLING, Dave=DEVELOPER
    {
      userId: alice.id,
      tenantId: acme.id,
      role: 'OWNER' as const,
      label: 'Alice → Acme (OWNER)',
    },
    {
      userId: bob.id,
      tenantId: acme.id,
      role: 'DEVELOPER' as const,
      label: 'Bob → Acme (DEVELOPER)',
    },
    {
      userId: carol.id,
      tenantId: acme.id,
      role: 'BILLING' as const,
      label: 'Carol → Acme (BILLING)',
    },
    {
      userId: dave.id,
      tenantId: acme.id,
      role: 'DEVELOPER' as const,
      label: 'Dave → Acme (DEVELOPER)',
    },

    // Globex: Bob=OWNER, Alice=ADMIN, Dave=DEVELOPER, Eve=BILLING
    {
      userId: bob.id,
      tenantId: globex.id,
      role: 'OWNER' as const,
      label: 'Bob → Globex (OWNER)',
    },
    {
      userId: alice.id,
      tenantId: globex.id,
      role: 'ADMIN' as const,
      label: 'Alice → Globex (ADMIN)',
    },
    {
      userId: dave.id,
      tenantId: globex.id,
      role: 'DEVELOPER' as const,
      label: 'Dave → Globex (DEVELOPER)',
    },
    {
      userId: eve.id,
      tenantId: globex.id,
      role: 'BILLING' as const,
      label: 'Eve → Globex (BILLING)',
    },

    // Stark: Carol=OWNER, Eve=ADMIN
    {
      userId: carol.id,
      tenantId: stark.id,
      role: 'OWNER' as const,
      label: 'Carol → Stark (OWNER)',
    },
    {
      userId: eve.id,
      tenantId: stark.id,
      role: 'ADMIN' as const,
      label: 'Eve → Stark (ADMIN)',
    },
  ];

  for (const m of memberships) {
    await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: m.userId,
          tenantId: m.tenantId,
        },
      },
      update: { role: m.role },
      create: {
        userId: m.userId,
        tenantId: m.tenantId,
        role: m.role,
      },
    });
    console.log(`  ${m.label}`);
  }

  // =========================================================
  // API KEYS
  // =========================================================

  console.log('\n--- API Keys ---');

  const apiKeys = [
    {
      tenantId: acme.id,
      createdByUserId: alice.id,
      name: 'Acme Production Key',
      label: 'Acme Corp',
    },
    {
      tenantId: globex.id,
      createdByUserId: bob.id,
      name: 'Globex Production Key',
      label: 'Globex Industries',
    },
    {
      tenantId: stark.id,
      createdByUserId: carol.id,
      name: 'Stark Production Key',
      label: 'Stark Enterprises',
    },
  ];

  for (const ak of apiKeys) {
    // Check if tenant already has an active key with this name
    const existing = await prisma.apiKey.findFirst({
      where: {
        tenantId: ak.tenantId,
        name: ak.name,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      console.log(
        `  ${ak.label}: key already exists (${existing.keyPrefix}...)`,
      );
      continue;
    }

    // Generate a deterministic-looking key for dev (still secure in practice)
    const rawKey = `mp_live_${randomBytes(30).toString('base64url')}`;
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 10);

    await prisma.apiKey.create({
      data: {
        tenantId: ak.tenantId,
        createdByUserId: ak.createdByUserId,
        keyPrefix,
        keyHash,
        name: ak.name,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });

    console.log(`  ${ak.label}: ${keyPrefix}... (key: ${rawKey})`);
  }

  // =========================================================
  // SUMMARY
  // =========================================================

  const counts = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.membership.count(),
    prisma.apiKey.count(),
  ]);

  console.log(`
Seed complete:
  Tenants:     ${counts[0]}
  Users:       ${counts[1]}
  Memberships: ${counts[2]}
  API Keys:    ${counts[3]}

Dev login credentials (all passwords: ${DEV_PASSWORD}):
  alice@meterplex.dev  → OWNER of Acme, ADMIN of Globex
  bob@meterplex.dev    → OWNER of Globex, DEVELOPER of Acme
  carol@meterplex.dev  → OWNER of Stark, BILLING of Acme
  dave@meterplex.dev   → DEVELOPER of Acme & Globex
  eve@meterplex.dev    → BILLING of Globex, ADMIN of Stark
`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
