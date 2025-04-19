import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../etc/logger";
import { SessionManager } from "./session-manager";
import { Router } from "express";

export const endpointsRoutes = Router();

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface McpToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}
export type Handler = {
  handle(args: Record<string, unknown> | undefined): Promise<McpToolResponse>;
};
const handlers = new Map<string, [Handler, Omit<ToolDefinition, "name">]>();
handlers.set("foo", [
  {
    async handle(
      args: Record<string, unknown> | undefined
    ): Promise<McpToolResponse> {
      return {
        content: [],
      };
    },
  },
  {
    description: "bar",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "the query",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return",
          default: 5,
        },
      },
      required: ["query"],
    },
  },
]);
const mcpServer = new Server(
  {
    name: "abc-endpoints",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {
        listChanged: true,
      },
    },
  }
);
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [...handlers.entries()].map(([name, [, tool]]) => ({
    ...tool,
    name,
  })),
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const endpoinmt = handlers.get(request.params.name);
  if (!endpoinmt) {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${request.params.name}`
    );
  }

  const response = await endpoinmt[0].handle(request.params.arguments);
  return {
    _meta: {},
    ...response,
  };
});
mcpServer.onerror = (error) => logger.error("[MCP Error]", error);
const sessionManager = new SessionManager(mcpServer, {
  inactivityThreshold: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
});
// SSE endpoint
endpointsRoutes.get("/sse", async (req: any, res: any) => {
  try {
    // Create a new session
    const sessionId = await sessionManager.createSession("/messages", res);

    // Send the session ID as the first SSE message
    res.write(`event: session\ndata: ${JSON.stringify({ sessionId })}\n\n`);

    // Send the endpoint event with the full URI for sending messages
    const messageEndpoint = `/messages/${sessionId}`;
    res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);

    // Set up connection close handler
    req.on("close", () => {
      logger.info(`SSE connection closed for session: ${sessionId}`);
      sessionManager.removeSession(sessionId);
    });

    logger.info(`SSE connection established for session: ${sessionId}`);
  } catch (error) {
    logger.error("Error establishing SSE connection:", error);
    res.status(500).end();
  }
});

endpointsRoutes.post("/messages", async (req: any, res: any) => {
  // Extract session ID from headers or query parameters
  const sessionId = req.headers["x-session-id"] || req.query.sessionId;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  if (!sessionManager.hasSession(sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }

  const session = sessionManager.getSession(sessionId);
  if (session) {
    try {
      await session.transport.handlePostMessage(req, res);
    } catch (error) {
      logger.error(`Error handling message for session ${sessionId}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(503).json({ error: "Session transport not available" });
  }
});
// Message endpoint for client to send messages
endpointsRoutes.post("/messages/:sessionId", async (req: any, res: any) => {
  const sessionId = req.params.sessionId;

  if (!sessionManager.hasSession(sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }

  const session = sessionManager.getSession(sessionId);
  if (session) {
    try {
      await session.transport.handlePostMessage(req, res);
    } catch (error) {
      logger.error(`Error handling message for session ${sessionId}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(503).json({ error: "Session transport not available" });
  }
});

// Add status endpoint for monitoring
endpointsRoutes.get("/status", (_req: any, res: any) => {
  res.json({
    status: "ok",
    activeSessions: sessionManager.getActiveSessions(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

export async function endpointsCleanup() {
  await sessionManager.cleanup();
  await mcpServer.close();
}
