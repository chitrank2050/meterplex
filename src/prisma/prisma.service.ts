/**
 * PrismaService — Injectable database client for the entire application.
 *
 * Wraps Prisma's generated client as a NestJS service so it:
 *   1. Participates in NestJS dependency injection
 *   2. Connects to Postgres when the app starts (onModuleInit)
 *   3. Disconnects cleanly when the app shuts down (onModuleDestroy)
 *
 * Usage in any service:
 *   constructor(private prisma: PrismaService) {}
 *   const tenant = await this.prisma.tenant.findUnique({ where: { id } });
 *
 * Why not use PrismaClient directly?
 *   - PrismaClient doesn't implement NestJS lifecycle hooks
 *   - No way to inject it via constructor without this wrapper
 *   - No graceful shutdown — active queries get killed on SIGTERM
 *   - Can't be mocked in unit tests without an injectable token
 */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Called automatically by NestJS after the module is initialized.
   * Establishes the database connection pool.
   *
   * If Postgres is unreachable, this throws and the app fails to start.
   * That's intentional — an app without a database is useless.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to PostgreSQL...');
    await this.$connect();
    this.logger.log('PostgreSQL connected');
  }

  /**
   * Called automatically by NestJS during graceful shutdown (SIGTERM).
   * Closes all connections in the pool.
   *
   * Without this, docker compose down / Kubernetes rolling updates
   * kill active database connections mid-query.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from PostgreSQL...');
    await this.$disconnect();
    this.logger.log('PostgreSQL disconnected');
  }
}
