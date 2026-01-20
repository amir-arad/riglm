import { Router, Request, Response, NextFunction } from "express";
import { ConfigService } from "../../application/config.service";
import { CloseablePool } from "../../etc/closeable";
import { HostsService } from "../../application/hosts.service";
import type { LoggerPort } from "../../ports/logger.port";

type IdRequest = Request<{ id: string }>;
type ServerRequest = Request<{ id: string; server: string }>;

export function makeManagementRoutes(
  configService: ConfigService,
  hostsServices: CloseablePool<HostsService>,
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

  // Session endpoints
  router.get(
    "/sessions",
    asyncHandler(async (_req, res) => {
      const sessions = [];
      for (const endpointId of configService.listEndpoints().map((e) => e.id)) {
        const svc = await hostsServices.get(endpointId);
        sessions.push(...(await svc.listSessions()));
      }
      res.json({ sessions });
    }),
  );

  router.get(
    "/sessions/:id",
    asyncHandler<IdRequest>(async (req, res) => {
      for (const ep of configService.listEndpoints()) {
        const svc = await hostsServices.get(ep.id);
        const info = await svc.getSessionInfo(req.params.id);
        if (info) {
          res.json(info);
          return;
        }
      }
      res.status(404).json({ error: "Session not found" });
    }),
  );

  router.post(
    "/sessions/:id/override/:server",
    asyncHandler<ServerRequest>(async (req, res) => {
      const { enabled } = req.body as { enabled: boolean };
      for (const ep of configService.listEndpoints()) {
        const svc = await hostsServices.get(ep.id);
        if (await svc.setServerOverride(req.params.id, req.params.server, enabled)) {
          res.json({ ok: true });
          return;
        }
      }
      res.status(404).json({ error: "Session not found" });
    }),
  );

  router.delete(
    "/sessions/:id/override/:server",
    asyncHandler<ServerRequest>(async (req, res) => {
      for (const ep of configService.listEndpoints()) {
        const svc = await hostsServices.get(ep.id);
        if (await svc.setServerOverride(req.params.id, req.params.server, null)) {
          res.json({ ok: true });
          return;
        }
      }
      res.status(404).json({ error: "Session not found" });
    }),
  );

  // Endpoint server toggle (persistent)
  router.put(
    "/endpoints/:id/servers/:server/disable",
    asyncHandler<ServerRequest>(async (req, res) => {
      const endpoint = configService.getEndpoint(req.params.id);
      const disabled = new Set(endpoint.disabledServers || []);
      disabled.add(req.params.server);
      configService.updateEndpoint(req.params.id, {
        disabledServers: [...disabled],
      });
      res.json({ ok: true });
    }),
  );

  router.put(
    "/endpoints/:id/servers/:server/enable",
    asyncHandler<ServerRequest>(async (req, res) => {
      const endpoint = configService.getEndpoint(req.params.id);
      const disabled = new Set(endpoint.disabledServers || []);
      disabled.delete(req.params.server);
      configService.updateEndpoint(req.params.id, {
        disabledServers: [...disabled],
      });
      res.json({ ok: true });
    }),
  );

  return router;
}
