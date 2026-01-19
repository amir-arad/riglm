import { RiglmServer, ServerDeps } from "../../src/application/riglm-server";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Config } from "../../src/domain/config-resolver";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { clientTransportFactory, createServerTransportAdapter } from "../../src/adapters/mcp/transports/transport-factory.adapter";
import { createMcpClientAdapter } from "../../src/adapters/mcp/mcp-client.adapter";
import { createMcpServerAdapter } from "../../src/adapters/mcp/mcp-server.adapter";
import { createMockConfigStorage } from "../mocks/mock-config";
import { mocSseServer } from "../fixtures/mock-sse-server";
import winston from "winston";

describe("Tool Filtering E2E Tests", () => {
  let mockBackend: ReturnType<typeof mocSseServer> | null = null;
  let client: Client | null = null;
  let server: RiglmServer | null = null;
  let mockConfig: ReturnType<typeof createMockConfigStorage> | null = null;

  const winstonLogger = winston.createLogger({
    level: "info",
    format: winston.format.simple(),
    transports: [new winston.transports.Console()],
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
        port: 56666,
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

  beforeEach(async () => {
    mockConfig = createMockConfigStorage({
      servers: {
        mock_server: {
          url: "http://localhost:3000/sse",
        },
      },
      endpoints: {
        test_endpoint: {
          description: "Test endpoint for filtering tests",
          servers: ["mock_server"],
        },
      },
    });
    mockBackend = mocSseServer();
    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });
    server = new RiglmServer(createServerDeps(mockConfig));
    await mockBackend.listen(3000);
    await server.start();
  });

  afterEach(async () => {
    await client?.close();
    client = null;
    await server?.close();
    server = null;
    await mockBackend?.close();
    mockBackend = null;
    mockConfig = null;
  });

  async function setupClientWithConfig(filterConfig: Config["filters"]) {
    if (!client || !server || !mockConfig) {
      throw new Error("Test is not initialized");
    }
    // Update config with filters
    const currentConf = mockConfig.get();
    mockConfig.setConfig({
      ...currentConf,
      filters: filterConfig,
    });
    await client.connect(
      new SSEClientTransport(
        new URL("/test_endpoint/sse", `http://localhost:${server.port}`)
      )
    );
    return await client.listTools();
  }

  test("should ignore the 'add' tool when using ignore filter", async () => {
    const { tools } = await setupClientWithConfig(["mock_server-add"]);

    expect(tools.find((t) => t.name === "mock_server-add")).toBeUndefined();
    const echoTool = tools.find((t) => t.name === "mock_server-echo");
    expect(echoTool).toBeDefined();
  });

  test("should handle multiple ignore patterns", async () => {
    const { tools } = await setupClientWithConfig([
      "mock_server-add",
      "mock_server-echo",
    ]);

    expect(tools.find((t) => t.name === "mock_server-add")).toBeUndefined();
    expect(tools.find((t) => t.name === "mock_server-echo")).toBeUndefined();
  });

  test("should not filter tools that don't match patterns", async () => {
    const { tools } = await setupClientWithConfig(["mock_server-other*"]);

    const addTool = tools.find((t) => t.name === "mock_server-add");
    expect(addTool).toBeDefined();
    const echoTool = tools.find((t) => t.name === "mock_server-echo");
    expect(echoTool).toBeDefined();
  });
});
