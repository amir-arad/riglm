import { Request, Response, Router } from "express";
import { logger } from "../etc/logger";
import { HostsService } from "./hosts.service";
import { Services, ServiceOptions } from "../etc/service";

export function makeHostsRoutes(hostsServices: Services<HostsService>) {
  const hostsRoutes = Router();

  hostsRoutes.param("endpointId", async (req, res, next, endpointId) => {
    try {
      // Create AbortController for param middleware
      const controller = new AbortController();
      res.once("close", () => controller.abort());

      const hostsService = await hostsServices.get(endpointId, {
        signal: controller.signal,
      });
      if (!hostsService) {
        return res.status(404).json({ error: "Endpoint not found" }), void 0;
      }
      (req as EndpointRequest).hostsService = hostsService;
      next();
    } catch (error) {
      next(error);
    }
  });

  hostsRoutes.get("/:endpointId/sse", async (req, res) => {
    try {
      const { hostsService } = req as EndpointRequest;
      const controller = new AbortController();
      const sessionId = await hostsService.createSession(
        `/${hostsService.endpointId}/messages`,
        res,
        { signal: controller.signal }
      );

      res.write(`event: session\ndata: ${JSON.stringify({ sessionId })}\n\n`);
      const messageEndpoint = `/${hostsService.endpointId}/messages/${sessionId}`;
      res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);
      req.on("close", () => {
        logger.info(`SSE connection closed for session: ${sessionId}`);
        controller.abort();
        hostsService.removeSession(sessionId);
      });

      logger.info(`SSE connection established for session: ${sessionId}`);
    } catch (error) {
      logger.error("Error establishing SSE connection:", error);
      res.status(500).end();
    }
  });

  hostsRoutes.post("/:endpointId/messages", async (req, res) => {
    const sessionId = req.headers["x-session-id"] || req.query.sessionId;
    await handleMessage(sessionId, req, res);
  });
  hostsRoutes.post("/:endpointId/messages/:sessionId", async (req, res) => {
    const sessionId = req.params.sessionId;
    await handleMessage(sessionId, req, res);
  });

  hostsRoutes.get("/:endpointId/status", (req, res) => {
    const { hostsService } = req as EndpointRequest;
    res.json({
      ...hostsService.status(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });
  return hostsRoutes;
}

type EndpointRequest = Request<{
  endpointId: string;
  sessionId?: string;
}> & {
  hostsService: HostsService;
};

async function handleMessage(sessionId: unknown, req: Request, res: Response) {
  const { hostsService } = req as EndpointRequest;
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "Session ID is required" }), void 0;
  }
  if (!hostsService.hasSession(sessionId)) {
    return res.status(404).json({ error: "Session not found" }), void 0;
  }
  const session = hostsService.getSession(sessionId);
  if (!session) {
    return (
      res.status(503).json({ error: "Session transport not available" }), void 0
    );
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    logger.error(`Error handling message for session ${sessionId}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
}
