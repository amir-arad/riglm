/**
 * Happy Flow E2E Test
 *
 * Tests the complete successful user journey through the MCP aggregator:
 * 1. Server initialization and startup
 * 2. Client connection via SSE transport
 * 3. Tool discovery with proper namespacing
 * 4. Tool invocation and result handling
 * 5. Multiple server aggregation
 * 6. Graceful session cleanup
 *
 * Uses @modelcontextprotocol/sdk for MCP client/server communication.
 */

import { RiglmServer, ServerDeps } from "../../src/application/riglm-server";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { dirname, join } from "path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ClientTransportFactoryAdapter } from "../../src/adapters/mcp/transports/transport-factory.adapter";
import { McpClientFactoryAdapter } from "../../src/adapters/mcp/mcp-client.adapter";
import { McpServerFactoryAdapter } from "../../src/adapters/mcp/mcp-server.adapter";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { createMockConfigStorage } from "../mocks/mock-config";
import { mocSseServer } from "../fixtures/mock-sse-server";
import winston from "winston";

const fixturesDir = join(dirname(import.meta.path), "../fixtures");

describe("Happy Flow E2E", () => {
  let mockBackend1: ReturnType<typeof mocSseServer> | null = null;
  let mockBackend2: ReturnType<typeof mocSseServer> | null = null;
  let client: Client | null = null;
  let uut: RiglmServer | null = null;
  let mockConfig: ReturnType<typeof createMockConfigStorage> | null = null;

  // Quiet logger for tests (only errors)
  const winstonLogger = winston.createLogger({
    level: "error",
    transports: [new winston.transports.Console()],
  });

  const logger = {
    info: (message: string, ...meta: unknown[]) =>
      winstonLogger.info(message, ...meta),
    warn: (message: string, ...meta: unknown[]) =>
      winstonLogger.warn(message, ...meta),
    error: (message: string, ...meta: unknown[]) =>
      winstonLogger.error(message, ...meta),
    debug: (message: string, ...meta: unknown[]) =>
      winstonLogger.debug(message, ...meta),
    child: (_meta: Record<string, unknown>) => logger,
  };

  const clientFactory = new McpClientFactoryAdapter();
  const serverFactory = new McpServerFactoryAdapter();
  const transportFactory = new ClientTransportFactoryAdapter();

  function createServerDeps(
    config: ReturnType<typeof createMockConfigStorage>,
    port: number = 56670
  ): ServerDeps {
    return {
      env: { port, isProduction: false },
      config,
      clientFactory,
      serverFactory,
      transportFactory,
      logger,
    };
  }

  async function safeCleanup(name: string, fn: () => Promise<void> | void) {
    try {
      await Promise.race([
        Promise.resolve(fn()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${name} timeout`)), 2000)
        ),
      ]);
    } catch {
      // Ignore cleanup errors
    }
  }

  beforeEach(async () => {
    mockConfig = createMockConfigStorage();
    client = new Client({ name: "happy-flow-client", version: "1.0.0" });
    uut = new RiglmServer(createServerDeps(mockConfig));
  });

  afterEach(async () => {
    await safeCleanup("transport", () => client?.transport?.close());
    await safeCleanup("client", () => client?.close());
    client = null;
    await safeCleanup("server", () => uut?.close());
    uut = null;
    await safeCleanup("backend1", () => mockBackend1?.close());
    mockBackend1 = null;
    await safeCleanup("backend2", () => mockBackend2?.close());
    mockBackend2 = null;
  });

  describe("Single Server Workflow", () => {
    test("complete flow: connect → list tools → call tools → verify results", async () => {
      if (!client || !uut || !mockConfig) throw new Error("Not initialized");

      // 1. Setup mock MCP server (simulates an upstream MCP server like GitHub, Filesystem, etc.)
      mockBackend1 = mocSseServer();
      await mockBackend1.listen(3010);

      // 2. Configure the aggregator with the mock server
      mockConfig.setConfig({
        servers: {
          tools_server: {
            url: "http://localhost:3010/sse",
            description: "Test tools server",
          },
        },
        endpoints: {
          main: {
            description: "Main endpoint",
            servers: ["tools_server"],
          },
        },
      });

      // 3. Start the aggregator server
      await uut.start();
      expect(uut.port).toBe(56670);

      // 4. Connect MCP client to the aggregator endpoint
      await client.connect(
        new SSEClientTransport(
          new URL("/main/sse", `http://localhost:${uut.port}`)
        )
      );

      // 5. List available tools - should be namespaced with server name
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toEqual(
        expect.arrayContaining(["tools_server-echo", "tools_server-add"])
      );

      // 6. Verify tool schemas are preserved
      const echoTool = tools.find((t) => t.name === "tools_server-echo");
      expect(echoTool?.inputSchema).toBeDefined();
      expect(echoTool?.inputSchema.properties).toHaveProperty("message");

      const addTool = tools.find((t) => t.name === "tools_server-add");
      expect(addTool?.inputSchema.properties).toHaveProperty("a");
      expect(addTool?.inputSchema.properties).toHaveProperty("b");

      // 7. Call the echo tool
      const echoResult = (await client.callTool({
        name: "tools_server-echo",
        arguments: { message: "Hello from happy flow test!" },
      })) as { content: Array<{ type: string; text: string }> };

      expect(echoResult.content).toHaveLength(1);
      expect(echoResult.content[0].type).toBe("text");
      expect(echoResult.content[0].text).toBe("Hello from happy flow test!");

      // 8. Call the add tool
      const addResult = (await client.callTool({
        name: "tools_server-add",
        arguments: { a: 42, b: 58 },
      })) as { content: Array<{ type: string; text: string }> };

      expect(addResult.content[0].text).toBe("100");
    });

    test("local stdio server: spawn → connect → use tools", async () => {
      if (!client || !uut || !mockConfig) throw new Error("Not initialized");

      // Configure with a local CLI server (stdio transport)
      mockConfig.setConfig({
        servers: {
          cli_tools: {
            command: "bun",
            args: ["run", join(fixturesDir, "mock-cli-server.ts")],
            description: "Local CLI tools",
          },
        },
        endpoints: {
          local: {
            description: "Local endpoint",
            servers: ["cli_tools"],
          },
        },
      });

      await uut.start();

      await client.connect(
        new SSEClientTransport(
          new URL("/local/sse", `http://localhost:${uut.port}`)
        )
      );

      const { tools } = await client.listTools();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toContain("cli_tools-echo");

      const result = (await client.callTool({
        name: "cli_tools-echo",
        arguments: { message: "stdio works!" },
      })) as { content: Array<{ type: string; text: string }> };

      expect(result.content[0].text).toBe("stdio works!");
    });
  });

  describe("Multi-Server Aggregation", () => {
    test("aggregate tools from multiple upstream servers", async () => {
      if (!client || !uut || !mockConfig) throw new Error("Not initialized");

      // Setup two independent mock servers
      mockBackend1 = mocSseServer();
      mockBackend2 = mocSseServer();
      await mockBackend1.listen(3011);
      await mockBackend2.listen(3012);

      // Configure aggregator to combine both servers
      mockConfig.setConfig({
        servers: {
          server_alpha: {
            url: "http://localhost:3011/sse",
            description: "Alpha server",
          },
          server_beta: {
            url: "http://localhost:3012/sse",
            description: "Beta server",
          },
        },
        endpoints: {
          combined: {
            description: "Combined endpoint",
            servers: ["server_alpha", "server_beta"],
          },
        },
      });

      await uut.start();

      await client.connect(
        new SSEClientTransport(
          new URL("/combined/sse", `http://localhost:${uut.port}`)
        )
      );

      // Should have tools from both servers (2 tools each = 4 total)
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(4);

      // Verify namespacing distinguishes tools from different servers
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain("server_alpha-echo");
      expect(toolNames).toContain("server_alpha-add");
      expect(toolNames).toContain("server_beta-echo");
      expect(toolNames).toContain("server_beta-add");

      // Call tools from different servers to verify routing
      const alphaResult = (await client.callTool({
        name: "server_alpha-echo",
        arguments: { message: "from alpha" },
      })) as { content: Array<{ type: string; text: string }> };
      expect(alphaResult.content[0].text).toBe("from alpha");

      const betaResult = (await client.callTool({
        name: "server_beta-add",
        arguments: { a: 7, b: 8 },
      })) as { content: Array<{ type: string; text: string }> };
      expect(betaResult.content[0].text).toBe("15");
    });
  });

  describe("Multiple Endpoints", () => {
    test("different endpoints expose different server subsets", async () => {
      if (!uut || !mockConfig) throw new Error("Not initialized");

      mockBackend1 = mocSseServer();
      mockBackend2 = mocSseServer();
      await mockBackend1.listen(3013);
      await mockBackend2.listen(3014);

      mockConfig.setConfig({
        servers: {
          github: {
            url: "http://localhost:3013/sse",
            description: "GitHub operations",
          },
          filesystem: {
            url: "http://localhost:3014/sse",
            description: "Filesystem operations",
          },
        },
        endpoints: {
          full: {
            description: "All servers",
            servers: ["github", "filesystem"],
          },
          minimal: {
            description: "Only filesystem",
            servers: ["filesystem"],
          },
        },
      });

      await uut.start();

      // Connect to full endpoint
      const fullClient = new Client({ name: "full-client", version: "1.0.0" });
      await fullClient.connect(
        new SSEClientTransport(
          new URL("/full/sse", `http://localhost:${uut.port}`)
        )
      );
      const fullTools = await fullClient.listTools();
      expect(fullTools.tools).toHaveLength(4); // 2 from each server

      // Connect to minimal endpoint
      const minimalClient = new Client({
        name: "minimal-client",
        version: "1.0.0",
      });
      await minimalClient.connect(
        new SSEClientTransport(
          new URL("/minimal/sse", `http://localhost:${uut.port}`)
        )
      );
      const minimalTools = await minimalClient.listTools();
      expect(minimalTools.tools).toHaveLength(2); // Only filesystem tools
      expect(minimalTools.tools.map((t) => t.name)).toEqual(
        expect.arrayContaining(["filesystem-echo", "filesystem-add"])
      );

      // Cleanup extra clients
      await safeCleanup("fullClient", () => fullClient.close());
      await safeCleanup("minimalClient", () => minimalClient.close());
    });
  });

  describe("Graceful Shutdown", () => {
    test("server closes cleanly after client disconnects", async () => {
      if (!client || !uut || !mockConfig) throw new Error("Not initialized");

      mockBackend1 = mocSseServer();
      await mockBackend1.listen(3015);

      mockConfig.setConfig({
        servers: {
          backend: { url: "http://localhost:3015/sse" },
        },
        endpoints: {
          main: { servers: ["backend"] },
        },
      });

      await uut.start();

      await client.connect(
        new SSEClientTransport(
          new URL("/main/sse", `http://localhost:${uut.port}`)
        )
      );

      // Use the connection
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(2);

      // Client disconnects
      await client.close();
      client = null;

      // Server should close cleanly
      await uut.close();
      uut = null;

      // No errors = success
      expect(true).toBe(true);
    });
  });
});
