import { expect } from "chai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { FilterEngine } from "../../src/etc/filter";
import { Config } from "../../src/etc/config-schema";
import { AbcServer, ServerOptons } from "../../src/server";
import { mocSseServer } from "../fixtures/mock-sse-server";
import winston from "winston";

describe("Tool Filtering E2E Tests", () => {
  let mockBackend: ReturnType<typeof mocSseServer> | null = null;
  let client: Client | null = null;
  let server: AbcServer | null = null;
  let currentConfig: Config | null = null;

  const logger = winston.createLogger({
    level: "info",
    format: winston.format.simple(),
    transports: [new winston.transports.Console()],
  });

  const mockOptions = {
    env: {
      port: 56666,
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

  beforeEach(async () => {
    currentConfig = {
      servers: {
        mock_server: {
          url: "http://localhost:3000/sse",
        },
      },
      contexts: {
        test_context: {
          description: "Test context for filtering tests",
          servers: ["mock_server"],
        },
      },
      endpoints: {
        test_endpoint: {
          description: "Test endpoint for filtering tests",
          contexts: ["test_context"],
        },
      },
    };
    mockBackend = mocSseServer();
    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });
    server = new AbcServer(mockOptions);
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
    currentConfig = null;
  });

  async function setupClientWithConfig(filterConfig: Config["filters"]) {
    if (!client || !server || !currentConfig) {
      throw new Error("Test is not initialized");
    }
    currentConfig.filters = filterConfig;
    await client.connect(
      new SSEClientTransport(
        new URL("/test_endpoint/sse", `http://localhost:${server.port}`)
      )
    );
    return await client.listTools();
  }

  it("should ignore the 'add' tool when using ignore filter", async () => {
    const { tools } = await setupClientWithConfig(["mock_server-add"]);

    expect(tools.find((t) => t.name === "mock_server-add")).to.be.undefined;
    const echoTool = tools.find((t) => t.name === "mock_server-echo");
    expect(echoTool).to.exist;
  });

  it("should handle multiple ignore patterns", async () => {
    const { tools } = await setupClientWithConfig([
      "mock_server-add",
      "mock_server-echo",
    ]);

    expect(tools.find((t) => t.name === "mock_server-add")).to.be.undefined;
    expect(tools.find((t) => t.name === "mock_server-echo")).to.be.undefined;
  });

  it("should not filter tools that don't match patterns", async () => {
    const { tools } = await setupClientWithConfig(["mock_server-other*"]);

    const addTool = tools.find((t) => t.name === "mock_server-add");
    expect(addTool).to.exist;
    const echoTool = tools.find((t) => t.name === "mock_server-echo");
    expect(echoTool).to.exist;
  });
});
