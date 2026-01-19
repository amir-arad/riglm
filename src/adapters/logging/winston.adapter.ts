

import winston from "winston";
import path from "path";
import fs from "fs";
import { LoggerPort } from "../../ports/logger.port";


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






export interface LoggerEnvConfig {
  logLevel: string;
  isProduction: boolean;
  
  logFormat?: "pretty" | "json";
  
  logFile?: string;
}


function ensureDataDirectory(): string {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}


function createWinstonLogger(env: LoggerEnvConfig): winston.Logger {
  const dataDir = ensureDataDirectory();
  const logFormat = env.logFormat ?? "pretty";

  
  const consoleLogLevel = env.isProduction ? "info" : env.logLevel;

  
  const fileLogLevel =
    env.logLevel === "silly" || env.logLevel === "verbose"
      ? "debug"
      : env.logLevel;

  
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
      
      new winston.transports.Console({
        level: consoleLogLevel,
        format: consoleFormat,
      }),
    ],
  });

  
  if (env.isProduction || process.env.ENABLE_FILE_LOGGING === "true") {
    
    logger.add(
      new winston.transports.File({
        filename: path.join(dataDir, "error.log"),
        level: "error",
        format: winston.format.combine(
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        maxsize: 10 * 1024 * 1024, 
        maxFiles: 5,
      })
    );

    
    logger.add(
      new winston.transports.File({
        filename: path.join(dataDir, "app.log"),
        level: fileLogLevel,
        format: winston.format.combine(
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        maxsize: 20 * 1024 * 1024, 
        maxFiles: 3,
      })
    );

    
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
          maxsize: 5 * 1024 * 1024, 
          maxFiles: 2,
        })
      );
    }
  }

  
  if (env.logFile) {
    
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
        maxsize: 50 * 1024 * 1024, 
        maxFiles: 5,
      })
    );
  }

  return logger;
}


export function createWinstonLoggerAdapter(env: LoggerEnvConfig): LoggerPort {
  const winstonLogger = createWinstonLogger(env);
  return new WinstonLoggerAdapter(winstonLogger);
}
