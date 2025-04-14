import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { logger } from "../utils/logger";
import { env } from "../config/env";

/**
 * Handle 404 errors
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Create not found error
  const error = ApiError.notFound(
    `Route not found: ${req.method} ${req.originalUrl}`
  );

  // Pass error to error handler
  next(error);
}

/**
 * Handle errors
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Default status code and error
  let statusCode = 500;
  let error = err;

  // If error is not an ApiError, convert it
  if (!(error instanceof ApiError)) {
    statusCode = 500;
    error = ApiError.internal(
      env.isProduction ? "Internal Server Error" : error.message
    );
  } else {
    // Use ApiError status code
    statusCode = error.statusCode;
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${error.message}`, {
      error,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn(`${statusCode} - ${error.message}`, {
      path: req.path,
      method: req.method,
    });
  }

  // Send error response
  res.status(statusCode).json({
    status: "error",
    message: error.message,
    code: error instanceof ApiError ? error.code : undefined,
    data: error instanceof ApiError ? error.data : undefined,
    stack: env.isDevelopment ? error.stack : undefined,
  });
}
