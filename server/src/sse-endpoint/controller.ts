import { Request, Response, Router } from "express";
import { logger } from "../etc/logger";
import { EndpointService, endpointServices } from "./endpoint.service";

export const endpointsRoutes = Router();

type EndpointRequest = Request<{
  endpointId: string;
  sessionId?: string;
}> & {
  endpointService: EndpointService;
};

endpointsRoutes.param("endpointId", async (req, res, next, endpointId) => {
  try {
    const endpointService = await endpointServices.get(endpointId);
    if (!endpointService) {
      return res.status(404).json({ error: "Endpoint not found" }), void 0;
    }
    (req as EndpointRequest).endpointService = endpointService;
    next();
  } catch (error) {
    next(error);
  }
});

endpointsRoutes.get("/:endpointId/sse", async (req, res) => {
  try {
    const { endpointService } = req as EndpointRequest;
    const sessionId = await endpointService.createSession(
      `/${endpointService.endpointId}/messages`,
      res
    );
    res.write(`event: session\ndata: ${JSON.stringify({ sessionId })}\n\n`);
    const messageEndpoint = `/${endpointService.endpointId}/messages/${sessionId}`;
    res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);
    req.on("close", () => {
      logger.info(`SSE connection closed for session: ${sessionId}`);
      endpointService.removeSession(sessionId);
    });

    logger.info(`SSE connection established for session: ${sessionId}`);
  } catch (error) {
    logger.error("Error establishing SSE connection:", error);
    res.status(500).end();
  }
});

endpointsRoutes.post("/:endpointId/messages", async (req, res) => {
  const sessionId = req.headers["x-session-id"] || req.query.sessionId;
  await handleMessage(sessionId, req, res);
});
endpointsRoutes.post("/:endpointId/messages/:sessionId", async (req, res) => {
  const sessionId = req.params.sessionId;
  await handleMessage(sessionId, req, res);
});

async function handleMessage(sessionId: unknown, req: Request, res: Response) {
  const { endpointService } = req as EndpointRequest;
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "Session ID is required" }), void 0;
  }
  if (!endpointService.hasSession(sessionId)) {
    return res.status(404).json({ error: "Session not found" }), void 0;
  }
  const session = endpointService.getSession(sessionId);
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

endpointsRoutes.get("/:endpointId/status", (req, res) => {
  const { endpointService } = req as EndpointRequest;
  res.json({
    ...endpointService.status(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
