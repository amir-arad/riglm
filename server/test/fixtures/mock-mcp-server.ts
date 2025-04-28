import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";

export function mockMcpServer() {
  const server = new McpServer({
    name: "mock-server",
    version: "1.0.0",
  });

  server.tool("echo", { message: z.string() }, async ({ message }) => ({
    content: [{ type: "text", text: message }],
  }));

  server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  }));

  const app = express();
  app.use(express.json());
  const transports = {
    sse: {} as Record<string, SSEServerTransport>,
  };
  app.get("/sse", async (_, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.sse[transport.sessionId] = transport;
    res.on("close", () => {
      delete transports.sse[transport.sessionId];
    });
    await server.connect(transport).catch((err) => {
      console.error("Error connecting server:", err);
      res.status(500).send("Error connecting server");
    });
  });
  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.sse[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res, req.body);
    } else {
      res.status(400).send("No transport found for sessionId");
    }
  });

  return { server, app };
}
