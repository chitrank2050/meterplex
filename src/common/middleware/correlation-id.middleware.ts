/**
 * CorrelationIdMiddleware - Attaches a unique ID to every request.
 *
 * Every request gets a UUID in the x-correlation-id header.
 * This ID flows through:
 *   1. Request logs ("request started")
 *   2. Error responses (exception filter includes it)
 *   3. Response headers (client can see it)
 *   4. Kafka messages (trace events back to the API call that created them)
 *
 * If the client sends their own x-correlation-id (e.g., a frontend
 * tracing system), we respect it instead of generating a new one.
 * This enables end-to-end request tracing across services.
 *
 * Why middleware and not an interceptor?
 *   Middleware runs BEFORE the NestJS pipeline (guards, pipes, interceptors).
 *   The correlation ID must exist before anything else logs or errors.
 *   An interceptor runs too late - if a guard throws, there's no correlation ID.
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Respect client-provided correlation ID for end-to-end tracing.
    // Generate a new one if the client didn't send one.
    const correlationId =
      (req.headers['x-correlation-id'] as string) || randomUUID();

    // Set it on the request so downstream code can read it.
    req.headers['x-correlation-id'] = correlationId;

    // Set it on the response so the client can see it.
    // Useful for debugging: "what correlation ID did my request get?"
    res.setHeader('x-correlation-id', correlationId);

    next();
  }
}
