import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { SOCKSServer } from "../src/socks-server.js";
import { PrivateMCPClient } from "../src/private-client.js";
import { PublicMCPServer } from "../src/public-server.js";

describe("SOCKS MCP MVP Tests", () => {
  let socksServer, privateClient, publicServer;

  before(async () => {});

  after(async () => {
    // Add a small delay to ensure all async operations complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      if (publicServer) {
        await publicServer.disconnect();
        publicServer = null;
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    try {
      if (privateClient) {
        await privateClient.stop();
        privateClient = null;
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    try {
      if (socksServer) {
        await socksServer.stop();
        socksServer = null;
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    // Another small delay to ensure cleanup completes
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("SOCKS server starts successfully", async () => {
    socksServer = new SOCKSServer(5080);
    await socksServer.start();

    // Verify the server is actually running
    assert.ok(socksServer, "SOCKS server should be created");
  });

  test("Private MCP client starts successfully", async () => {
    privateClient = new PrivateMCPClient(12080);
    await privateClient.start();

    // Verify the client is actually running
    assert.ok(privateClient, "Private MCP client should be created");
  });

  test("Direct HTTP access works", async () => {
    const response = await fetch("http://localhost:12080/health");
    const data = await response.json();

    // Verify response
    assert.ok(response.ok, "HTTP response should be successful");
    assert.ok(data, "Response should contain data");
  });

  test("Public MCP server connects via SOCKS", async () => {
    publicServer = new PublicMCPServer(
      "http://localhost:12080",
      "socks5://localhost:5080"
    );
    await publicServer.connect();

    // Verify connection
    assert.ok(publicServer, "Public MCP server should be created");
  });

  test("Tool listing works through SOCKS proxy", async () => {
    const tools = await publicServer.listTools();

    // Verify tools are returned
    assert.ok(Array.isArray(tools), "Tools should be an array");
    assert.ok(tools.length > 0, "Should have at least one tool");
  });

  test("Tool execution works end-to-end through SOCKS proxy", async () => {
    const result = await publicServer.ping("MVP Test Message");

    // Verify tool execution result
    assert.ok(result, "Tool execution should return a result");
    assert.ok(result.content, "Result should have content");
    assert.ok(Array.isArray(result.content), "Content should be an array");
    assert.ok(result.content.length > 0, "Content should not be empty");
    assert.ok(result.content[0].text, "Content should have text");
    assert.ok(
      result.content[0].text.includes("MVP Test Message"),
      "Response should include test message"
    );

    // Small delay to ensure all async operations complete before cleanup
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
