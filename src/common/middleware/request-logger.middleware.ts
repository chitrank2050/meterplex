/**
 * RequestLoggerMiddleware - Logs every incoming request and its response time.
 *
 * Output for every request:
 *   [RequestLogger] [abc-123] GET /api/v1/tenants → 200 (45ms)
 *
 * This gives you:
 *   - correlationId for tracing
 *   - HTTP method and path
 *   - Response status code
 *   - Duration in milliseconds (spot slow endpoints instantly)
 *
 * Why middleware and not an interceptor?
 *   Same reason as CorrelationIdMiddleware - we want to capture the
 *   FULL request lifecycle including time spent in guards and pipes.
 *   Interceptors only measure controller + service time.
 */
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';

import { NextFunction, Request, Response } from 'express';

import { CORRELATION_ID_HEADER } from '@common/constants';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl } = req;
    const correlationId = req.headers[CORRELATION_ID_HEADER] as string;

    // Skip health checks — they fire every few seconds and clutter logs.
    if (originalUrl === '/health') {
      return next();
    }

    // The 'finish' event fires when the response has been sent to the client.
    // This is where we calculate the total request duration.
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const message = `[${correlationId}] ${method} ${originalUrl} → ${statusCode} (${duration}ms)`;

      // Color-code by status: 2xx = log, 4xx = warn, 5xx = error
      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
