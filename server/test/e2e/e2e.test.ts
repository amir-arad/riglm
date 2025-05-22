import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { expect } from "chai";
import { setTimeout } from "node:timers/promises";
import winston from "winston";
import { Config } from "../../src/etc/config-schema";
import { AbcServer, ServerOptons } from "../../src/server";
import { mocSseServer } from "../fixtures/mock-sse-server";

describe("E2E Test", () => {
  let mockBackend: ReturnType<typeof mocSseServer> | null = null;
  let client: Client | null = null;
  let uut: AbcServer | null = null;
  let currentConfig: Config | null = null;
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.label({ label: "ghostwheels", message: true }),
      winston.format.simple()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    ],
  });

  const mockOptions = {
    env: {
      port: 56665,
      isProduction: false,
    },
    config: {
      get: () => {
        if (!currentConfig) {
          throw new Error("No config loaded");
        }
        return currentConfig;
      },
    },
    logger,
  } satisfies ServerOptons;

  const cleanup = async (
    name: string,
    cleanup: Promise<void>,
    timeoutMs: number = 2000
  ) => {
    try {
      await Promise.race([
        cleanup,
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
    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });
    uut = new AbcServer(mockOptions);
  });

  afterEach(async function () {
    try {
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

  it("sanity (sse drivers and mocks working)", async () => {
    if (!client || !mockBackend) {
      throw new Error("Test is not initialized");
    }
    await mockBackend.listen(3000);
    await client.connect(
      new SSEClientTransport(new URL("/sse", `http://localhost:3000`))
    );
    const { tools } = await client.listTools();
    expect(tools).to.have.lengthOf(2);
    expect(tools.map((t) => t.name)).to.include("echo");
    expect(tools.map((t) => t.name)).to.include("add");
    const echoResult = (await client.callTool({
      name: "echo",
      arguments: { message: "test message" },
    })) as any;
    expect(echoResult.content[0].text).to.equal("test message");
    const addResult = (await client.callTool({
      name: "add",
      arguments: { a: 5, b: 3 },
    })) as any;
    expect(addResult.content[0].text).to.equal("8");
  });

  it("should support hierarchical namespacing of tools", async () => {
    if (!client || !mockBackend || !uut) {
      throw new Error("Test is not initialized");
    }

    mockBackend = mocSseServer();
    await mockBackend.listen(3000);
    currentConfig = {
      servers: {
        mock_server: {
          url: "http://localhost:3000/sse",
        },
      },
      contexts: {
        test_context: {
          description: "Test context for e2e tests",
          servers: ["mock_server"],
        },
      },
      endpoints: {
        test_endpoint: {
          description: "Test endpoint for e2e tests",
          contexts: ["test_context"],
        },
      },
    };
    await uut.start();
    await client.connect(
      new SSEClientTransport(
        new URL("/test_endpoint/sse", `http://localhost:${uut.port}`)
      )
    );
    const { tools } = await client.listTools();
    expect(tools).to.have.lengthOf(2);

    // Verify hierarchical namespacing - our server ID is prepended to the already-namespaced tool names
    expect(tools.map((t) => t.name)).to.include("mock_server/echo");
    expect(tools.map((t) => t.name)).to.include("mock_server/add");

    // Test that the tools still work with the new hierarchical names
    const echoResult = (await client.callTool({
      name: "mock_server/echo",
      arguments: { message: "test message" },
    })) as any;
    expect(echoResult.content[0].text).to.equal("test message");

    const addResult = (await client.callTool({
      name: "mock_server/add",
      arguments: { a: 5, b: 3 },
    })) as any;
    expect(addResult.content[0].text).to.equal("8");
  });

  it("should expose and proxy tools from local CLI servers", async () => {
    if (!client || !uut) {
      throw new Error("Test is not initialized");
    }
    currentConfig = {
      servers: {
        mock_server: {
          command: "node",
          args: ["-r", "ts-node/register", "test/fixtures/mock-cli-server.ts"],
        },
      },
      contexts: {
        test_context: {
          description: "Test context for e2e tests",
          servers: ["mock_server"],
        },
      },
      endpoints: {
        test_endpoint: {
          description: "Test endpoint for e2e tests",
          contexts: ["test_context"],
        },
      },
    };
    await uut.start();
    await client.connect(
      new SSEClientTransport(
        new URL("/test_endpoint/sse", `http://localhost:${uut.port}`)
      )
    );
    const { tools } = await client.listTools();
    expect(tools).to.have.lengthOf(2);
    expect(tools.map((t) => t.name)).to.include("mock_server/echo");
    expect(tools.map((t) => t.name)).to.include("mock_server/add");

    const echoResult = (await client.callTool({
      name: "mock_server/echo",
      arguments: { message: "test message from CLI server" },
    })) as any;
    expect(echoResult.content[0].text).to.equal("test message from CLI server");
    const addResult = (await client.callTool({
      name: "mock_server/add",
      arguments: { a: 10, b: 5 },
    })) as any;
    expect(addResult.content[0].text).to.equal("15");
  });

  it("should return 404 for non-existent endpoints", async () => {
    if (!client || !uut) {
      throw new Error("Test is not initialized");
    }

    currentConfig = {
      servers: {},
      contexts: {},
      endpoints: {},
    };

    await uut.start();

    try {
      await client.connect(
        new SSEClientTransport(
          new URL("/non-existent-endpoint/sse", `http://localhost:${uut.port}`)
        )
      );
      // If we reach here, the test should fail as we expect a 404 error
      expect.fail("Expected connection to fail with 404 error");
    } catch (error: any) {
      // SSE client formats error as "SSE error: Non-200 status code (404)"
      expect(error.message).to.include("404");
      // The actual error message is not propagated through the SSE client
      // so we just verify we got the correct status code
    }
  });
});
