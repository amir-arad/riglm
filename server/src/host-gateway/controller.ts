import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response, Router } from "express";
import { ApiError } from "../etc/error";
import { logger } from "../etc/logger";
import { Services } from "../etc/service";
import { HostsService } from "./hosts.service";

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
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Endpoint not found");
        return;
      }
      (req as EndpointRequest).hostsService = hostsService;
      next();
    } catch (error) {
      next(error);
    }
  });

  hostsRoutes.get("/:endpointId/sse", async (req, res) => {
    try {
      const request = req as EndpointRequest;
      if (!request.hostsService) {
        res.status(404).json({ error: "Endpoint not found" });
        return;
      }
      const controller = new AbortController();
      const sessionId = await request.hostsService.createSession(
        new SSEServerTransport(
          `/${request.hostsService.endpointId}/messages`,
          res
        ),
        { signal: controller.signal }
      );

      res.write(`event: session\ndata: ${JSON.stringify({ sessionId })}\n\n`);
      const messageEndpoint = `/${request.hostsService.endpointId}/messages/${sessionId}`;
      res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);
      req.on("close", () => {
        logger.info(`SSE connection closed for session: ${sessionId}`);
        controller.abort();
        request.hostsService.removeSession(sessionId);
      });

      logger.info(`SSE connection established for session: ${sessionId}`);
    } catch (error) {
      logger.error("Error establishing SSE connection:", error);
      if (!res.headersSent && !res.writableEnded) {
        if (error instanceof ApiError) {
          res.writeHead(error.statusCode, { "Content-Type": "text/plain" });
          res.end(error.message);
        } else {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal server error");
        }
      }
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
