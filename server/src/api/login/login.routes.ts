import { Router } from 'express';
import { handleOAuthCallback, initiateLogin } from './login.controller';
import { validateLoginRequest } from '../../middleware/validation.middleware';
import passport from 'passport';

// Create router
const router = Router();

/**
 * @route GET /login
 * @desc SSO login endpoint that redirects to authentication and then back to the client
 * @access Public
 * @param {string} from_url - URL-encoded return URL (e.g., http%3A%2F%2Flocalhost%3A5173%2F)
 * @param {string} app_id - Application identifier (e.g., 1234)
 * @example GET /login?from_url=http%3A%2F%2Flocalhost%3A5173%2F&app_id=1234
 */
router.get('/', validateLoginRequest, initiateLogin);

/**
 * @route GET /login/callback
 * @desc OAuth callback endpoint that handles the authentication response
 * @access Public
 */
router.get(
  '/callback',
  passport.authenticate('oauth2', { session: false, failureRedirect: '/login' }),
  handleOAuthCallback
);

export default router;