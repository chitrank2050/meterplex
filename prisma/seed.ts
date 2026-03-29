/**
 * seed.ts — Populates the database with development/testing data.
 *
 * Run with: pnpm prisma:seed
 * Also runs automatically on: pnpm prisma:migrate:reset
 *
 * This script is IDEMPOTENT — running it multiple times produces
 * the same result. It uses upsert (insert or update) so it won't
 * crash on duplicate slugs if you run it twice.
 *
 * Why seed data matters:
 *   - New dev joins the team → clones repo, runs docker:up + seed → working app
 *   - Tests need predictable data to assert against
 *   - Demo environments need realistic-looking tenants
 */
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('Seeding database...\n');

  // --- Tenants ---
  const tenants = [
    {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      metadata: {
        timezone: 'America/New_York',
        billingEmail: 'billing@acme.example.com',
        industry: 'Technology',
      },
    },
    {
      name: 'Globex Industries',
      slug: 'globex',
      metadata: {
        timezone: 'America/Chicago',
        billingEmail: 'accounts@globex.example.com',
        industry: 'Manufacturing',
      },
    },
    {
      name: 'Stark Enterprises',
      slug: 'stark',
      metadata: {
        timezone: 'America/Los_Angeles',
        billingEmail: 'finance@stark.example.com',
        industry: 'Defense',
      },
    },
  ];

  for (const tenant of tenants) {
    const result = await prisma.tenant.upsert({
      where: { slug: tenant.slug },
      update: { name: tenant.name, metadata: tenant.metadata },
      create: tenant,
    });
    console.log(`  Tenant: ${result.name} (${result.slug}) — ${result.id}`);
  }

  console.log(`\nSeeded ${tenants.length} tenants.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
