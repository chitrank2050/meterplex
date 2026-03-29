/**
 * HealthController — Exposes /health endpoint for infrastructure monitoring.
 *
 * Two types of health checks (important interview concept):
 *
 *   Liveness: "Is the process running?"
 *     → If this fails, Kubernetes restarts the container.
 *     → Should NOT check external deps (DB, Kafka).
 *     → A crashed process can't respond at all, so just responding = alive.
 *
 *   Readiness: "Can this instance serve traffic?"
 *     → If this fails, the load balancer stops sending requests to this instance.
 *     → SHOULD check external deps (DB, Redis, Kafka).
 *     → An instance that's alive but can't reach Postgres is useless.
 *
 * We combine both into one /health endpoint for simplicity.
 * In production with Kubernetes, you'd split them:
 *   /health/live   → livenessProbe
 *   /health/ready  → readinessProbe
 */
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
  ) {}

  /**
   * GET /health
   *
   * Returns 200 if all checks pass, 503 if any check fails.
   * Response body lists each check with its status:
   *
   *   {
   *     "status": "ok",
   *     "info": { "postgres": { "status": "up" } },
   *     "details": { "postgres": { "status": "up" } }
   *   }
   *
   * Load balancers and monitoring tools parse this automatically.
   */
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API and dependency health' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Each arrow function returns a health indicator result.
      // If the check throws, Terminus catches it and reports "down".
      () => this.prismaHealth.isHealthy('postgres'),
    ]);
  }
}
