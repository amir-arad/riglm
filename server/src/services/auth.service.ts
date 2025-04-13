import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { IUser, User, UserRole } from '../models/user.model';
import { ApiError } from '../utils/error';

  /**
   * Generate JWT token for user
   * @param user User
   * @returns JWT token
   */
  export function generateToken(user: IUser): string {
    // Create payload
    const payload = {
      sub: user._id,
      role: user.role,
    };
    
    // Generate token
    return jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });
  }
  
  /**
   * Authenticate user with email and password
   * @param email User email
   * @param password User password
   * @returns User and token
   */
  export async function authenticate(email: string, password: string): Promise<{ user: IUser; token: string }> {
    // Find user by email with password
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    
    // Check if user is active
    if (!user.isActive) {
      throw ApiError.forbidden('User account is disabled');
    }
    
    // Check if password is set
    if (!user.password) {
      throw ApiError.unauthorized('Password authentication not available for this user');
    }
    
    // Check if password is correct
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    
    // Generate token
    const token = this.generateToken(user);
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Remove password from user object
    user.password = undefined;
    
    return { user, token };
  }
  
  /**
   * Register a new user
   * @param userData User data
   * @returns User and token
   */
  export async function register(userData: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
  }): Promise<{ user: IUser; token: string }> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw ApiError.conflict('Email already in use');
    }
    
    // Create user
    const user = await User.create({
      email: userData.email,
      password: userData.password,
      name: userData.name,
      role: userData.role || UserRole.USER,
    });
    
    // Generate token
    const token = this.generateToken(user);
    
    // Remove password from user object
    user.password = undefined;
    
    return { user, token };
  }
  
  /**
   * Get user by ID
   * @param userId User ID
   * @returns User
   */
  export async function getUserById(userId: string): Promise<IUser> {
    // Find user by ID
    const user = await User.findById(userId);
    
    // Check if user exists
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    
    return user;
  }
  
  /**
   * Update user
   * @param userId User ID
   * @param userData User data
   * @returns Updated user
   */
  export async function updateUser(userId: string, userData: Partial<IUser>): Promise<IUser> {
    // Find user by ID
    const user = await User.findById(userId);
    
    // Check if user exists
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    
    // Update user
    Object.assign(user, userData);
    
    // Save user
    await user.save();
    
    return user;
  }