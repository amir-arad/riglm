/**
 * This file contains examples of how to use the in-memory database.
 * It is not meant to be executed directly, but rather to serve as documentation.
 */

import { InMemoryDatabase } from './in-memory-database';
import { InMemoryModel } from './in-memory-model';
import { Document, IDocument } from './document';
import { EntityRegistry } from '../../models/entity.model';
import { UserModel, User, UserRole } from '../../models/user.model';

/**
 * Example: Basic usage
 */
async function basicUsageExample(): Promise<void> {
  // Get the database instance
  const db = InMemoryDatabase.getInstance();
  
  // Get a collection
  const userCollection = db.getCollection<User>('User');
  
  // Add a document to the collection
  const userId = db.generateId('User');
  const user = new User({
    _id: userId,
    email: 'example@example.com',
    name: 'Example User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  userCollection.set(userId, user);
  
  // Get a document from the collection
  const retrievedUser = userCollection.get(userId);
  console.log(retrievedUser);
  
  // Update a document in the collection
  if (retrievedUser) {
    retrievedUser.name = 'Updated User';
    retrievedUser.touch(); // Update the updatedAt timestamp
    userCollection.set(userId, retrievedUser);
  }
  
  // Delete a document from the collection
  userCollection.delete(userId);
  
  // Clear all data
  db.clearAll();
}

/**
 * Example: Using models
 */
async function modelUsageExample(): Promise<void> {
  // Create a model
  interface IProduct extends IDocument {
    name: string;
    price: number;
    description?: string;
  }
  
  class Product extends Document implements IProduct {
    name: string;
    price: number;
    description?: string;
    
    constructor(data: Partial<IProduct> = {}) {
      super(data);
      this.name = data.name || '';
      this.price = data.price || 0;
      this.description = data.description;
    }
  }
  
  const productFactory = (data: any): Product => new Product(data);
  const ProductModel = new InMemoryModel<Product>('Product', {}, productFactory);
  
  // Create a product
  const product = await ProductModel.create({
    name: 'Example Product',
    price: 19.99,
    description: 'This is an example product'
  });
  
  console.log(product);
  
  // Find products
  const products = await ProductModel.find({ price: 19.99 });
  console.log(products);
  
  // Update a product
  const updatedProduct = await ProductModel.findByIdAndUpdate(product._id, {
    price: 29.99
  });
  
  console.log(updatedProduct);
  
  // Delete a product
  await ProductModel.findByIdAndDelete(product._id);
  
  // Query with sorting, pagination, and field selection
  const queryResults = await ProductModel
    .sort('-price') // Sort by price descending
    .skip(0)        // Skip 0 documents
    .limit(10)      // Limit to 10 documents
    .select('name price') // Select only name and price fields
    .exec();
  
  console.log(queryResults);
}

/**
 * Example: Using the entity registry
 */
async function entityRegistryExample(): Promise<void> {
  // Get or create an entity model
  const ProductModel = EntityRegistry.getOrCreate('Product');
  
  // Create a product
  const product = await ProductModel.create({
    name: 'Example Product',
    price: 19.99,
    description: 'This is an example product'
  });
  
  console.log(product);
  
  // Check if an entity model exists
  const exists = EntityRegistry.exists('Product');
  console.log(`Product model exists: ${exists}`);
  
  // Get all registered entity models
  const registry = EntityRegistry.getAll();
  console.log(`Number of registered models: ${registry.size}`);
}

/**
 * Example: Using the user model
 */
async function userModelExample(): Promise<void> {
  // Create a user
  const user = await UserModel.create({
    email: 'example@example.com',
    password: 'password123', // Will be automatically hashed
    name: 'Example User',
    role: UserRole.USER,
    isActive: true
  });
  
  console.log(user);
  
  // Find a user by email
  const foundUser = await UserModel.findOne({ email: 'example@example.com' });
  
  if (foundUser) {
    // Compare password
    const isMatch = await foundUser.comparePassword('password123');
    console.log(`Password matches: ${isMatch}`);
    
    // Update user
    foundUser.set('name', 'Updated User');
    await foundUser.hashPassword(); // Not needed here since password wasn't changed
    
    // Save user
    await UserModel.findByIdAndUpdate(foundUser._id, foundUser);
  }
}

/**
 * Example: Advanced queries
 */
async function advancedQueriesExample(): Promise<void> {
  // Create some products
  await UserModel.create({
    email: 'user1@example.com',
    name: 'User 1',
    role: UserRole.USER,
    isActive: true
  });
  
  await UserModel.create({
    email: 'user2@example.com',
    name: 'User 2',
    role: UserRole.USER,
    isActive: false
  });
  
  await UserModel.create({
    email: 'admin@example.com',
    name: 'Admin User',
    role: UserRole.ADMIN,
    isActive: true
  });
  
  // Find active users
  const activeUsers = await UserModel.find({ isActive: true });
  console.log(`Active users: ${activeUsers.length}`);
  
  // Find active users with role USER
  const activeRegularUsers = await UserModel.find({ isActive: true, role: UserRole.USER });
  console.log(`Active regular users: ${activeRegularUsers.length}`);
  
  // Find users with custom filtering
  const customFilteredUsers = await UserModel.find();
  const filteredUsers = customFilteredUsers.filter(user => 
    user.email.includes('example.com') && user.name.startsWith('User')
  );
  console.log(`Filtered users: ${filteredUsers.length}`);
}