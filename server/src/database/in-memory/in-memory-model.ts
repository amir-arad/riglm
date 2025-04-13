import { InMemoryDatabase } from "./in-memory-database";
import { IDocument } from "../common/document";
import { ModelProvider } from "../common/model-provider";
import { CollectionLike } from "../common/database-provider";

/**
 * In-memory model class
 * Provides MongoDB-compatible API for in-memory collections
 */
export class InMemoryModel<T extends IDocument> implements ModelProvider<T> {
  private collection: CollectionLike<T>;
  private entityName: string;
  private schema: Record<string, any>;
  private documentFactory: (data: any) => T;

  // Query parameters
  private sortCriteria?: string;
  private limitValue?: number;
  private skipValue?: number;
  private selectedFields?: string[];

  /**
   * Create a new in-memory model
   * @param entityName Entity name
   * @param schema Schema definition
   * @param documentFactory Factory function to create documents
   */
  constructor(
    entityName: string,
    schema: Record<string, any> = {},
    documentFactory?: (data: any) => T
  ) {
    this.entityName = entityName;
    this.schema = schema;
    this.collection =
      InMemoryDatabase.getInstance().getCollection<T>(entityName);
    this.documentFactory = documentFactory || ((data: any) => data as T);
  }

  /**
   * Find documents matching a filter
   * @param filter Filter criteria
   * @returns Matching documents
   */
  async find(filter: Record<string, any> = {}): Promise<T[]> {
    const results: T[] = [];

    for (const document of this.collection.values()) {
      if (this.matchesFilter(document, filter)) {
        results.push(document);
      }
    }

    return this.processQueryResults(results);
  }

  /**
   * Find a document by ID
   * @param id Document ID
   * @returns Document or null if not found
   */
  async findById(id: string): Promise<T | null> {
    return this.collection.get(id) || null;
  }

  /**
   * Find one document matching a filter
   * @param filter Filter criteria
   * @returns Document or null if not found
   */
  async findOne(filter: Record<string, any> = {}): Promise<T | null> {
    for (const document of this.collection.values()) {
      if (this.matchesFilter(document, filter)) {
        return document;
      }
    }

    return null;
  }

  /**
   * Create a new document
   * @param data Document data
   * @returns Created document
   */
  async create(data: Partial<T>): Promise<T> {
    const id =
      data._id || InMemoryDatabase.getInstance().generateId(this.entityName);
    const now = new Date();

    const document = this.documentFactory({
      ...data,
      _id: id,
      createdAt: data.createdAt || now,
      updatedAt: now,
    });

    // Special handling for User model's password hashing
    if (
      "hashPassword" in document &&
      typeof (document as any).hashPassword === "function"
    ) {
      await (document as any).hashPassword();
    }

    this.collection.set(id, document);
    return document;
  }

  /**
   * Find a document by ID and update it
   * @param id Document ID
   * @param update Update data
   * @returns Updated document or null if not found
   */
  async findByIdAndUpdate(
    id: string,
    update: Partial<T>,
    options: { new?: boolean } = {}
  ): Promise<T | null> {
    const document = this.collection.get(id);

    if (!document) {
      return null;
    }

    // Apply updates
    Object.assign(document, { ...update, updatedAt: new Date() });

    // Special handling for User model's password hashing
    if (
      "hashPassword" in document &&
      typeof (document as any).hashPassword === "function"
    ) {
      await (document as any).hashPassword();
    }

    this.collection.set(id, document);
    return document;
  }

  /**
   * Find a document by ID and delete it
   * @param id Document ID
   * @returns Deleted document or null if not found
   */
  async findByIdAndDelete(id: string): Promise<T | null> {
    const document = this.collection.get(id);

    if (!document) {
      return null;
    }

    this.collection.delete(id);
    return document;
  }

  /**
   * Delete multiple documents matching a filter
   * @param filter Filter criteria
   * @returns Number of deleted documents
   */
  async deleteMany(filter: Record<string, any> = {}): Promise<number> {
    let count = 0;

    for (const [id, document] of this.collection.entries()) {
      if (this.matchesFilter(document, filter)) {
        this.collection.delete(id);
        count++;
      }
    }

    return count;
  }

