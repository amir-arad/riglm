import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { env } from '../../config/env';
import { User, UserRole, UserModel } from '../../models/user.model';
import { generateToken } from '../../services/auth.service';
import { ApiError } from '../../utils/error';
import { appendUrlParameter, isAllowedRedirectUrl } from '../../utils/url';


  /**
   * Initiate the login process
   * Validates the from_url and app_id parameters and redirects to authentication
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  export async function initiateLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from_url, app_id } = req.query;
      
      // Check if the redirect URL is allowed
      const decodedUrl = decodeURIComponent(from_url as string);
      if (!isAllowedRedirectUrl(decodedUrl, env.allowedRedirectDomains)) {
        throw ApiError.badRequest('Invalid redirect URL');
      }
      
      // If OAuth is configured, redirect to OAuth provider
      if (env.oauth.clientId && env.oauth.clientSecret) {
        // Redirect to OAuth authentication with state containing the redirect URL and app ID
        // The state parameter is used to pass data through the OAuth flow
        const state = Buffer.from(
          JSON.stringify({
            redirectUrl: from_url,
            appId: app_id
          })
        ).toString('base64');
        
        passport.authenticate('oauth2', { state })(req, res, next);
      } else {
        // If OAuth is not configured, generate a test token and redirect immediately
        // Create a test user for development/testing purposes using the User model
        const testUser = await UserModel.create({
          _id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        // Generate token for the test user
        const token = generateToken(testUser);
        
        // Decode the URL
        const decodedUrl = decodeURIComponent(from_url as string);
        
        // Append token to redirect URL
        const finalRedirectUrl = appendUrlParameter(decodedUrl, 'access_token', token);
        
        // Redirect to client with token
        res.redirect(finalRedirectUrl);
      }
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Handle the OAuth callback
   * This is called after the user has authenticated with the OAuth provider
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
   export async function handleOAuthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user exists
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      
      // Generate token
      const token = generateToken(req.user);
      
      // Get state from request
      const { state } = req.query;
      
      if (!state || typeof state !== 'string') {
        throw ApiError.badRequest('Invalid state parameter');
      }
      
      // Decode state
      let redirectUrl: string;
      let appId: string;
      
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        redirectUrl = stateData.redirectUrl;
        appId = stateData.appId;
      } catch (error) {
        throw ApiError.badRequest('Invalid state parameter');
      }
      
      // Check if redirect URL exists
      if (!redirectUrl) {
        throw ApiError.badRequest('Missing redirect URL');
      }
      
      // Decode the URL
      const decodedUrl = decodeURIComponent(redirectUrl);
      
      // Check if the redirect URL is allowed
      if (!isAllowedRedirectUrl(decodedUrl, env.allowedRedirectDomains)) {
        throw ApiError.badRequest('Invalid redirect URL');
      }
      
      // Append token to redirect URL
      const finalRedirectUrl = appendUrlParameter(decodedUrl, 'access_token', token);
      
      // Redirect to client with token
      res.redirect(finalRedirectUrl);
    } catch (error) {
      next(error);
    }
  }
  