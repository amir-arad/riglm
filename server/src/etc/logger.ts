import winston from "winston";
import path from "path";
import fs from "fs";
import { Arguments } from "./env";

export let logger = winston.createLogger({ silent: true });

export const makeDefaultLogger = (env: Arguments) => {
  logger = makeLogger(env);
  return logger;
};

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
};

export const makeLogger = (env: {
  logLevel: string;
  isProduction: boolean;
}) => {
  // Ensure data directory exists
  const dataDir = ensureDataDirectory();

  // Determine console log level (allow info level for lifecycle events in production)
  const consoleLogLevel = env.isProduction ? "info" : env.logLevel;

  // Filter out trace logs if log level is too verbose
  const fileLogLevel =
    env.logLevel === "silly" || env.logLevel === "verbose"
      ? "debug"
      : env.logLevel;

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
        format: winston.format.combine(
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
        ),
      }),
    ],
  });

  // Add file transports for all environments (but especially important for production)
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
        maxFiles: 5, // Keep 5 old files
      })
    );

    // General application log - more comprehensive but excluding trace
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
        maxFiles: 3, // Keep 3 old files
      })
    );

    // Development/debug log (only when not in production or explicitly enabled)
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
          maxFiles: 2, // Keep 2 old files
        })
      );
    }
  }

  return logger;
};
