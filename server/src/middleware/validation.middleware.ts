import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/error';
import { isValidUrl } from '../utils/url';

/**
 * Validate login request parameters
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export function validateLoginRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    const { from_url, app_id } = req.query;

    // Check if from_url is provided
    if (!from_url) {
      throw ApiError.badRequest('Missing required parameter: from_url');
    }

    // Check if from_url is a string
    if (typeof from_url !== 'string') {
      throw ApiError.badRequest('Invalid from_url parameter: must be a string');
    }

    // Check if from_url is a valid URL
    try {
      const decodedUrl = decodeURIComponent(from_url);
      if (!isValidUrl(decodedUrl)) {
        throw ApiError.badRequest('Invalid from_url parameter: must be a valid URL');
      }
    } catch (error) {
      throw ApiError.badRequest('Invalid from_url parameter: must be a valid URL-encoded string');
    }

    // Check if app_id is provided
    if (!app_id) {
      throw ApiError.badRequest('Missing required parameter: app_id');
    }

    // Check if app_id is a string or number
    if (typeof app_id !== 'string' && typeof app_id !== 'number') {
      throw ApiError.badRequest('Invalid app_id parameter: must be a string or number');
    }

    // Proceed to next middleware
    next();
  } catch (error) {
    next(error);
  }
}