/**
 * PrismaService - Injectable database client for the entire application.
 *
 * Prisma 7 Breaking Changes (vs Prisma 6):
 *   1. PrismaClient requires a "driver adapter" - no more bare super()
 *   2. @prisma/adapter-pg connects to Postgres via the pg driver
 *   3. The connection URL comes from process.env, NOT from schema.prisma
 *   4. Generated client must use moduleFormat = "cjs" for NestJS
 *
 * Usage in any service:
 *   constructor(private prisma: PrismaService) {}
 *   const tenant = await this.prisma.tenant.findUnique({ where: { id } });
 */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Prisma 7 requires an explicit driver adapter.
    // PrismaPg uses the 'pg' driver under the hood to connect to Postgres.
    // The connectionString reads from the same DATABASE_URL in .env.
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });

    super({ adapter });
  }

  /**
   * Called by NestJS after module initialization.
   * Opens the database connection pool.
   * If Postgres is unreachable, this throws and the app fails to start.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to PostgreSQL...');
    await this.$connect();
    this.logger.log('PostgreSQL connected');
  }

  /**
   * Called by NestJS during graceful shutdown (SIGTERM).
   * Closes all connections in the pool cleanly.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from PostgreSQL...');
    await this.$disconnect();
    this.logger.log('PostgreSQL disconnected');
  }
}
