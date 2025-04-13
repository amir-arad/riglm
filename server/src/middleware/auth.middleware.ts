import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { IUser, UserModel, UserRole } from '../models/user.model';
import { env } from '../config/env';
import { ApiError } from '../utils/error';

/**
 * JWT payload interface
 */
interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

class ApiKeyStrategy extends passport.Strategy {
  readonly name = 'api_key';

  constructor(private readonly apiKey: string) {
    super();
  }
  private async onApiKey(apiKey: string) {
    const id = 'api-user-' + apiKey;
    const existingUser = await UserModel.findById(id);
    if (existingUser) {
      return this.success(existingUser);
    }
    const user = await UserModel.create({
      _id: id,
      email: 'api@example.com',
      name: 'API User',
      role: UserRole.USER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return this.success(user);
  }
  authenticate(req: Request) {
    const apiKey = req.headers['api_key'] as string;
    if (apiKey?.trim() === this.apiKey.trim()) {
      return this.onApiKey(apiKey);
    }
    return this.fail('API key not found');
  }
}
/**
 * Configure passport with JWT strategy
 */
export function configurePassport(apiKey: string): void {
  passport.use(new ApiKeyStrategy(apiKey));
  // Configure JWT strategy
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: env.jwt.secret,
      },
      async (payload: JwtPayload, done) => {
        try {
          // Find user by ID
          const user = await UserModel.findById(payload.sub);

          // If user not found or not active, return error
          if (!user || !user.isActive) {
            return done(null, false);
          }

          // Return user
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
}

/**
 * Authenticate user with JWT
 */
export const authenticate = passport.authenticate(['jwt', 'api_key'], { assignProperty: 'user', session: false });
// api_key

/**
 * Extend Express Request interface to include user
 */
declare global {
  namespace Express {
    interface User extends IUser { }
  }
}

/**
 * Check if user has required role
 * @param roles Required roles
 * @returns Express middleware
 */
export function authorize(roles: string | string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user exists
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    // Convert roles to array
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    // Check if user has required role
    if (requiredRoles.length > 0 && !requiredRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    // User has required role, proceed
    next();
  };
}

/**
 * Update user's last login time
 */
export function updateLastLogin(req: Request, res: Response, next: NextFunction): void {
  // Check if user exists
  if (req.user) {
    // Update last login time
    UserModel.findByIdAndUpdate(req.user._id, { lastLogin: new Date() });
  }

  // Proceed
  next();
}