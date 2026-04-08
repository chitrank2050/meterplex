/**
 * HttpExceptionFilter - Catches ALL exceptions and returns a consistent error response.
 *
 * Without this filter, NestJS returns different error shapes depending on
 * where the error occurs:
 *   - Validation errors: { statusCode, message[], error }
 *   - HttpException: { statusCode, message, error }
 *   - Unhandled errors: raw stack trace (SECURITY RISK in production)
 *
 * This filter normalizes ALL errors into one shape:
 *   {
 *     statusCode: 400,
 *     message: "Validation failed",
 *     error: "Bad Request",
 *     correlationId: "abc-123",    ← ties error to the request log
 *     timestamp: "2026-03-29T...",
 *     path: "/api/v1/tenants"
 *   }
 *
 * Why this matters:
 *   - Frontend team can parse errors with ONE interface, not three
 *   - No stack traces leak to clients in production
 *   - correlationId lets you grep logs for the exact request that failed
 *   - Consistent error shape is an interview talking point (API design)
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Determine status code and message based on exception type.
    // HttpException = intentional error (400, 401, 404, etc.)
    // Everything else = unexpected crash (500)
    const isHttpException = exception instanceof HttpException;

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    // Extract the message. Validation pipe returns { message: string[] }.
    // HttpException returns { message: string } or a string directly.
    let message: string | string[] = 'Internal server error';
    if (isHttpException) {
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as Record<string, unknown>)['message'] as
          | string
          | string[];
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    }

    // correlationId is attached by our middleware (created next).
    // Falls back to 'unknown' if the middleware didn't run (shouldn't happen).
    const correlationId =
      (request.headers['x-correlation-id'] as string) ?? 'unknown';

    const errorResponse = {
      statusCode,
      message,
      error: isHttpException
        ? exception.name.replace(/([A-Z])/g, ' $1').trim()
        : 'Internal Server Error',
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log the error. 5xx = error level (bugs). 4xx = warn level (client mistakes).
    if (statusCode >= 500) {
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${correlationId}] ${request.method} ${request.url} → ${statusCode}: ${JSON.stringify(message)}`,
      );
    }

    response.status(statusCode).json(errorResponse);
  }
}
