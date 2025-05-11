import { NextFunction, Request, Response } from "express";
import { ApiError } from "./error";
import { logger } from "./logger";

export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const error = ApiError.notFound(
    `Route not found: ${req.method} ${req.originalUrl}`
  );
  next(error);
}

export const errorHandler =
  (isProduction: boolean) =>
  (err: Error | ApiError, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      logger.error("Attempted to send error response after headers were sent", {
        error: err,
        path: req.path,
        method: req.method,
      });
      return next(err);
    }

    let statusCode = 500;
    let error = err;

    if (!(error instanceof ApiError)) {
      statusCode = 500;
      error = ApiError.internal(
        isProduction ? "Internal Server Error" : error.message
      );
    } else {
      statusCode = error.statusCode;
    }

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

    res.status(statusCode).json({
      status: "error",
      message: error.message,
      code: error instanceof ApiError ? error.code : undefined,
      data: error instanceof ApiError ? error.data : undefined,
      stack: isProduction ? undefined : error.stack,
    });
  };
