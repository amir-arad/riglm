import { Router, Request, Response, NextFunction } from "express";
import { ConfigService } from "../../application/config.service";
import type { LoggerPort } from "../../ports/logger.port";

type IdRequest = Request<{ id: string }>;

export function makeManagementRoutes(
  configService: ConfigService,
  logger: LoggerPort,
): Router {
  const router = Router();

  const asyncHandler =
    <T extends Request>(
      fn: (req: T, res: Response, next: NextFunction) => Promise<void>,
    ) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req as T, res, next)).catch(next);
    };

  router.get(
    "/servers",
    asyncHandler(async (_req, res) => {
      const servers = configService.listServers();
      res.json({ servers });
    }),
  );

  router.get(
    "/servers/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const server = configService.getServer(req.params.id);
      res.json(server);
    }),
  );

  router.post(
    "/servers",
    asyncHandler(async (req, res) => {
      const server = configService.createServer(req.body);
      logger.info(`API: Created server ${server.id}`);
      res.status(201).json(server);
    }),
  );

  router.put(
    "/servers/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const server = configService.updateServer(req.params.id, req.body);
      logger.info(`API: Updated server ${server.id}`);
      res.json(server);
    }),
  );

  router.delete(
    "/servers/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const result = configService.deleteServer(req.params.id);
      logger.info(`API: Deleted server ${req.params.id}`);
      res.json(result);
    }),
  );

  router.get(
    "/endpoints",
    asyncHandler(async (_req, res) => {
      const endpoints = configService.listEndpoints();
      res.json({ endpoints });
    }),
  );

  router.get(
    "/endpoints/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const endpoint = configService.getEndpoint(req.params.id);
      res.json(endpoint);
    }),
  );

  router.post(
    "/endpoints",
    asyncHandler(async (req, res) => {
      const endpoint = configService.createEndpoint(req.body);
      logger.info(`API: Created endpoint ${endpoint.id}`);
      res.status(201).json(endpoint);
    }),
  );

  router.put(
    "/endpoints/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const endpoint = configService.updateEndpoint(req.params.id, req.body);
      logger.info(`API: Updated endpoint ${endpoint.id}`);
      res.json(endpoint);
    }),
  );

  router.delete(
    "/endpoints/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      const result = configService.deleteEndpoint(req.params.id);
      logger.info(`API: Deleted endpoint ${req.params.id}`);
      res.json(result);
    }),
  );

  router.get(
    "/status",
    asyncHandler(async (_req, res) => {
      const status = configService.getStatus();
      res.json(status);
    }),
  );

  router.get(
    "/settings",
    asyncHandler(async (_req, res) => {
      const settings = configService.getSettings();
      res.json(settings);
    }),
  );

  router.put(
    "/settings",
    asyncHandler(async (req, res) => {
      const settings = configService.updateSettings(req.body);
      logger.info("API: Updated global settings");
      res.json(settings);
    }),
  );

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
    }),
  );

  return router;
}
