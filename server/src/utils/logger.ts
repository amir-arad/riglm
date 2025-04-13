import winston from "winston";
import { env } from "../config/env";

/**
 * Create a logger instance
 */
export const logger = winston.createLogger({
  level: env.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "abc-server" },
  transports: [
    // Write logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaString = Object.keys(meta).length
            ? JSON.stringify(meta, null, 2)
            : "";
          return `${timestamp} [${level}]: ${message} ${metaString}`;
        })
      ),
    }),
  ],
});

// Add file transports in production
if (env.isProduction) {
  logger.add(
    new winston.transports.File({ filename: "logs/error.log", level: "error" })
  );
  logger.add(new winston.transports.File({ filename: "logs/combined.log" }));
}

/**
 * Stream for Morgan HTTP logger
 */
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
