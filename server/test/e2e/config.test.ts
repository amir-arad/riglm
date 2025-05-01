import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { expect } from "chai";
import { Config } from "../../src/etc/config-schema";
import { AbcServer } from "../../src/server";
import { mockMcpBackend } from "../fixtures/mock-mcp-backend";

describe("Configuration E2E Test", () => {
  let mockBackend: ReturnType<typeof mockMcpBackend> | null = null;
  let client: Client | null = null;
  let uut: AbcServer | null = null;
  let currentConfig: Config | null = null;

  beforeEach(async () => {
    mockBackend = mockMcpBackend();
    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });
    uut = new AbcServer({
      get: () => {
        if (!currentConfig) {
          throw new Error("No config loaded");
        }
        return currentConfig;
      },
    });
  });

  afterEach(async () => {
    await client?.close();
    await uut?.close();
    await mockBackend?.close();
  });

  it("sanity (drivers and mocks working)", async () => {
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
    const echoResult = await client.callTool({
      name: "echo",
      arguments: { message: "test message" },
    });
    expect(echoResult.content[0].text).to.equal("test message");
    const addResult = await client.callTool({
      name: "add",
      arguments: { a: 5, b: 3 },
    });
    expect(addResult.content[0].text).to.equal("8");
  });

  it("should expose and proxy tools from configured servers", async () => {
    if (!client || !mockBackend || !uut) {
      throw new Error("Test is not initialized");
    }
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
    expect(tools.map((t) => t.name)).to.include("echo");
    expect(tools.map((t) => t.name)).to.include("add");

    const echoResult = await client.callTool({
      name: "echo",
      arguments: { message: "test message" },
    });
    expect(echoResult.content[0].text).to.equal("test message");
    const addResult = await client.callTool({
      name: "add",
      arguments: { a: 5, b: 3 },
    });
    expect(addResult.content[0].text).to.equal("8");
  });
});
