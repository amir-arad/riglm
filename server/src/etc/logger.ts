import winston from "winston";
import { Arguments } from "./env";

export let logger = winston.createLogger({ silent: true });
export const makeDefaultLogger = (env: Arguments) => {
  logger = makeLogger(env);
  return logger;
};
export const makeLogger = (env: {
  logLevel: string;
  isProduction: boolean;
}) => {
  const logger = winston.createLogger({
    level: env.logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: "longTime" }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: "ROOT" },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(
            ({ timestamp, level, message, service, ...meta }) => {
              const metaString = Object.keys(meta).length
                ? JSON.stringify(meta, null, 2)
                : "";
              return `${service}|${level} ${timestamp}: ${message} ${metaString}`;
            }
          )
        ),
      }),
    ],
  });

  if (env.isProduction) {
    logger.add(
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
      })
    );
    logger.add(new winston.transports.File({ filename: "logs/combined.log" }));
  }

  return logger;
};
