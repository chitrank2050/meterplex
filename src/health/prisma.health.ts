/**
 * PrismaHealthIndicator - Checks if PostgreSQL is reachable.
 *
 * Uses the NEW Terminus API (v11+):
 *   - HealthIndicatorService replaces the deprecated HealthIndicator base class
 *   - No more extending HealthIndicator or throwing HealthCheckError
 *   - Cleaner pattern: get an indicator, return .up() or .down()
 *
 * This indicator runs `SELECT 1` against Postgres via Prisma.
 * If the query returns, Postgres is healthy.
 * If it throws (connection refused, timeout), Postgres is down.
 *
 * Why SELECT 1 instead of a real query?
 *   - No table dependencies (works even with empty database)
 *   - Minimal load on the database
 *   - Tests the full path: connection pool → network → Postgres → response
 */
import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  /**
   * Checks PostgreSQL connectivity by executing a trivial query.
   *
   * @param key - The name shown in the health check response (e.g., "postgres")
   * @returns Health indicator result with status "up" or "down"
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    // .check(key) returns an indicator object with .up() and .down() methods.
    const indicator = this.healthIndicatorService.check(key);

    try {
      // SELECT 1 is the lightest possible database check.
      // Tests the full path: connection pool → network → Postgres → response.
      await this.prisma.$queryRaw`SELECT 1`;
      return indicator.up();
    } catch (error) {
      // .down() includes error details in the health check response body.
      // The HealthCheckService in the controller catches this and returns 503.
      return indicator.down({ message: (error as Error).message });
    }
  }
}
