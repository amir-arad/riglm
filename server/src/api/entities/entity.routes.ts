import { Router } from 'express';
import { EntityController } from './entity.controller';
import { authenticate } from '../../middleware/auth.middleware';
import multer from 'multer';

// Create router
const router = Router();

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
router.get('/:appId/entities/:entityName', authenticate, EntityController.getAll);

/**
 * @route GET /api/apps/:appId/entities/:entityName (with query parameter q)
 * @desc Filter entities
 * @access Private
 */
router.get('/:appId/entities/:entityName', authenticate, EntityController.filter);

/**
 * @route GET /api/apps/:appId/entities/:entityName/:id
 * @desc Get entity by ID
 * @access Private
 */
router.get('/:appId/entities/:entityName/:id', authenticate, EntityController.getById);

/**
 * @route POST /api/apps/:appId/entities/:entityName
 * @desc Create entity
 * @access Private
 */
router.post('/:appId/entities/:entityName', authenticate, EntityController.create);

/**
 * @route PUT /api/apps/:appId/entities/:entityName/:id
 * @desc Update entity
 * @access Private
 */
router.put('/:appId/entities/:entityName/:id', authenticate, EntityController.update);

/**
 * @route DELETE /api/apps/:appId/entities/:entityName/:id
 * @desc Delete entity
 * @access Private
 */
router.delete('/:appId/entities/:entityName/:id', authenticate, EntityController.delete);

/**
 * @route DELETE /api/apps/:appId/entities/:entityName
 * @desc Delete multiple entities
 * @access Private
 */
router.delete('/:appId/entities/:entityName', authenticate, EntityController.deleteMany);

/**
 * @route POST /api/apps/:appId/entities/:entityName/bulk
 * @desc Create multiple entities
 * @access Private
 */
router.post('/:appId/entities/:entityName/bulk', authenticate, EntityController.bulkCreate);

/**
 * @route POST /api/apps/:appId/entities/:entityName/import
 * @desc Import entities from file
 * @access Private
 */
router.post(
  '/:appId/entities/:entityName/import',
  authenticate,
  upload.single('file'),
  EntityController.importEntities
);

export default router;