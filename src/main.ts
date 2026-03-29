/**
 * Meterplex Application Entry Point
 *
 * This file bootstraps the NestJS application and configures:
 *   - Global API prefix and versioning (/api/v1/...)
 *   - Swagger/OpenAPI documentation
 *   - Security headers (Helmet)
 *   - Response compression (gzip)
 *   - CORS for frontend access
 *   - Global validation pipe (reject malformed requests)
 *   - Graceful shutdown hooks (clean up DB connections on SIGTERM)
 *
 * Execution order matters here.
 * - Helmet must run before any response is sent.
 * - Compression must wrap the response stream early.
 * - Validation pipe must be global so no controller can skip it.
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';

import { HttpExceptionFilter } from '@common/filters';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // =============================================================
  // Security — Helmet sets HTTP headers that protect against
  //    common attacks: XSS, clickjacking, MIME sniffing, etc.
  //    This MUST run before any route handler sends a response.
  // =============================================================
  app.use(helmet());

  // =============================================================
  // Compression — gzip responses over the wire.
  //    Reduces payload size by 60-80% for JSON responses.
  //    In production, we typically let a reverse proxy (nginx)
  //    handle this. But for dev and smaller deployments, this works.
  // =============================================================
  app.use(compression());

  // =============================================================
  // CORS — Controls which frontends can call this API.
  //    Reads allowed origins from env. In production, this is our
  //    actual frontend domain. Never use origin: true (allow all)
  //    in production — that's a security hole.
  // =============================================================
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // =============================================================
  // Global prefix — Every route starts with /api.
  //    /tenants becomes /api/tenants.
  //    Separates API routes from static assets, health checks, etc.
  //    We exclude /health so load balancers hit it without the prefix.
  // =============================================================
  const apiPrefix = process.env.API_PREFIX ?? 'api';
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health'],
  });

  // =============================================================
  // API Versioning — URI-based: /api/v1/tenants, /api/v2/tenants.
  //
  //    Why URI versioning over header versioning?
  //    - Visible in the URL (easy to debug, easy to curl)
  //    - Works with Swagger out of the box
  //    - Every major API (Stripe, GitHub, Twilio) uses URI versioning
  //
  //    When we need a breaking change to an endpoint, we create
  //    a v2 controller alongside v1. Old clients keep working.
  // =============================================================
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: process.env.API_VERSION ?? '1',
  });

  // =============================================================
  // Global Validation Pipe —
  //    Rejects invalid request bodies
  //    BEFORE they reach our business logic.
  //
  //    How it works:
  //    - Our DTO class has decorators: @IsEmail(), @IsString(), etc.
  //    - When a request comes in, this pipe validates the body
  //      against those decorators automatically.
  //    - If validation fails, the client gets a 400 with clear errors.
  //    - Our controller code never sees invalid data.
  //
  //    Options explained:
  //    - whitelist: strips properties not in the DTO (prevents injection)
  //    - forbidNonWhitelisted: rejects request if extra properties sent
  //    - transform: auto-converts types (string "5" → number 5)
  // =============================================================
  // =============================================================
  // Global Exception Filter — Catches ALL unhandled exceptions
  //     and returns a consistent JSON error response.
  //     Without this, unhandled errors leak stack traces to clients.
  // =============================================================
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // =============================================================
  // Swagger / OpenAPI — Auto-generated API documentation.
  //    Available at /api/docs in development.
  //
  //    Every controller, DTO, and endpoint you build with proper
  //    decorators (@ApiTags, @ApiOperation, @ApiResponse) will
  //    automatically appear here. No separate docs to maintain.
  //
  //    Only enabled in development — you don't expose API docs
  //    in production unless it's a public API.
  // =============================================================
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Meterplex API')
      .setDescription(
        'B2B usage metering, entitlements, and billing platform. ' +
          'Manages tenants, plans, subscriptions, usage tracking, ' +
          'and invoice generation.',
      )
      .setVersion(process.env.API_VERSION ?? '1')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  // =============================================================
  // Graceful Shutdown — When the process receives SIGTERM
  //    (e.g., Kubernetes rolling update, docker compose down),
  //    NestJS will:
  //    1. Stop accepting new connections
  //    2. Wait for in-flight requests to complete
  //    3. Close database connections cleanly
  //    4. Disconnect Kafka consumers
  //
  //    Without this, active database transactions get killed
  //    mid-operation, potentially corrupting data.
  // =============================================================
  app.enableShutdownHooks();

  // =============================================================
  // Start listening
  // =============================================================
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`
  ┌──────────────────────────────────────────────┐
  │  Meterplex API running                       │
  │  Local:   http://localhost:${String(port).padEnd(4)}              │
  │  Docs:    http://localhost:${String(port).padEnd(4)}/api/docs     │
  │  Health:  http://localhost:${String(port).padEnd(4)}/health       │
  │  Mode:    ${String(process.env.NODE_ENV ?? 'development').padEnd(35)}│
  └──────────────────────────────────────────────┘
  `);
}

void bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
