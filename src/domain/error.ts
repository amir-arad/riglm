
export class ApiError extends Error {
  
  statusCode: number;

  
  code?: string;

  
  data?: unknown;

  
  constructor(message: string, statusCode: number, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;

    
    Error.captureStackTrace(this, this.constructor);
  }

  
  static badRequest(message: string, code?: string, data?: unknown): ApiError {
    return new ApiError(message, 400, code, data);
  }

  
  static unauthorized(message: string = 'Unauthorized', code?: string, data?: unknown): ApiError {
    return new ApiError(message, 401, code, data);
  }

  
  static forbidden(message: string = 'Forbidden', code?: string, data?: unknown): ApiError {
    return new ApiError(message, 403, code, data);
  }

  
  static notFound(message: string = 'Not Found', code?: string, data?: unknown): ApiError {
    return new ApiError(message, 404, code, data);
  }

  
  static conflict(message: string, code?: string, data?: unknown): ApiError {
    return new ApiError(message, 409, code, data);
  }

  
  static validation(message: string, code?: string, data?: unknown): ApiError {
    return new ApiError(message, 422, code, data);
  }

  
  static internal(message: string = 'Internal Server Error', code?: string, data?: unknown): ApiError {
    return new ApiError(message, 500, code, data);
  }
}
