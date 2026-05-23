/**
 * RateLimitGuard - Redis sliding window rate limiter.
 *
 * Uses Redis INCR + EXPIRE for a fixed-window counter per key.
 * Key format: ratelimit:{category}:{identifier}:{windowTimestamp}
 *
 * Tiered limits applied via @RateLimit() decorator:
 *   - Auth endpoints: 10/min per IP
 *   - Usage ingestion: 100/min per API key
 *   - Invoice generation: 5/min per tenant
 *   - General API: 200/min per user (from env THROTTLE_LIMIT)
 *
 * Response headers on every request:
 *   X-RateLimit-Limit: max requests allowed
 *   X-RateLimit-Remaining: requests left in window
 *   X-RateLimit-Reset: Unix timestamp when window resets
 *
 * On limit exceeded: 429 with Retry-After header.
 *
 * Must run AFTER auth guards (needs request.user for user-based limits).
 * Falls back gracefully if Redis is down - allows the request through.
 */
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RedisService } from '@infra/cache';

export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Rate limit configuration for an endpoint or controller.
 */
export interface RateLimitConfig {
  /** Max requests per window. */
  limit: number;
  /** Window size in seconds. */
  windowSeconds: number;
  /** How to identify the caller: 'ip', 'user', 'tenant', 'apiKey'. */
  keyType: 'ip' | 'user' | 'tenant' | 'apiKey';
}

/**
 * @RateLimit() decorator - sets per-endpoint rate limit config.
 *
 * Usage:
 *   @RateLimit({ limit: 10, windowSeconds: 60, keyType: 'ip' })
 */
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  /** Default limits from env (THROTTLE_LIMIT / THROTTLE_TTL). */
  private readonly defaultLimit: number;
  private readonly defaultWindow: number;

  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {
    this.defaultLimit = parseInt(process.env.THROTTLE_LIMIT ?? '200', 10);
    this.defaultWindow = parseInt(process.env.THROTTLE_TTL ?? '60', 10);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get config from @RateLimit() decorator, or use defaults
    const config = this.reflector.getAllAndOverride<
      RateLimitConfig | undefined
    >(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    const limit = config?.limit ?? this.defaultLimit;
    const windowSeconds = config?.windowSeconds ?? this.defaultWindow;
    const keyType = config?.keyType ?? 'user';

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Build the rate limit key based on keyType
    const identifier = this.getIdentifier(request, keyType);
    if (!identifier) {
      // Can't identify caller (e.g., no user on unauthenticated endpoint)
      // Fall through - don't block
      return true;
    }

    const windowTimestamp = Math.floor(Date.now() / 1000 / windowSeconds);
    const redisKey = `ratelimit:${keyType}:${identifier}:${windowTimestamp}`;
    const resetAt = (windowTimestamp + 1) * windowSeconds;

    try {
      const current = await this.redis.incrBy(redisKey, 1);

      // Set expiry on first request in window
      if (current === 1) {
        await this.redis.expire(redisKey, windowSeconds + 1);
      }

      const remaining = Math.max(0, limit - current);

      // Set rate limit headers on every response
      response.setHeader('X-RateLimit-Limit', limit);
      response.setHeader('X-RateLimit-Remaining', remaining);
      response.setHeader('X-RateLimit-Reset', resetAt);

      if (current > limit) {
        const retryAfter = resetAt - Math.floor(Date.now() / 1000);
        response.setHeader('Retry-After', Math.max(1, retryAfter));

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Rate limit exceeded. Retry after ${Math.max(1, retryAfter)} seconds.`,
            error: 'Too Many Requests',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      // If it's our 429, re-throw
      if (error instanceof HttpException) {
        throw error;
      }

      // Redis down - fail open, don't block requests
      this.logger.warn(
        `Rate limit check failed (Redis error): ${error instanceof Error ? error.message : String(error)}`,
      );
      return true;
    }
  }

  /**
   * Extract the identifier for rate limiting based on keyType.
   */
  private getIdentifier(
    request: any,
    keyType: 'ip' | 'user' | 'tenant' | 'apiKey',
  ): string | null {
    switch (keyType) {
      case 'ip':
        return request.ip ?? request.connection?.remoteAddress ?? null;
      case 'user':
        return request.user?.id ?? null;
      case 'tenant':
        return (request.headers['x-tenant-id'] as string) ?? null;
      case 'apiKey':
        // API key hash or prefix from the auth header
        return request.user?.apiKeyId ?? request.user?.id ?? null;
      default:
        return null;
    }
  }
}

/**
 * Pre-configured rate limit presets for common endpoint categories.
 * Usage: @RateLimit(RATE_LIMITS.AUTH)
 */
export const RATE_LIMITS = {
  /** Auth endpoints: 10/min per IP (login) */
  AUTH: { limit: 10, windowSeconds: 60, keyType: 'ip' as const },

  /** Strict auth: 5/min per IP (register, forgot-password) */
  AUTH_STRICT: { limit: 5, windowSeconds: 60, keyType: 'ip' as const },

  /** Usage ingestion: 100/min per tenant */
  USAGE: { limit: 100, windowSeconds: 60, keyType: 'tenant' as const },

  /** Invoice generation: 5/min per tenant */
  INVOICE: { limit: 5, windowSeconds: 60, keyType: 'tenant' as const },
} satisfies Record<string, RateLimitConfig>;
