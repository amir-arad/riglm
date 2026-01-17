/**
 * Winston Logger Adapter - Implements LoggerPort using Winston
 */

import winston from "winston";
import path from "path";
import fs from "fs";
import { LoggerPort } from "../../ports/logger.port";

/**
 * Winston-based implementation of LoggerPort.
 * Wraps a Winston logger instance to conform to the port interface.
 */
export class WinstonLoggerAdapter implements LoggerPort {
  constructor(private winstonLogger: winston.Logger) {}

  info(message: string, ...meta: unknown[]): void {
    this.winstonLogger.info(message, ...meta);
  }

  warn(message: string, ...meta: unknown[]): void {
    this.winstonLogger.warn(message, ...meta);
  }

  error(message: string, ...meta: unknown[]): void {
    this.winstonLogger.error(message, ...meta);
  }

  debug(message: string, ...meta: unknown[]): void {
    this.winstonLogger.debug(message, ...meta);
  }

  child(meta: Record<string, unknown>): LoggerPort {
    return new WinstonLoggerAdapter(this.winstonLogger.child(meta));
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Environment configuration for logger creation
 */
export interface LoggerEnvConfig {
  logLevel: string;
  isProduction: boolean;
  /** Log format: 'pretty' for human-readable, 'json' for machine-parseable */
  logFormat?: "pretty" | "json";
  /** Optional path to write logs to file */
  logFile?: string;
}

/**
 * Ensure data directory exists for file logging
 */
function ensureDataDirectory(): string {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

/**
 * Create a Winston logger instance with the specified configuration
 */
function createWinstonLogger(env: LoggerEnvConfig): winston.Logger {
  const dataDir = ensureDataDirectory();
  const logFormat = env.logFormat ?? "pretty";

  // Determine console log level (allow info level for lifecycle events in production)
  const consoleLogLevel = env.isProduction ? "info" : env.logLevel;

  // Filter out trace logs if log level is too verbose
  const fileLogLevel =
    env.logLevel === "silly" || env.logLevel === "verbose"
      ? "debug"
      : env.logLevel;

  // Create console format based on logFormat option
  const consoleFormat =
    logFormat === "json"
      ? winston.format.combine(
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(
            ({ timestamp, level, message, service, ...meta }) => {
              // Simplified console output - less metadata in production
              if (env.isProduction) {
                return `${service}|${level}: ${message}`;
              } else {
                const metaString = Object.keys(meta).length
                  ? JSON.stringify(meta, null, 2)
                  : "";
                return `${service}|${level} ${timestamp}: ${message} ${metaString}`;
              }
            }
          )
        );

  const logger = winston.createLogger({
    level: fileLogLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: "ROOT" },
    transports: [
      // Console transport - reduced verbosity for production
      new winston.transports.Console({
        level: consoleLogLevel,
        format: consoleFormat,
      }),
    ],
  });

  // Add file transports for all environments
  if (env.isProduction || process.env.ENABLE_FILE_LOGGING === "true") {
    // Error log - only errors and above
    logger.add(
      new winston.transports.File({
        filename: path.join(dataDir, "error.log"),
        level: "error",
        format: winston.format.combine(
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      })
    );

    // General application log
    logger.add(
      new winston.transports.File({
        filename: path.join(dataDir, "app.log"),
        level: fileLogLevel,
        format: winston.format.combine(
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        maxsize: 20 * 1024 * 1024, // 20MB
        maxFiles: 3,
      })
    );

    // Debug log
    if (!env.isProduction || process.env.ENABLE_DEBUG_LOGGING === "true") {
      logger.add(
        new winston.transports.File({
          filename: path.join(dataDir, "debug.log"),
          level: "debug",
          format: winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.errors({ stack: true }),
            winston.format.prettyPrint()
          ),
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 2,
        })
      );
    }
  }

  // Add custom log file if specified via CLI
  if (env.logFile) {
    // Ensure parent directory exists
    const logDir = path.dirname(env.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    logger.add(
      new winston.transports.File({
        filename: env.logFile,
        level: fileLogLevel,
        format: winston.format.combine(
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5,
      })
    );
  }

  return logger;
}

/**
 * Create a LoggerPort instance using Winston
 * @param env Environment configuration
 * @returns LoggerPort implementation backed by Winston
 */
export function createWinstonLoggerAdapter(env: LoggerEnvConfig): LoggerPort {
  const winstonLogger = createWinstonLogger(env);
  return new WinstonLoggerAdapter(winstonLogger);
}