  /**
   * Insert multiple documents
   * @param data Document data
   * @returns Created documents
   */
  async insertMany(data: Partial<T>[]): Promise<T[]> {
    const results: T[] = [];

    for (const item of data) {
      results.push(await this.create(item));
    }

    return results;
  }

  /**
   * Count documents matching a filter
   * @param filter Filter criteria
   * @returns Number of matching documents
   */
  async countDocuments(filter: Record<string, any> = {}): Promise<number> {
    let count = 0;

    for (const document of this.collection.values()) {
      if (this.matchesFilter(document, filter)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Set sort criteria
   * @param criteria Sort criteria
   * @returns This model for chaining
   */
  sort(criteria: string): this {
    this.sortCriteria = criteria;
    return this;
  }

  /**
   * Set limit
   * @param n Maximum number of documents to return
   * @returns This model for chaining
   */
  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  /**
   * Set skip
   * @param n Number of documents to skip
   * @returns This model for chaining
   */
  skip(n: number): this {
    this.skipValue = n;
    return this;
  }

  /**
   * Set fields to select
   * @param fields Fields to select
   * @returns This model for chaining
   */
  select(fields: string): this {
    this.selectedFields = fields.split(/\s+|,/).filter((f) => f.length > 0);
    return this;
  }

  /**
   * Execute query
   * @returns Query results
   */
  async exec(): Promise<T[]> {
    return this.find({});
  }

  /**
   * Check if a document matches a filter
   * @param document Document to check
   * @param filter Filter criteria
   * @returns Whether the document matches the filter
   */
  private matchesFilter(document: T, filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      // Handle special MongoDB operators
      if (key.startsWith("$")) {
        // Not implemented yet
        continue;
      }

      if (document[key as keyof T] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Process query results
   * @param results Results to process
   * @returns Processed results
   */
  private processQueryResults(results: T[]): T[] {
    let processedResults = [...results];

    // Apply sorting
    if (this.sortCriteria) {
      processedResults = this.applySorting(processedResults);
    }

    // Apply skip
    if (this.skipValue && this.skipValue > 0) {
      processedResults = processedResults.slice(this.skipValue);
    }

    // Apply limit
    if (this.limitValue && this.limitValue > 0) {
      processedResults = processedResults.slice(0, this.limitValue);
    }

    // Apply field selection
    if (this.selectedFields && this.selectedFields.length > 0) {
      processedResults = this.applyFieldSelection(processedResults);
    }

    // Reset query parameters for future calls
    this.resetQueryParameters();

    return processedResults;
  }

  /**
   * Apply sorting to results
   * @param results Results to sort
   * @returns Sorted results
   */
  private applySorting(results: T[]): T[] {
    if (!this.sortCriteria) return results;

    const sortFields = this.sortCriteria
      .split(/\s+|,/)
      .filter((f) => f.length > 0);

    return [...results].sort((a, b) => {
      for (const field of sortFields) {
        const desc = field.startsWith("-");
        const fieldName = desc ? field.substring(1) : field;

        if (a[fieldName as keyof T] < b[fieldName as keyof T]) {
          return desc ? 1 : -1;
        }
        if (a[fieldName as keyof T] > b[fieldName as keyof T]) {
          return desc ? -1 : 1;
        }
      }
      return 0;
    });
  }

  /**
   * Apply field selection to results
   * @param results Results to process
   * @returns Processed results
   */
  private applyFieldSelection(results: T[]): T[] {
    if (!this.selectedFields || this.selectedFields.length === 0) {
      return results;
    }

    return results.map((doc) => {
      const selected: Partial<T> = { _id: doc._id } as Partial<T>;

      for (const field of this.selectedFields!) {
        if (field in doc) {
          (selected as any)[field] = doc[field as keyof T];
        }
      }

      return selected as T;
    });
  }

  /**
   * Reset query parameters
   */
  private resetQueryParameters(): void {
    this.sortCriteria = undefined;
    this.limitValue = undefined;
    this.skipValue = undefined;
    this.selectedFields = undefined;
  }
}
