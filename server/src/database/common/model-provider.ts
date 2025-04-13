import { IDocument } from "./document";

/**
 * Model provider interface
 * Defines common methods for all model implementations
 */
export interface ModelProvider<T extends IDocument> {
  /**
   * Find documents matching a filter
   * @param filter Filter criteria
   * @returns Matching documents
   */
  find(filter?: Record<string, any>): Promise<T[]>;

  /**
   * Find a document by ID
   * @param id Document ID
   * @returns Document or null if not found
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find one document matching a filter
   * @param filter Filter criteria
   * @returns Document or null if not found
   */
  findOne(filter?: Record<string, any>): Promise<T | null>;

  /**
   * Create a new document
   * @param data Document data
   * @returns Created document
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Find a document by ID and update it
   * @param id Document ID
   * @param update Update data
   * @param options Update options
   * @returns Updated document or null if not found
   */
  findByIdAndUpdate(
    id: string,
    update: Partial<T>,
    options?: { new?: boolean }
  ): Promise<T | null>;

  /**
   * Find a document by ID and delete it
   * @param id Document ID
   * @returns Deleted document or null if not found
   */
  findByIdAndDelete(id: string): Promise<T | null>;

  /**
   * Delete multiple documents matching a filter
   * @param filter Filter criteria
   * @returns Number of deleted documents
   */
  deleteMany(filter?: Record<string, any>): Promise<number>;

  /**
   * Insert multiple documents
   * @param data Document data
   * @returns Created documents
   */
  insertMany(data: Partial<T>[]): Promise<T[]>;

  /**
   * Count documents matching a filter
   * @param filter Filter criteria
   * @returns Number of matching documents
   */
  countDocuments(filter?: Record<string, any>): Promise<number>;

  /**
   * Set sort criteria
   * @param criteria Sort criteria
   * @returns This model for chaining
   */
  sort(criteria: string): this;

  /**
   * Set limit
   * @param n Maximum number of documents to return
   * @returns This model for chaining
   */
  limit(n: number): this;

  /**
   * Set skip
   * @param n Number of documents to skip
   * @returns This model for chaining
   */
  skip(n: number): this;

  /**
   * Set fields to select
   * @param fields Fields to select
   * @returns This model for chaining
   */
  select(fields: string): this;

  /**
   * Execute query
   * @returns Query results
   */
  exec(): Promise<T[]>;
}
