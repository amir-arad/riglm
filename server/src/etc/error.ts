/**
 * Custom API error class
 */
export class ApiError extends Error {
  /**
   * HTTP status code
   */
  statusCode: number;
  
  /**
   * Error code
   */
  code?: string;
  
  /**
   * Additional error data
   */
  data?: any;
  
  /**
   * Create a new API error
   * @param message Error message
   * @param statusCode HTTP status code
   * @param code Error code
   * @param data Additional error data
   */
  constructor(message: string, statusCode: number, code?: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Create a 400 Bad Request error
   * @param message Error message
   * @param code Error code
   * @param data Additional error data
   * @returns API error
   */
  static badRequest(message: string, code?: string, data?: any): ApiError {
    return new ApiError(message, 400, code, data);
  }
  
  /**
   * Create a 401 Unauthorized error
   * @param message Error message
   * @param code Error code
   * @param data Additional error data
   * @returns API error
   */
  static unauthorized(message: string = 'Unauthorized', code?: string, data?: any): ApiError {
    return new ApiError(message, 401, code, data);
  }
  
  /**
   * Create a 403 Forbidden error
   * @param message Error message
   * @param code Error code
   * @param data Additional error data
   * @returns API error
   */
  static forbidden(message: string = 'Forbidden', code?: string, data?: any): ApiError {
    return new ApiError(message, 403, code, data);
  }
  
  /**
   * Create a 404 Not Found error
   * @param message Error message
   * @param code Error code
   * @param data Additional error data
   * @returns API error
   */
  static notFound(message: string = 'Not Found', code?: string, data?: any): ApiError {
    return new ApiError(message, 404, code, data);
  }
  
  /**
   * Create a 409 Conflict error
   * @param message Error message
   * @param code Error code
   * @param data Additional error data
   * @returns API error
   */
  static conflict(message: string, code?: string, data?: any): ApiError {
    return new ApiError(message, 409, code, data);
  }
  
  /**
   * Create a 422 Unprocessable Entity error
   * @param message Error message
   * @param code Error code
   * @param data Additional error data
   * @returns API error
   */
  static validation(message: string, code?: string, data?: any): ApiError {
    return new ApiError(message, 422, code, data);
  }
  
  /**
   * Create a 500 Internal Server Error
   * @param message Error message
   * @param code Error code
   * @param data Additional error data
   * @returns API error
   */
  static internal(message: string = 'Internal Server Error', code?: string, data?: any): ApiError {
    return new ApiError(message, 500, code, data);
  }
}