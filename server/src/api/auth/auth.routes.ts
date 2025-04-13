import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, updateLastLogin } from '../../middleware/auth.middleware';
import passport from 'passport';

export const meRoutes = Router();

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
meRoutes.get('/', authenticate, updateLastLogin, AuthController.me);

/**
 * @route PUT /api/auth/me
 * @desc Update current user
 * @access Private
 */
meRoutes.put('/', authenticate, AuthController.updateMe);

export const authRoutes = Router();

authRoutes.use('/me', meRoutes);
/**
 * @route POST /api/auth/login
 * @desc Login with email and password
 * @access Public
 */
authRoutes.post('/login', AuthController.login);

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
authRoutes.post('/register', AuthController.register);

/**
 * @route GET /api/auth/oauth
 * @desc Redirect to OAuth provider
 * @access Public
 */
authRoutes.get(
  '/oauth',
  (req, res, next) => {
    // Get redirect URL from query
    const redirectUrl = req.query.redirect_url as string;
    
    // Store redirect URL in session
    if (redirectUrl) {
      req.session = req.session || {};
      req.session.redirectUrl = redirectUrl;
    }
    
    next();
  },
  passport.authenticate('oauth2')
);

/**
 * @route GET /api/auth/callback
 * @desc OAuth callback
 * @access Public
 */
authRoutes.get(
  '/callback',
  passport.authenticate('oauth2', { session: false, failureRedirect: '/login' }),
  (req, res, next) => {
    // Get redirect URL from session
    const redirectUrl = req.session?.redirectUrl || '/';
    
    // Add redirect URL to query
    req.query.redirect_url = redirectUrl;
    
    // Clear session
    if (req.session) {
      delete req.session.redirectUrl;
    }
    
    next();
  },
  AuthController.oauthCallback
);