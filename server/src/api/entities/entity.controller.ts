import { Request, Response, NextFunction } from 'express';
import { EntityService } from '../../services/entity.service';
import { ApiError } from '../../utils/error';

/**
 * Entity controller
 */
export class EntityController {
  /**
   * Get all entities
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityName } = req.params;
      const { sort, limit, skip, fields } = req.query;
      
      // Get entities
      const entities = await EntityService.getAll(
        entityName,
        sort as string,
        limit ? parseInt(limit as string, 10) : undefined,
        skip ? parseInt(skip as string, 10) : undefined,
        fields as string
      );
      
      // Send response
      res.json(entities);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Filter entities
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async filter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityName } = req.params;
      const { sort, limit, skip, fields, q } = req.query;
      
      // Parse filter query
      let filter: Record<string, any> = {};
      if (q) {
        try {
          filter = JSON.parse(q as string);
        } catch (error) {
          throw ApiError.badRequest('Invalid filter query');
        }
      }
      
      // Get entities
      const entities = await EntityService.filter(
        entityName,
        filter,
        sort as string,
        limit ? parseInt(limit as string, 10) : undefined,
        skip ? parseInt(skip as string, 10) : undefined,
        fields as string
      );
      
      // Send response
      res.json(entities);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get entity by ID
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityName, id } = req.params;
      
      // Get entity
      const entity = await EntityService.getById(entityName, id);
      
      // Send response
      res.json(entity);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Create entity
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityName } = req.params;
      
      // Create entity
      const entity = await EntityService.create(entityName, req.body);
      
      // Send response
      res.status(201).json(entity);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update entity
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityName, id } = req.params;
      
      // Update entity
      const entity = await EntityService.update(entityName, id, req.body);
      
      // Send response
      res.json(entity);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete entity
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityName, id } = req.params;
      
      // Delete entity
      await EntityService.delete(entityName, id);
      
      // Send response
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete multiple entities
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async deleteMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityName } = req.params;
      
      // Delete entities
      await EntityService.deleteMany(entityName, req.body);
      
      // Send response
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Create multiple entities
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async bulkCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityName } = req.params;
      
      // Validate request
      if (!Array.isArray(req.body)) {
        throw ApiError.badRequest('Request body must be an array');
      }
      
      // Create entities
      const entities = await EntityService.bulkCreate(entityName, req.body);
      
      // Send response
      res.status(201).json(entities);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Import entities from file
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async importEntities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if file exists
      if (!req.file) {
        throw ApiError.badRequest('No file uploaded');
      }
      
      throw new Error('Not implemented');
      
    } catch (error) {
      next(error);
    }
  }
}