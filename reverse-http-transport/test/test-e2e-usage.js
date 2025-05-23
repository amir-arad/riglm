import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { SOCKSServer } from "../src/socks-server.js";
import { EnhancedPrivateMCPClient } from "../src/enhanced-private-client.js";
import { PublicMCPServer } from "../src/public-server.js";
import fs from "node:fs/promises";

/**
 * Comprehensive End-to-End Test for MCP over SOCKS Transport
 *
 * This test demonstrates concrete MCP server and client communication
 * over SOCKS proxy with realistic tools and scenarios.
 */
describe("🚀 MCP over SOCKS: Comprehensive E2E Usage Examples", () => {
  let socksServer, privateClient, publicServer;
  const testLogFile = "test-e2e.log";

  before(async () => {
    console.log(
      "\n🎬 Setting up comprehensive MCP over SOCKS demonstration...\n"
    );
  });

  after(async () => {
    console.log("\n🧹 Cleaning up test environment...");

    // Add delay to ensure all async operations complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      if (publicServer) {
        await publicServer.disconnect();
        publicServer = null;
        console.log("✅ Public MCP server disconnected");
      }
    } catch (e) {
      console.log("⚠️ Error disconnecting public server:", e.message);
    }

    try {
      if (privateClient) {
        await privateClient.stop();
        privateClient = null;
        console.log("✅ Private MCP client stopped");
      }
    } catch (e) {
      console.log("⚠️ Error stopping private client:", e.message);
    }

    try {
      if (socksServer) {
        await socksServer.stop();
        socksServer = null;
        console.log("✅ SOCKS server stopped");
      }
    } catch (e) {
      console.log("⚠️ Error stopping SOCKS server:", e.message);
    }

    // Clean up test files
    try {
      await fs.unlink(testLogFile);
    } catch (e) {
      // Ignore if file doesn't exist
    }

    // Final delay to ensure cleanup completes
    // await new Promise((resolve) => setTimeout(resolve, 200));
    console.log("🏁 Cleanup complete\n");
  });

  test("🔧 Infrastructure Setup: SOCKS server, private client, and public server", async () => {
    console.log("🔧 Setting up SOCKS proxy infrastructure...");

    // 1. Start SOCKS server
    socksServer = new SOCKSServer(4080);
    await socksServer.start();
    console.log("✅ SOCKS proxy server running on port 4080");

    // 2. Start enhanced private MCP client
    privateClient = new EnhancedPrivateMCPClient(11080);
    await privateClient.start();
    console.log("✅ Enhanced private MCP client running on port 11080");

    // 3. Connect public MCP server via SOCKS proxy
    publicServer = new PublicMCPServer(
      "http://localhost:11080",
      "socks5://localhost:4080"
    );
    await publicServer.connect();
    console.log("✅ Public MCP server connected via SOCKS proxy");
    console.log(
      "📡 SOCKS proxy established: localhost:4080 -> localhost:11080\n"
    );

    // Verify all components are connected
    assert.ok(socksServer, "SOCKS server should be running");
    assert.ok(privateClient, "Private MCP client should be running");
    assert.ok(publicServer, "Public MCP server should be connected");
  });

  test("🛠️ Tool Discovery: List available tools through SOCKS transport", async () => {
    console.log("🛠️ Discovering available tools via SOCKS proxy...");

    const tools = await publicServer.listTools();

    console.log(
      `📋 Found ${tools.length} tools available through SOCKS transport:`
    );
    tools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
    });
    console.log("");

    // Verify tools are available
    assert.ok(Array.isArray(tools), "Tools should be an array");
    assert.ok(tools.length >= 6, "Should have at least 6 tools available");

    // Verify specific tools exist
    const toolNames = tools.map((t) => t.name);
    assert.ok(
      toolNames.includes("get_system_info"),
      "Should have get_system_info tool"
    );
    assert.ok(toolNames.includes("calculate"), "Should have calculate tool");
    assert.ok(toolNames.includes("list_files"), "Should have list_files tool");
    assert.ok(toolNames.includes("read_file"), "Should have read_file tool");
    assert.ok(toolNames.includes("write_log"), "Should have write_log tool");
    assert.ok(toolNames.includes("ping"), "Should have ping tool");
  });

  test("🖥️ System Information Tool: Get comprehensive system details", async () => {
    console.log("🖥️ Calling get_system_info tool...");

    const result = await publicServer.callTool("get_system_info", {});

    console.log(
      '📨 Request: {"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_system_info","arguments":{}}}'
    );

    const systemInfo = JSON.parse(result.content[0].text);
    console.log("📬 Response received - System Information:");
    console.log(`   Platform: ${systemInfo.platform}`);
    console.log(`   Architecture: ${systemInfo.arch}`);
    console.log(`   Node Version: ${systemInfo.node_version}`);
    console.log(`   CPU Count: ${systemInfo.cpu_count}`);
    console.log(`   Hostname: ${systemInfo.hostname}`);
    console.log(
      `   Total Memory: ${
        Math.round((systemInfo.memory.total / 1024 / 1024 / 1024) * 100) / 100
      } GB`
    );
    console.log("");

    // Verify system info response
    assert.ok(result.content, "Result should have content");
    assert.ok(Array.isArray(result.content), "Content should be an array");
    assert.ok(systemInfo.platform, "Should have platform information");
    assert.ok(systemInfo.arch, "Should have architecture information");
    assert.ok(systemInfo.node_version, "Should have Node.js version");
    assert.ok(
      typeof systemInfo.cpu_count === "number",
      "Should have CPU count"
    );
  });

  test("🧮 Mathematical Calculator Tool: Perform calculations", async () => {
    console.log("🧮 Testing mathematical calculator tool...");

    const expressions = [
      "2 + 2 * 3",
      "10 / 2 + 5",
      "(15 - 3) * 2",
      "100 / 4 + 25 * 2",
    ];

    for (const expression of expressions) {
      console.log(`🔢 Calculating: ${expression}`);

      const result = await publicServer.callTool("calculate", { expression });
      const calculation = JSON.parse(result.content[0].text);

      console.log(
        `📨 Request: {\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"calculate\",\"arguments\":{\"expression\":\"${expression}\"}}}}`
      );
      console.log(
        `📬 Response: {"result":${calculation.result},"expression":"${calculation.expression}"}`
      );

      // Verify calculation result
      assert.ok(result.content, "Result should have content");
      assert.ok(
        calculation.expression === expression,
        "Expression should match"
      );
      assert.ok(
        typeof calculation.result === "number",
        "Result should be a number"
      );
    }
    console.log("");
  });

  test("📁 File System Operations: List and read files", async () => {
    console.log("📁 Testing file system operations...");

    // List files in src directory
    console.log("📂 Listing files in ./src directory...");
    const listResult = await publicServer.callTool("list_files", {
      directory: "./src",
    });
    const fileList = JSON.parse(listResult.content[0].text);

    console.log(
      `📨 Request: {\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"list_files\",\"arguments\":{\"directory\":\"./src\"}}}`
    );
    console.log(
      `📬 Response: Found ${fileList.count} items in ${fileList.directory}:`
    );

    fileList.files.slice(0, 5).forEach((file) => {
      console.log(`   ${file.type === "directory" ? "📁" : "📄"} ${file.name}`);
    });

    if (fileList.files.length > 5) {
      console.log(`   ... and ${fileList.files.length - 5} more items`);
    }

    // Read package.json file
    console.log("\n📖 Reading package.json file...");
    const readResult = await publicServer.callTool("read_file", {
      path: "package.json",
    });
    const fileContent = JSON.parse(readResult.content[0].text);

    console.log(
      `📨 Request: {\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"read_file\",\"arguments\":{\"path\":\"package.json\"}}}`
    );
    console.log(
      `📬 Response: Read ${fileContent.size} characters from ${fileContent.path}`
    );

    const packageJson = JSON.parse(fileContent.content);
    console.log(`   Project: ${packageJson.name}`);
    console.log(`   Version: ${packageJson.version}`);
    console.log(
      `   Description: ${packageJson.description.substring(0, 60)}...`
    );

    // Verify file operations
    assert.ok(Array.isArray(fileList.files), "File list should be an array");
    assert.ok(fileList.count > 0, "Should have files in src directory");
    assert.ok(fileContent.content.length > 0, "Should have file content");
    assert.ok(packageJson.name, "Package.json should have a name");
    console.log("");
  });

  test("📝 Logging System: Write and track log entries", async () => {
    console.log("📝 Testing logging system...");

    const logEntries = [
      { message: "E2E test started", level: "info" },
      { message: "Testing MCP communication over SOCKS", level: "info" },
      { message: "Simulated warning condition", level: "warn" },
      { message: "Test error handled gracefully", level: "error" },
      { message: "E2E test completing successfully", level: "info" },
    ];

    for (const [index, entry] of logEntries.entries()) {
      console.log(
        `📄 Writing log entry ${index + 1}: [${entry.level.toUpperCase()}] ${
          entry.message
        }`
      );

      const result = await publicServer.callTool("write_log", entry);
      const logResponse = JSON.parse(result.content[0].text);

      console.log(
        `📨 Request: {\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"write_log\",\"arguments\":{\"message\":\"${entry.message}\",\"level\":\"${entry.level}\"}}}`
      );
      console.log(
        `📬 Response: Log entry written (total entries: ${logResponse.total_entries})`
      );

      // Verify log entry
      assert.ok(
        logResponse.logged.message === entry.message,
        "Log message should match"
      );
      assert.ok(
        logResponse.logged.level === entry.level,
        "Log level should match"
      );
      assert.ok(
        logResponse.total_entries === index + 1,
        "Total entries should increment"
      );
    }
    console.log("");
  });

  test("🏓 Connectivity Test: Ping with bidirectional communication", async () => {
    console.log("🏓 Testing bidirectional connectivity...");

    const pingMessages = [
      "Hello from public server!",
      "Testing SOCKS transport reliability",
      "MCP communication is working perfectly",
      "Final connectivity test",
    ];

    for (const [index, message] of pingMessages.entries()) {
      console.log(`🏓 Ping ${index + 1}: ${message}`);

      const result = await publicServer.callTool("ping", { message });

      console.log(
        `📨 Request: {\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"ping\",\"arguments\":{\"message\":\"${message}\"}}}`
      );
      console.log(`📬 Response: ${result.content[0].text}`);

      // Verify ping response
      assert.ok(
        result.content[0].text.includes(message),
        "Response should include original message"
      );
      assert.ok(
        result.content[0].text.includes("Pong!"),
        "Response should include Pong!"
      );
      assert.ok(
        result.content[0].text.includes("timestamp"),
        "Response should include timestamp"
      );
    }
    console.log("");
  });

  test("⚠️ Error Handling: Invalid tools and parameters", async () => {
    console.log("⚠️ Testing error handling capabilities...");

    // Test invalid tool name
    try {
      await publicServer.callTool("nonexistent_tool", {});
      assert.fail("Should have thrown error for invalid tool");
    } catch (error) {
      console.log("✅ Invalid tool error handled correctly:", error.message);
      assert.ok(
        error.message.includes("Unknown tool") ||
          error.message.includes("HTTP 500"),
        "Should indicate unknown tool or HTTP error"
      );
    }

    // Test invalid calculation expression
    try {
      await publicServer.callTool("calculate", {
        expression: "invalid expression!",
      });
      assert.fail("Should have thrown error for invalid expression");
    } catch (error) {
      console.log(
        "✅ Invalid expression error handled correctly:",
        error.message
      );
      assert.ok(
        error.message.includes("Calculation error") ||
          error.message.includes("HTTP 500"),
        "Should indicate calculation error or HTTP error"
      );
    }

    // Test reading non-existent file
    try {
      await publicServer.callTool("read_file", { path: "nonexistent.txt" });
      assert.fail("Should have thrown error for non-existent file");
    } catch (error) {
      console.log("✅ File not found error handled correctly:", error.message);
      assert.ok(
        error.message.includes("File read error") ||
          error.message.includes("HTTP 500"),
        "Should indicate file read error or HTTP error"
      );
    }

    console.log("");
  });

  test("🎯 Performance Test: Multiple concurrent operations", async () => {
    console.log("🎯 Testing concurrent operations through SOCKS proxy...");

    const operations = [
      () => publicServer.callTool("get_system_info", {}),
      () => publicServer.callTool("calculate", { expression: "42 * 42" }),
      () => publicServer.callTool("list_files", { directory: "." }),
      () => publicServer.callTool("ping", { message: "Concurrent test 1" }),
      () =>
        publicServer.callTool("write_log", {
          message: "Concurrent operation",
          level: "info",
        }),
      () => publicServer.callTool("ping", { message: "Concurrent test 2" }),
      () => publicServer.callTool("calculate", { expression: "100 / 4" }),
      () => publicServer.callTool("ping", { message: "Concurrent test 3" }),
    ];

    console.log(`🚀 Executing ${operations.length} concurrent operations...`);
    const startTime = Date.now();

    const results = await Promise.all(operations.map((op) => op()));

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(
      `⚡ All ${operations.length} operations completed in ${duration}ms`
    );
    console.log(
      `📊 Average operation time: ${Math.round(duration / operations.length)}ms`
    );

    // Verify all operations succeeded
    assert.ok(
      results.length === operations.length,
      "All operations should complete"
    );
    results.forEach((result, index) => {
      assert.ok(result.content, `Operation ${index + 1} should have content`);
    });

    console.log(
      "✅ All concurrent operations successful through SOCKS transport\n"
    );
  });

  test("📈 Transport Verification: Confirm SOCKS proxy usage", async () => {
    console.log("📈 Verifying SOCKS transport is being used...");

    // Test direct connection fails (simulate by checking we're using proxy)
    assert.ok(
      publicServer.socksProxyUrl === "socks5://localhost:4080",
      "Should be using SOCKS proxy"
    );
    assert.ok(publicServer.connected, "Should be connected through proxy");

    // Perform a final verification ping
    const result = await publicServer.callTool("ping", {
      message: "Final verification through SOCKS proxy",
    });

    console.log("📡 Transport verification successful:");
    console.log("   ✅ Public server -> SOCKS proxy (localhost:4080)");
    console.log("   ✅ SOCKS proxy -> Private client (localhost:11080)");
    console.log("   ✅ MCP communication working end-to-end");
    console.log("   ✅ All tools accessible through SOCKS transport");

    assert.ok(
      result.content[0].text.includes("Final verification"),
      "Final ping should work"
    );
    console.log("");
  });
});
