/**
 * E2E Tests for Streamable HTTP Transport
 *
 * RED phase - These tests define the expected behavior for HTTP transport support.
 * They will fail until the implementation is complete.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { setTimeout } from "node:timers/promises";
import winston from "winston";
import { RiglmServer, ServerDeps } from "../../src/application/riglm-server";
import { McpClientFactoryAdapter } from "../../src/adapters/mcp/mcp-client.adapter";
import { McpServerFactoryAdapter } from "../../src/adapters/mcp/mcp-server.adapter";
import { ClientTransportFactoryAdapter } from "../../src/adapters/mcp/transports/transport-factory.adapter";
import { createMockConfigStorage } from "../mocks/mock-config";
import { mocSseServer } from "../fixtures/mock-sse-server";

describe("Streamable HTTP Transport E2E", () => {
  let mockBackend: ReturnType<typeof mocSseServer> | null = null;
  let client: Client | null = null;
  let uut: RiglmServer | null = null;
  let mockConfig: ReturnType<typeof createMockConfigStorage> | null = null;

  // Create winston logger with LoggerPort-compatible interface
  const winstonLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.label({ label: "streamable-http-test", message: true }),
      winston.format.simple()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    ],
  });

  const logger = {
    info: (message: string, ...meta: unknown[]) => winstonLogger.info(message, ...meta),
    warn: (message: string, ...meta: unknown[]) => winstonLogger.warn(message, ...meta),
    error: (message: string, ...meta: unknown[]) => winstonLogger.error(message, ...meta),
    debug: (message: string, ...meta: unknown[]) => winstonLogger.debug(message, ...meta),
    child: (_meta: Record<string, unknown>) => logger,
  };

  const clientFactory = new McpClientFactoryAdapter();
  const serverFactory = new McpServerFactoryAdapter();
  const transportFactory = new ClientTransportFactoryAdapter();

  const TEST_PORT = 56667;

  function createServerDeps(config: ReturnType<typeof createMockConfigStorage>): ServerDeps {
    return {
      env: {
        port: TEST_PORT,
        isProduction: false,
      },
      config,
      clientFactory,
      serverFactory,
      transportFactory,
      logger,
    };
  }

  const cleanup = async (
    name: string,
    cleanupPromise: Promise<void>,
    timeoutMs: number = 2000
  ) => {
    try {
      await Promise.race([
        cleanupPromise,
        setTimeout(timeoutMs).then(() => {
          throw new Error(`${name} cleanup timeout`);
        }),
      ]);
      logger.info(`${name} cleanup successful`);
    } catch (error) {
      logger.error(`${name} cleanup failed:`, error);
    }
  };

  beforeEach(async () => {
    mockBackend = mocSseServer();
    await mockBackend.listen(3020);

    mockConfig = createMockConfigStorage();
    mockConfig.setConfig({
      servers: {
        mock_server: { url: "http://localhost:3020/sse" },
      },
      endpoints: {
        test_endpoint: { servers: ["mock_server"] },
      },
    });

    client = new Client({
      name: "http-test-client",
      version: "1.0.0",
    });

    uut = new RiglmServer(createServerDeps(mockConfig));
    await uut.start();
  });

  afterEach(async () => {
    await cleanup("Client transport", Promise.resolve(client?.transport?.close()));
    await cleanup("Client", Promise.resolve(client?.close()));
    await cleanup("Unit under test", Promise.resolve(uut?.close()));
    await cleanup("Mock backend", Promise.resolve(mockBackend?.close()));
  });

  test("connect via Streamable HTTP, list tools, call tool", async () => {
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${TEST_PORT}/test_endpoint/mcp`)
    );

    await client!.connect(transport);

    // Should discover namespaced tools
    const { tools } = await client!.listTools();
    expect(tools.map((t) => t.name)).toContain("mock_server-echo");

    // Should call tool and get result
    const result = await client!.callTool({
      name: "mock_server-echo",
      arguments: { message: "HTTP works!" },
    });
    expect((result.content as Array<{ type: string; text: string }>)[0].text).toBe("HTTP works!");
  });

  test("session ID returned in Mcp-Session-Id header", async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/test_endpoint/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          clientInfo: { name: "test", version: "1.0" },
          capabilities: {},
        },
        id: 1,
      }),
    });

    expect(response.headers.get("Mcp-Session-Id")).toBeTruthy();
  });

  test("subsequent requests use session ID for routing", async () => {
    // First request establishes session
    const initResponse = await fetch(`http://localhost:${TEST_PORT}/test_endpoint/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          clientInfo: { name: "test", version: "1.0" },
          capabilities: {},
        },
        id: 1,
      }),
    });
    const sessionId = initResponse.headers.get("Mcp-Session-Id");
    expect(sessionId).toBeTruthy();

    // Send initialized notification
    await fetch(`http://localhost:${TEST_PORT}/test_endpoint/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Mcp-Session-Id": sessionId!,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    });

    // Second request uses session for tools/list
    const toolsResponse = await fetch(`http://localhost:${TEST_PORT}/test_endpoint/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Mcp-Session-Id": sessionId!,
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 2 }),
    });

    expect(toolsResponse.ok).toBe(true);
    const result = (await toolsResponse.json()) as { result: { tools: unknown[] } };
    expect(result.result.tools).toBeDefined();
  });

  test("unknown session ID returns 404", async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/test_endpoint/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Mcp-Session-Id": "unknown-session-id",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
    });

    expect(response.status).toBe(404);
  });

  test("GET without session returns 400", async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/test_endpoint/mcp`, {
      method: "GET",
    });

    expect(response.status).toBe(400);
  });

  test("unknown endpoint returns 404", async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/nonexistent/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    });

    expect(response.status).toBe(404);
  });
});
