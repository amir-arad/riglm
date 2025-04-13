import bcrypt from 'bcrypt';
import { Document, IDocument } from '../database/in-memory/document';
import { InMemoryModel } from '../database/in-memory/in-memory-model';

/**
 * User roles
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * User document interface
 */
export interface IUser extends IDocument {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  
  /**
   * Compare password with hashed password
   * @param password Password to compare
   */
  comparePassword(password: string): Promise<boolean>;
  
  /**
   * Hash password
   */
  hashPassword(): Promise<void>;
  
  /**
   * Check if a field has been modified
   * @param field Field name
   */
  isModified(field: string): boolean;
}

/**
 * User class
 */
export class User extends Document implements IUser {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  
  // Track modified fields
  private modifiedFields: Set<string> = new Set();
  
  /**
   * Create a new user
   * @param data User data
   */
  constructor(data: Partial<IUser> = {}) {
    super(data);
    
    this.email = data.email || '';
    this.password = data.password;
    this.name = data.name || '';
    this.role = data.role || UserRole.USER;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.lastLogin = data.lastLogin;
  }
  
  /**
   * Compare password with hashed password
   * @param password Password to compare
   * @returns Whether the password matches
   */
  async comparePassword(password: string): Promise<boolean> {
    // If no password is set, return false
    if (!this.password) {
      return false;
    }
    
    // Compare the provided password with the hashed password
    return bcrypt.compare(password, this.password);
  }
  
  /**
   * Hash password
   */
  async hashPassword(): Promise<void> {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password') || !this.password) {
      return;
    }
    
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password using the salt
    const hash = await bcrypt.hash(this.password, salt);
    
    // Replace the password with the hash
    this.password = hash;
    
    // Clear the modified flag for password
    this.modifiedFields.delete('password');
  }
  
  /**
   * Check if a field has been modified
   * @param field Field name
   * @returns Whether the field has been modified
   */
  isModified(field: string): boolean {
    return this.modifiedFields.has(field);
  }
  
  /**
   * Set a field value and mark it as modified
   * @param field Field name
   * @param value Field value
   */
  set(field: string, value: any): void {
    if ((this as any)[field] !== value) {
      this.modifiedFields.add(field);
      (this as any)[field] = value;
    }
  }
  
  /**
   * Convert user to JSON
   * @returns JSON representation of user
   */
  toJSON(): any {
    const json = super.toJSON();
    
    // Add user-specific fields
    json.email = this.email;
    json.name = this.name;
    json.role = this.role;
    json.isActive = this.isActive;
    json.lastLogin = this.lastLogin;
    
    // Don't include password
    delete json.password;
    
    return json;
  }
}

/**
 * User schema
 */
const userSchema = {
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
};

/**
 * Factory function to create a user
 * @param data User data
 * @returns User instance
 */
function createUser(data: any): User {
  return new User(data);
}

/**
 * User model
 */
export const UserModel = new InMemoryModel<User>('User', userSchema, createUser);