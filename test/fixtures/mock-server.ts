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

  server.registerTool("echo", { description: "Echo a message back", inputSchema: { message: z.string() } }, async ({ message }: { message: string }) => ({ content: [{ type: "text" as const, text: message }] }));

  server.registerTool("add", { description: "Add two numbers", inputSchema: { a: z.number(), b: z.number() } }, async ({ a, b }: { a: number; b: number }) => ({ content: [{ type: "text" as const, text: String(a + b) }] }));

  return server;
}
