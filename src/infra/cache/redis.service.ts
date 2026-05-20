/**
 * RedisService - Wraps ioredis with connection lifecycle management.
 *
 * Provides a typed interface for the usage pipeline's cache needs:
 *   - GET/SET with TTL for usage aggregate caching
 *   - INCRBY for atomic counter increments
 *   - DEL for cache invalidation
 *   - EVAL for Lua scripts (HARD limit atomic check-and-increment in Step 9)
 *
 * Global singleton - one connection per app instance, reused everywhere.
 * Connection string from REDIS_URL env var, falls back to localhost:6379.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private isConnected = false;

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 5) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
      lazyConnect: false,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Redis connected');
    });

    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis error: ${err.message}`);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis disconnected');
    }
  }

  /**
   * Get a value by key. Returns null if key doesn't exist.
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Set a value with optional TTL in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Atomically increment a key by amount. Creates key with value=amount if missing.
   * Returns the new value after increment.
   */
  async incrBy(key: string, amount: number): Promise<number> {
    return this.client.incrby(key, amount);
  }

  /**
   * Delete a key (cache invalidation).
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Set TTL on an existing key. Used after INCRBY to ensure
   * counter keys expire when the period ends.
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  /**
   * Execute a Lua script atomically.
   * Used by Step 9 for HARD limit check-and-increment.
   */
  async eval(
    script: string,
    keys: string[],
    args: (string | number)[],
  ): Promise<unknown> {
    return this.client.eval(script, keys.length, ...keys, ...args);
  }

  /**
   * Check if Redis is connected. Used by health checks.
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get the raw ioredis client for advanced operations.
   * Prefer the typed methods above when possible.
   */
  getClient(): Redis {
    return this.client;
  }
}
