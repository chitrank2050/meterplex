/**
 * Winston Logging Configuration
 *
 * This configuration provides:
 *   - Colorized, human-readable console output for local development.
 *   - Structured JSON output for production environments (Loki/ELK friendly).
 *   - Consistent metadata (timestamp, context, correlation ID).
 *
 * @param nodeEnv - The current environment (development, production, test)
 */
import type { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

export const getWinstonConfig = (nodeEnv: string): WinstonModuleOptions => {
  const isProduction = nodeEnv === 'production';

  return {
    // Top-level levels: error, warn, info, debug, etc.
    // Default level: 'debug' in dev, 'info' in prod.
    level: isProduction ? 'info' : 'debug',

    // Default formats applied to all transports
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      isProduction ? winston.format.json() : winston.format.simple(),
    ),

    transports: [
      new winston.transports.Console({
        format: isProduction
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            )
          : winston.format.combine(
              winston.format.colorize({ all: true }),
              winston.format.timestamp({ format: 'HH:mm:ss' }),
              winston.format.printf((info) => {
                const { timestamp, level, message, context, ...metadata } =
                  info;
                const contextStr = context
                  ? ` \x1b[33m[${context}]\x1b[0m`
                  : '';
                const metaStr = Object.keys(metadata).length
                  ? `\n\x1b[90m${JSON.stringify(metadata, null, 2)}\x1b[0m`
                  : '';

                return `\x1b[90m[Meterplex]\x1b[0m ${timestamp} ${level}${contextStr} ${message}${metaStr}`;
              }),
            ),
      }),

      // In production, we could add file transports or external shippers here:
      // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      // new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
  };
};
