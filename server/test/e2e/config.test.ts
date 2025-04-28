import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { expect } from "chai";
import { join } from "path";
import { startServer, stopServer } from "../helpers/server";
import { mockMcpServer } from "../fixtures/mock-mcp-server";
import e from "express";
import * as http from "http";
import { AddressInfo } from "net";

const TEST_CONFIG_PATH = join(__dirname, "../fixtures/test-config.json");

describe("Configuration E2E Test", () => {
  let mockServer: ReturnType<typeof mockMcpServer>;
  let client: Client;
  let httpServer: http.Server;

  beforeEach(async () => {
    // Start server with test config
    mockServer = mockMcpServer();
    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });
    await new Promise<void>(
      (res, rej) =>
        (httpServer = mockServer.app.listen(3000, (err) => {
          if (err) return rej(err);
          res();
        }))
    );
  });

  afterEach(async () => {
    // await stopServer();
    await client.close();
    await new Promise<void>((res, rej) =>
      httpServer.close((err) => {
        if (err) return rej(err);
        res();
      })
    );
  });

  it("sanity (drivers and mocks working)", async () => {
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
    const serverUrl = await startServer(TEST_CONFIG_PATH);
    await client.connect(
      new SSEClientTransport(new URL("/test_endpoint/sse", serverUrl))
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
