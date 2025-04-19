import { Request, Response, NextFunction } from "express";
import * as entityModel from "./entity.model";
import { ApiError } from "../etc/error";
import { Router, json } from "express";
import multer from "multer";
// Create router
export const entitiesRoutes = Router();

entitiesRoutes.use(json());
// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * @route GET /api/apps/:appId/entities/:entityName
 * @desc Get all entities
 * @access Private
 */
entitiesRoutes.get("/:appId/entities/:entityName", getAll);

/**
 * @route GET /api/apps/:appId/entities/:entityName (with query parameter q)
 * @desc Filter entities
 * @access Private
 */
entitiesRoutes.get("/:appId/entities/:entityName", filter);

/**
 * @route GET /api/apps/:appId/entities/:entityName/:id
 * @desc Get entity by ID
 * @access Private
 */
entitiesRoutes.get("/:appId/entities/:entityName/:id", getById);

/**
 * @route POST /api/apps/:appId/entities/:entityName
 * @desc Create entity
 * @access Private
 */
entitiesRoutes.post("/:appId/entities/:entityName", create);

/**
 * @route PUT /api/apps/:appId/entities/:entityName/:id
 * @desc Update entity
 * @access Private
 */
entitiesRoutes.put("/:appId/entities/:entityName/:id", update);

/**
 * @route DELETE /api/apps/:appId/entities/:entityName/:id
 * @desc Delete entity
 * @access Private
 */
entitiesRoutes.delete("/:appId/entities/:entityName/:id", deleteEntity);

/**
 * @route DELETE /api/apps/:appId/entities/:entityName
 * @desc Delete multiple entities
 * @access Private
 */
entitiesRoutes.delete("/:appId/entities/:entityName", deleteMany);

/**
 * @route POST /api/apps/:appId/entities/:entityName/bulk
 * @desc Create multiple entities
 * @access Private
 */
entitiesRoutes.post("/:appId/entities/:entityName/bulk", bulkCreate);

/**
 * @route POST /api/apps/:appId/entities/:entityName/import
 * @desc Import entities from file
 * @access Private
 */
entitiesRoutes.post(
  "/:appId/entities/:entityName/import",
  upload.single("file"),
  importEntities
);

/**
 * Get all entities
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { entityName } = req.params;
    const { sort, limit, skip, fields } = req.query;

    // Get entities
    const entities = await entityModel.getAll(
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
async function filter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { entityName } = req.params;
    const { sort, limit, skip, fields, q } = req.query;

    // Parse filter query
    let filter: Record<string, any> = {};
    if (q) {
      try {
        filter = JSON.parse(q as string);
      } catch (error) {
        throw ApiError.badRequest("Invalid filter query");
      }
    }

    // Get entities
    const entities = await entityModel.filter(
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
async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { entityName, id } = req.params;

    // Get entity
    const entity = await entityModel.getById(entityName, id);

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
async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { entityName } = req.params;

    // Create entity
    const entity = await entityModel.create(entityName, req.body);

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
async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { entityName, id } = req.params;

    // Update entity
    const entity = await entityModel.update(entityName, id, req.body);

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
async function deleteEntity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { entityName, id } = req.params;

    // Delete entity
    await entityModel.deleteEntities(entityName, id);

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
async function deleteMany(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { entityName } = req.params;

    // Delete entities
    await entityModel.deleteMany(entityName, req.body);

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
async function bulkCreate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { entityName } = req.params;

    // Validate request
    if (!Array.isArray(req.body)) {
      throw ApiError.badRequest("Request body must be an array");
    }

    // Create entities
    const entities = await entityModel.bulkCreate(entityName, req.body);

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
async function importEntities(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if file exists
    if (!req.file) {
      throw ApiError.badRequest("No file uploaded");
    }

    throw new Error("Not implemented");
  } catch (error) {
    next(error);
  }
}
