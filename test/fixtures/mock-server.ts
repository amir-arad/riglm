import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function makeMockServer(
  _customTools?: Array<{
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
  }>
) {
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

  return server;
}
