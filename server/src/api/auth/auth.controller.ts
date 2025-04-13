import { Request, Response, NextFunction } from 'express';
import { authenticate, generateToken, register, updateUser } from '../../services/auth.service';
import { ApiError } from '../../utils/error';

/**
 * Authentication controller
 */
export class AuthController {
  /**
   * Login with email and password
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      
      // Validate request
      if (!email || !password) {
        throw ApiError.badRequest('Email and password are required');
      }
      
      // Authenticate user
      const { user, token } = await authenticate(email, password);
      
      // Send response
      res.json({
        status: 'success',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Register a new user
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body;
      
      // Validate request
      if (!email || !password || !name) {
        throw ApiError.badRequest('Email, password, and name are required');
      }
      
      // Register user
      const { user, token } = await register({
        email,
        password,
        name,
      });
      
      // Send response
      res.status(201).json({
        status: 'success',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get current user
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user exists
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      
      // Send response
      res.json({
        status: 'success',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update current user
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user exists
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      
      // Update user
      const user = await updateUser(req.user._id.toString(), req.body);
      
      // Send response
      res.json({
        status: 'success',
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * OAuth callback
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async oauthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user exists
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      
      // Generate token
      const token = generateToken(req.user);
      
      // Redirect to client with token
      const redirectUrl = req.query.redirect_url as string || '/';
      const separator = redirectUrl.includes('?') ? '&' : '?';
      
      res.redirect(`${redirectUrl}${separator}token=${token}`);
    } catch (error) {
      next(error);
    }
  }
}