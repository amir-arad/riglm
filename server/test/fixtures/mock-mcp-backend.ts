import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { Server } from "http";
import morgan from "morgan";
import { z } from "zod";

export function mockMcpBackend() {
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
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => {
          console.log(`mock-mcp-backend: ${message.trim()}`);
        },
      },
    })
  );
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
  let httpServer: Server | null = null;
  const listen = (port: number) =>
    new Promise<void>((resolve, reject) => {
      console.log(`mock-mcp-backend connecting to port ${port}`);
      httpServer = app.listen(port, (err) => {
        if (err) {
          console.error("Error starting mock-mcp-backend:", err);
          return reject(err);
        }
        console.log(`mock-mcp-backend listening on port ${port}`);
        resolve();
      });
    });
  const close = async () => {
    console.log(`mock-mcp-backend closing`);
    // for (const transport of Object.values(transports.sse)) {
    //   await transport.close();
    // }
    await server.close();
    await new Promise((resolve) => httpServer?.close(resolve));
    console.log(`mock-mcp-backend closed`);
  };
  console.log(`mock-mcp-backend built`);
  return { listen, close };
}
