import {
  HttpServerTransportPort,
  ServerTransportFactory,
} from "../../ports/transport.port";
import { Request, Response, Router } from "express";

import { ApiError } from "../../domain/error";
import { CloseablePool } from "../../etc/closeable";
import { HostsService } from "../../application/hosts.service";
import type { LoggerPort } from "../../ports/logger.port";
import { SseServerTransportAdapter } from "../mcp/transports/sse-server.adapter";

export function makeHostsRoutes(
  hostsServices: CloseablePool<HostsService>,
  serverTransportFactory: ServerTransportFactory,
  logger: LoggerPort,
) {
  const hostsRoutes = Router();

  hostsRoutes.param("endpointId", async (req, res, next, endpointId) => {
    try {
      const hostsService = await hostsServices.get(endpointId, {});
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
      const transport = new SseServerTransportAdapter(
        `/${request.hostsService.endpointId}/messages`,
        res,
      );
      const sessionId = await request.hostsService.createSession(transport, {
        signal: controller.signal,
      });

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
    await handleMessage(sessionId, req, res, logger);
  });
  hostsRoutes.post("/:endpointId/messages/:sessionId", async (req, res) => {
    const sessionId = req.params.sessionId;
    await handleMessage(sessionId, req, res, logger);
  });

  hostsRoutes.all("/:endpointId/mcp", async (req, res): Promise<void> => {
    try {
      const request = req as EndpointRequest;
      if (!request.hostsService) {
        res.status(404).json({ error: "Endpoint not found" });
        return;
      }

      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId) {
        if (!request.hostsService.hasSession(sessionId)) {
          res.status(404).json({ error: "Session not found" });
          return;
        }

        const session = request.hostsService.getSession(sessionId);
        if (!session?.transport || !isHttpServerTransport(session.transport)) {
          res.status(400).json({ error: "Invalid transport type for session" });
          return;
        }

        await session.transport.handleRequest(req, res, req.body);
        return;
      }

      if (req.method !== "POST") {
        res
          .status(400)
          .json({ error: "New sessions require POST with initialize request" });
        return;
      }

      const transport = serverTransportFactory({});

      await request.hostsService.createSession(transport, {});
      await transport.handleRequest(req, res, req.body);
      logger.info("HTTP session created:", { sessionId: transport.sessionId });
    } catch (error) {
      logger.error("Error handling MCP HTTP request:", error);
      if (!res.headersSent) {
        if (error instanceof ApiError) {
          res.status(error.statusCode).json({ error: error.message });
        } else {
          res.status(500).json({ error: "Internal server error" });
        }
      }
    }
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

function isHttpServerTransport(
  transport: unknown,
): transport is HttpServerTransportPort {
  return (
    transport !== null &&
    typeof transport === "object" &&
    "handleRequest" in transport &&
    typeof (transport as HttpServerTransportPort).handleRequest === "function"
  );
}

async function handleMessage(
  sessionId: unknown,
  req: Request,
  res: Response,
  logger: LoggerPort,
) {
  const { hostsService } = req as EndpointRequest;
  if (!sessionId || typeof sessionId !== "string") {
    return (res.status(400).json({ error: "Session ID is required" }), void 0);
  }
  if (!hostsService.hasSession(sessionId)) {
    return (res.status(404).json({ error: "Session not found" }), void 0);
  }
  const session = hostsService.getSession(sessionId);
  if (!session) {
    return (
      res.status(503).json({ error: "Session transport not available" }),
      void 0
    );
  }

  try {
    if (
      "handlePostMessage" in session.transport &&
      typeof session.transport.handlePostMessage === "function"
    ) {
      await (session.transport as SseServerTransportAdapter).handlePostMessage(
        req,
        res,
        req.body,
      );
    } else {
      res
        .status(405)
        .json({ error: "Method not allowed for this transport type" });
    }
  } catch (error) {
    logger.error(`Error handling message for session ${sessionId}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
}
