/**
 * Management Routes - REST API for configuration management
 * Handles CRUD operations for servers, endpoints, and settings.
 */

import { Router, Request, Response, NextFunction } from "express";
import { ConfigService } from "../../application/config.service";
import type { LoggerPort } from "../../ports/logger.port";

// Type for requests with :id parameter
type IdRequest = Request<{ id: string }>;

/**
 * Create management routes for the REST API
 * @param configService Service for config CRUD operations
 * @param logger Logger instance
 */
export function makeManagementRoutes(
  configService: ConfigService,
  logger: LoggerPort
): Router {
  const router = Router();

  // Async handler wrapper to catch errors
  const asyncHandler =
    <T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req as T, res, next)).catch(next);
    };

  // --------------------------------------------------------------------------
  // Servers
  // --------------------------------------------------------------------------

  /**
   * GET /api/servers - List all servers
   */
  router.get(
    "/servers",
    asyncHandler(async (_req, res) => {
      const servers = configService.listServers();
      res.json({ servers });
    })
  );

  /**
   * GET /api/servers/:id - Get a single server
   */
  router.get(
    "/servers/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const server = configService.getServer(req.params.id);
      res.json(server);
    })
  );

  /**
   * POST /api/servers - Create a new server
   */
  router.post(
    "/servers",
    asyncHandler(async (req, res) => {
      const server = configService.createServer(req.body);
      logger.info(`API: Created server ${server.id}`);
      res.status(201).json(server);
    })
  );

  /**
   * PUT /api/servers/:id - Update an existing server
   */
  router.put(
    "/servers/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const server = configService.updateServer(req.params.id, req.body);
      logger.info(`API: Updated server ${server.id}`);
      res.json(server);
    })
  );

  /**
   * DELETE /api/servers/:id - Delete a server
   */
  router.delete(
    "/servers/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const result = configService.deleteServer(req.params.id);
      logger.info(`API: Deleted server ${req.params.id}`);
      res.json(result);
    })
  );

  // --------------------------------------------------------------------------
  // Endpoints
  // --------------------------------------------------------------------------

  /**
   * GET /api/endpoints - List all endpoints
   */
  router.get(
    "/endpoints",
    asyncHandler(async (_req, res) => {
      const endpoints = configService.listEndpoints();
      res.json({ endpoints });
    })
  );

  /**
   * GET /api/endpoints/:id - Get a single endpoint
   */
  router.get(
    "/endpoints/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const endpoint = configService.getEndpoint(req.params.id);
      res.json(endpoint);
    })
  );

  /**
   * POST /api/endpoints - Create a new endpoint
   */
  router.post(
    "/endpoints",
    asyncHandler(async (req, res) => {
      const endpoint = configService.createEndpoint(req.body);
      logger.info(`API: Created endpoint ${endpoint.id}`);
      res.status(201).json(endpoint);
    })
  );

  /**
   * PUT /api/endpoints/:id - Update an existing endpoint
   */
  router.put(
    "/endpoints/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const endpoint = configService.updateEndpoint(req.params.id, req.body);
      logger.info(`API: Updated endpoint ${endpoint.id}`);
      res.json(endpoint);
    })
  );

  /**
   * DELETE /api/endpoints/:id - Delete an endpoint
   */
  router.delete(
    "/endpoints/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const result = configService.deleteEndpoint(req.params.id);
      logger.info(`API: Deleted endpoint ${req.params.id}`);
      res.json(result);
    })
  );

  // --------------------------------------------------------------------------
  // Status
  // --------------------------------------------------------------------------

  /**
   * GET /api/status - Get server status
   */
  router.get(
    "/status",
    asyncHandler(async (_req, res) => {
      const status = configService.getStatus();
      res.json(status);
    })
  );

  // --------------------------------------------------------------------------
  // Settings
  // --------------------------------------------------------------------------

  /**
   * GET /api/settings - Get global settings
   */
  router.get(
    "/settings",
    asyncHandler(async (_req, res) => {
      const settings = configService.getSettings();
      res.json(settings);
    })
  );

  /**
   * PUT /api/settings - Update global settings
   */
  router.put(
    "/settings",
    asyncHandler(async (req, res) => {
      const settings = configService.updateSettings(req.body);
      logger.info("API: Updated global settings");
      res.json(settings);
    })
  );

  // --------------------------------------------------------------------------
  // Config
  // --------------------------------------------------------------------------

  /**
   * POST /api/config/reload - Reload configuration from file
   */
  router.post(
    "/config/reload",
    asyncHandler(async (_req, res) => {
      const success = configService.reloadConfig();
      if (success) {
        logger.info("API: Configuration reloaded");
        res.json({ status: "ok", message: "Configuration reloaded" });
      } else {
        res.status(500).json({
          status: "error",
          message: "Failed to reload configuration",
        });
      }
    })
  );

  return router;
}
