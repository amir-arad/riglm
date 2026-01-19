import { RiglmServer, ServerDeps } from "../../src/application/riglm-server";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { dirname, join } from "path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { clientTransportFactory, createServerTransportAdapter } from "../../src/adapters/mcp/transports/transport-factory.adapter";
import { createMcpClientAdapter } from "../../src/adapters/mcp/mcp-client.adapter";
import { createMcpServerAdapter } from "../../src/adapters/mcp/mcp-server.adapter";
import { createMockConfigStorage } from "../mocks/mock-config";
import { mocSseServer } from "../fixtures/mock-sse-server";
import { setTimeout } from "node:timers/promises";
import winston from "winston";

// Get the absolute path to the test fixtures directory
const fixturesDir = join(dirname(import.meta.path), "../fixtures");

describe("E2E Test", () => {
  let mockBackend: ReturnType<typeof mocSseServer> | null = null;
  let client: Client | null = null;
  let uut: RiglmServer | null = null;
  let mockConfig: ReturnType<typeof createMockConfigStorage> | null = null;

  // Create winston logger with LoggerPort-compatible interface
  const winstonLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.label({ label: "riglm", message: true }),
      winston.format.simple()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    ],
  });

  // Wrap winston to match LoggerPort interface
  const logger = {
    info: (message: string, ...meta: unknown[]) => winstonLogger.info(message, ...meta),
    warn: (message: string, ...meta: unknown[]) => winstonLogger.warn(message, ...meta),
    error: (message: string, ...meta: unknown[]) => winstonLogger.error(message, ...meta),
    debug: (message: string, ...meta: unknown[]) => winstonLogger.debug(message, ...meta),
    child: (_meta: Record<string, unknown>) => logger,
  };

  // Create factories (use real adapters for E2E tests)
  const clientFactory = createMcpClientAdapter;
  const serverFactory = createMcpServerAdapter;
  const transportFactory = clientTransportFactory;

  function createServerDeps(config: ReturnType<typeof createMockConfigStorage>): ServerDeps {
    return {
      env: {
        port: 56665,
        isProduction: false,
      },
      config,
      clientFactory,
      serverFactory,
      clientTransportFactory: transportFactory,
      serverTransportFactory: createServerTransportAdapter,
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
        setTimeout(timeoutMs, () => {
          throw new Error(`${name} cleanup timeout`);
        }),
      ]);
      logger.info(`${name} cleanup successful`);
    } catch (error) {
      logger.error(`${name} cleanup failed:`, error);
      // Don't throw, continue with other cleanups
    }
  };

  beforeEach(async () => {
    mockBackend = mocSseServer();
    mockConfig = createMockConfigStorage();
    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });
    uut = new RiglmServer(createServerDeps(mockConfig));
  });

  afterEach(async function () {
    try {
      await cleanup(
        "Client transport",
        Promise.resolve(client?.transport?.close())
      );
      await cleanup("Client", Promise.resolve(client?.close()));
      client = null;
      await cleanup("Unit under test", Promise.resolve(uut?.close()));
      uut = null;
      await cleanup("Mock backend", Promise.resolve(mockBackend?.close()));
      mockBackend = null;
    } catch (error) {
      logger.error("Fatal error during cleanup:", error);
      throw error;
    }
  });

  test("sanity (sse drivers and mocks working)", async () => {
    if (!client || !mockBackend) {
      throw new Error("Test is not initialized");
    }
    await mockBackend.listen(3000);
    await client.connect(
      new SSEClientTransport(new URL("/sse", `http://localhost:3000`))
    );
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toContain("echo");
    expect(tools.map((t) => t.name)).toContain("add");
    const echoResult = (await client.callTool({
      name: "echo",
      arguments: { message: "test message" },
    })) as any;
    expect(echoResult.content[0].text).toBe("test message");
    const addResult = (await client.callTool({
      name: "add",
      arguments: { a: 5, b: 3 },
    })) as any;
    expect(addResult.content[0].text).toBe("8");
  });

  test("should support hierarchical namespacing of tools", async () => {
    if (!client || !mockBackend || !uut || !mockConfig) {
      throw new Error("Test is not initialized");
    }

    mockBackend = mocSseServer();
    await mockBackend.listen(3000);
    mockConfig.setConfig({
      servers: {
        mock_server: {
          url: "http://localhost:3000/sse",
        },
      },
      endpoints: {
        test_endpoint: {
          description: "Test endpoint for e2e tests",
          servers: ["mock_server"],
        },
      },
    });
    await uut.start();
    await client.connect(
      new SSEClientTransport(
        new URL("/test_endpoint/sse", `http://localhost:${uut.port}`)
      )
    );
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(2);

    // Verify hierarchical namespacing - our server ID is prepended to the already-namespaced tool names
    expect(tools.map((t) => t.name)).toContain("mock_server-echo");
    expect(tools.map((t) => t.name)).toContain("mock_server-add");

    // Test that the tools still work with the new hierarchical names
    const echoResult = (await client.callTool({
      name: "mock_server-echo",
      arguments: { message: "test message" },
    })) as any;
    expect(echoResult.content[0].text).toBe("test message");

    const addResult = (await client.callTool({
      name: "mock_server-add",
      arguments: { a: 5, b: 3 },
    })) as any;
    expect(addResult.content[0].text).toBe("8");
  });

  test("should expose and proxy tools from local CLI servers", async () => {
    if (!client || !uut || !mockConfig) {
      throw new Error("Test is not initialized");
    }
    mockConfig.setConfig({
      servers: {
        mock_server: {
          command: "bun",
          args: ["run", join(fixturesDir, "mock-cli-server.ts")],
        },
      },
      endpoints: {
        test_endpoint: {
          description: "Test endpoint for e2e tests",
          servers: ["mock_server"],
        },
      },
    });
    await uut.start();
    await client.connect(
      new SSEClientTransport(
        new URL("/test_endpoint/sse", `http://localhost:${uut.port}`)
      )
    );
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toContain("mock_server-echo");
    expect(tools.map((t) => t.name)).toContain("mock_server-add");

    const echoResult = (await client.callTool({
      name: "mock_server-echo",
      arguments: { message: "test message from CLI server" },
    })) as any;
    expect(echoResult.content[0].text).toBe("test message from CLI server");
    const addResult = (await client.callTool({
      name: "mock_server-add",
      arguments: { a: 10, b: 5 },
    })) as any;
    expect(addResult.content[0].text).toBe("15");
  });

  test("should return 404 for non-existent endpoints", async () => {
    if (!client || !uut || !mockConfig) {
      throw new Error("Test is not initialized");
    }

    mockConfig.setConfig({
      servers: {},
      endpoints: {},
    });

    await uut.start();

    try {
      await client.connect(
        new SSEClientTransport(
          new URL("/non-existent-endpoint/sse", `http://localhost:${uut.port}`)
        )
      );
      // If we reach here, the test should fail as we expect a 404 error
      throw new Error("Expected connection to fail with 404 error");
    } catch (error: any) {
      // SSE client formats error as "SSE error: Non-200 status code (404)"
      expect(error.code).toBe(404);
    }
  });
});
