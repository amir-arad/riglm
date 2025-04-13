import { EntityRegistry, IEntity } from '../models/entity.model';
import { ApiError } from '../utils/error';

/**
 * Entity service
 */
export class EntityService {
  /**
   * Get all entities
   * @param entityName Entity name
   * @param sort Sort criteria
   * @param limit Maximum number of entities to return
   * @param skip Number of entities to skip
   * @param fields Fields to include
   * @returns Entities
   */
  static async getAll(
    entityName: string,
    sort?: string,
    limit?: number,
    skip?: number,
    fields?: string
  ): Promise<IEntity[]> {
    // Get entity model
    const model = EntityRegistry.getOrCreate(entityName);
    
    // Build query with chaining
    let query = model;
    
    // Apply sort
    if (sort) {
      query = query.sort(sort);
    }
    
    // Apply pagination
    if (skip) {
      query = query.skip(skip);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    // Apply field selection
    if (fields) {
      query = query.select(fields);
    }
    
    // Execute query
    return query.exec();
  }
  
  /**
   * Filter entities
   * @param entityName Entity name
   * @param filter Filter criteria
   * @param sort Sort criteria
   * @param limit Maximum number of entities to return
   * @param skip Number of entities to skip
   * @param fields Fields to include
   * @returns Filtered entities
   */
  static async filter(
    entityName: string,
    filter: Record<string, any>,
    sort?: string,
    limit?: number,
    skip?: number,
    fields?: string
  ): Promise<IEntity[]> {
    // Get entity model
    const model = EntityRegistry.getOrCreate(entityName);
    
    // Execute find with filter first
    const results = await model.find(filter);
    
    // If no additional processing is needed, return results
    if (!sort && !limit && !skip && !fields) {
      return results;
    }
    
    // Otherwise, apply additional processing
    let processedResults = [...results];
    
    // Apply sort
    if (sort) {
      // Simple sort implementation
      const sortFields = sort.split(/\s+|,/).filter(f => f.length > 0);
      
      processedResults.sort((a, b) => {
        for (const field of sortFields) {
          const desc = field.startsWith('-');
          const fieldName = desc ? field.substring(1) : field;
          
          if (a[fieldName] < b[fieldName]) {
            return desc ? 1 : -1;
          }
          if (a[fieldName] > b[fieldName]) {
            return desc ? -1 : 1;
          }
        }
        return 0;
      });
    }
    
    // Apply skip
    if (skip) {
      processedResults = processedResults.slice(skip);
    }
    
    // Apply limit
    if (limit) {
      processedResults = processedResults.slice(0, limit);
    }
    
    // Apply field selection
    if (fields) {
      const selectedFields = fields.split(/\s+|,/).filter(f => f.length > 0);
      
      processedResults = processedResults.map(doc => {
        const selected: Partial<IEntity> = { _id: doc._id };
        
        for (const field of selectedFields) {
          if (field in doc) {
            (selected as any)[field] = doc[field];
          }
        }
        
        return selected as IEntity;
      });
    }
    
    return processedResults;
  }
  
  /**
   * Get entity by ID
   * @param entityName Entity name
   * @param id Entity ID
   * @returns Entity
   */
  static async getById(entityName: string, id: string): Promise<IEntity> {
    // Get entity model
    const model = EntityRegistry.getOrCreate(entityName);
    
    // Find entity by ID
    const entity = await model.findById(id);
    
    // Check if entity exists
    if (!entity) {
      throw ApiError.notFound(`${entityName} not found`);
    }
    
    return entity;
  }
  
  /**
   * Create entity
   * @param entityName Entity name
   * @param data Entity data
   * @returns Created entity
   */
  static async create(entityName: string, data: Record<string, any>): Promise<IEntity> {
    // Get entity model
    const model = EntityRegistry.getOrCreate(entityName);
    
    // Create entity
    return model.create(data);
  }
  
  /**
   * Update entity
   * @param entityName Entity name
   * @param id Entity ID
   * @param data Entity data
   * @returns Updated entity
   */
  static async update(entityName: string, id: string, data: Record<string, any>): Promise<IEntity> {
    // Get entity model
    const model = EntityRegistry.getOrCreate(entityName);
    
    // Find and update entity
    const entity = await model.findByIdAndUpdate(id, data, { new: true });
    
    // Check if entity exists
    if (!entity) {
      throw ApiError.notFound(`${entityName} not found`);
    }
    
    return entity;
  }
  
  /**
   * Delete entity
   * @param entityName Entity name
   * @param id Entity ID
   */
  static async delete(entityName: string, id: string): Promise<void> {
    // Get entity model
    const model = EntityRegistry.getOrCreate(entityName);
    
    // Find and delete entity
    const result = await model.findByIdAndDelete(id);
    
    // Check if entity exists
    if (!result) {
      throw ApiError.notFound(`${entityName} not found`);
    }
  }
  
  /**
   * Delete multiple entities
   * @param entityName Entity name
   * @param filter Filter criteria
   */
  static async deleteMany(entityName: string, filter: Record<string, any>): Promise<void> {
    // Get entity model
    const model = EntityRegistry.getOrCreate(entityName);
    
    // Delete entities
    await model.deleteMany(filter);
  }
  
  /**
   * Create multiple entities
   * @param entityName Entity name
   * @param data Entity data
   * @returns Created entities
   */
  static async bulkCreate(entityName: string, data: Record<string, any>[]): Promise<IEntity[]> {
    // Get entity model
    const model = EntityRegistry.getOrCreate(entityName);
    
    // Create entities
    return model.insertMany(data);
  }
}