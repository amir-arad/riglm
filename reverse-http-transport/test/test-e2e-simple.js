import { test, describe } from "node:test";
import assert from "node:assert";
import { SOCKSServer } from "../src/socks-server.js";
import { PrivateMCPClient } from "../src/private-client.js";
import { PublicMCPServer } from "../src/public-server.js";

describe("🚀 MCP over SOCKS: E2E Usage Examples", () => {
  test("🔧 Infrastructure setup and tool discovery", async () => {
    console.log("🔧 Setting up SOCKS proxy and MCP client...");

    const socksPort = 3089; // Use a different port for the first test
    const clientPort = 10089;
    const socksServer = new SOCKSServer(socksPort);
    const privateClient = new PrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      // Significant delay for the very first test to ensure SOCKS server is fully initialized
      // This is the first SOCKS connection in the entire test suite and needs extra time
      await new Promise((resolve) => setTimeout(resolve, 500));

      await privateClient.start();
      // Significant delay for the very first test to ensure private client is fully ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Try connection with additional retries for this specific test
      let connected = false;
      let lastError;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          await publicServer.connect();
          connected = true;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 5) {
            console.log(
              `Connection attempt ${attempt} failed, retrying in ${
                100 * attempt
              }ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
          }
        }
      }

      if (!connected) {
        throw lastError;
      }

      console.log(
        `📡 SOCKS proxy established: localhost:${socksPort} -> localhost:${clientPort}`
      );

      // Add robust MCP communication readiness check
      let tools;
      let mcpReady = false;
      let mcpLastError;

      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          console.log(`🔍 Testing MCP communication (attempt ${attempt}/5)...`);
          tools = await publicServer.listTools();
          mcpReady = true;
          console.log(`✅ MCP communication established on attempt ${attempt}`);
          break;
        } catch (error) {
          mcpLastError = error;
          console.log(
            `❌ MCP communication attempt ${attempt} failed: ${error.message}`
          );
          if (attempt < 5) {
            // Progressive delay with extra time for the first test
            const delay = 150 * attempt;
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      if (!mcpReady) {
        console.error(
          "❌ Failed to establish MCP communication after 5 attempts"
        );
        throw mcpLastError;
      }
      console.log(`📋 Found ${tools.length} tools:`);
      tools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
      });

      assert.ok(Array.isArray(tools), "Tools should be an array");
      assert.ok(tools.length >= 6, "Should have at least 6 tools");

      const toolNames = tools.map((t) => t.name);
      assert.ok(
        toolNames.includes("get_system_info"),
        "Should have get_system_info tool"
      );
      assert.ok(toolNames.includes("calculate"), "Should have calculate tool");
      assert.ok(
        toolNames.includes("list_files"),
        "Should have list_files tool"
      );

      await publicServer.disconnect();
      await privateClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await privateClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    // Add delay to ensure ports are fully released
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("🖥️ System information tool execution", async () => {
    console.log("🖥️ Testing get_system_info tool...");

    const socksPort = 3081;
    const clientPort = 10081;
    const socksServer = new SOCKSServer(socksPort);
    const privateClient = new PrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await privateClient.start();
      await publicServer.connect();

      const result = await publicServer.callTool("get_system_info", {});
      const systemInfo = JSON.parse(result.content[0].text);

      console.log("📨 MCP Request: tools/call -> get_system_info");
      console.log(
        `📬 MCP Response: Platform: ${systemInfo.platform}, Arch: ${systemInfo.arch}`
      );

      assert.ok(result.content, "Result should have content");
      assert.ok(systemInfo.platform, "Should have platform information");
      assert.ok(systemInfo.arch, "Should have architecture information");
      assert.ok(systemInfo.node_version, "Should have Node.js version");

      await publicServer.disconnect();
      await privateClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await privateClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("🧮 Mathematical calculator tool", async () => {
    console.log("🧮 Testing calculate tool...");

    const socksPort = 3082;
    const clientPort = 10082;
    const socksServer = new SOCKSServer(socksPort);
    const privateClient = new PrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await privateClient.start();
      await publicServer.connect();

      const expression = "2 + 2 * 3";
      const result = await publicServer.callTool("calculate", { expression });
      const calculation = JSON.parse(result.content[0].text);

      console.log(`📨 MCP Request: tools/call -> calculate("${expression}")`);
      console.log(`📬 MCP Response: ${expression} = ${calculation.result}`);

      assert.ok(result.content, "Result should have content");
      assert.ok(calculation.result === 8, "Should calculate 2 + 2 * 3 = 8");
      assert.ok(
        calculation.expression === expression,
        "Should echo expression"
      );

      await publicServer.disconnect();
      await privateClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await privateClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("📁 File system operations", async () => {
    console.log("📁 Testing file system tools...");

    const socksPort = 3083;
    const clientPort = 10083;
    const socksServer = new SOCKSServer(socksPort);
    const privateClient = new PrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await privateClient.start();
      await publicServer.connect();

      // Test list_files
      const listResult = await publicServer.callTool("list_files", {
        directory: "./src",
      });
      const fileList = JSON.parse(listResult.content[0].text);

      console.log(`📨 MCP Request: tools/call -> list_files("./src")`);
      console.log(
        `📬 MCP Response: Found ${fileList.count} items in ${fileList.directory}`
      );

      assert.ok(Array.isArray(fileList.files), "File list should be an array");
      assert.ok(fileList.count > 0, "Should have files in src directory");

      // Test read_file
      const readResult = await publicServer.callTool("read_file", {
        path: "package.json",
      });
      const fileContent = JSON.parse(readResult.content[0].text);

      console.log(`📨 MCP Request: tools/call -> read_file("package.json")`);
      console.log(`📬 MCP Response: Read ${fileContent.size} characters`);

      assert.ok(fileContent.content.length > 0, "Should have file content");
      assert.ok(
        fileContent.path === "package.json",
        "Should have correct path"
      );

      await publicServer.disconnect();
      await privateClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await privateClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("📝 Logging system", async () => {
    console.log("📝 Testing logging system...");

    const socksPort = 3084;
    const clientPort = 10084;
    const socksServer = new SOCKSServer(socksPort);
    const privateClient = new PrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await privateClient.start();
      await publicServer.connect();

      const result = await publicServer.callTool("write_log", {
        message: "E2E test log entry",
        level: "info",
      });
      const logResponse = JSON.parse(result.content[0].text);

      console.log(
        `📨 MCP Request: tools/call -> write_log("E2E test log entry", "info")`
      );
      console.log(
        `📬 MCP Response: Log entry written (total: ${logResponse.total_entries})`
      );

      assert.ok(
        logResponse.logged.message === "E2E test log entry",
        "Should log message"
      );
      assert.ok(
        logResponse.logged.level === "info",
        "Should log at info level"
      );
      assert.ok(logResponse.total_entries >= 1, "Should track total entries");

      await publicServer.disconnect();
      await privateClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await privateClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("🏓 Ping connectivity", async () => {
    console.log("🏓 Testing ping tool...");

    const socksPort = 3085;
    const clientPort = 10085;
    const socksServer = new SOCKSServer(socksPort);
    const privateClient = new PrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await privateClient.start();
      await publicServer.connect();

      const message = "E2E connectivity test";
      const result = await publicServer.callTool("ping", { message });

      console.log(`📨 MCP Request: tools/call -> ping("${message}")`);
      console.log(`📬 MCP Response: ${result.content[0].text}`);

      assert.ok(
        result.content[0].text.includes(message),
        "Should echo message"
      );
      assert.ok(
        result.content[0].text.includes("Pong!"),
        "Should respond with Pong!"
      );
      assert.ok(
        result.content[0].text.includes("timestamp"),
        "Should include timestamp"
      );

      await publicServer.disconnect();
      await privateClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await privateClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("⚠️ Error handling validation", async () => {
    console.log("⚠️ Testing error handling...");

    const socksPort = 3086;
    const clientPort = 10086;
    const socksServer = new SOCKSServer(socksPort);
    const privateClient = new PrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await privateClient.start();
      await publicServer.connect();

      // Test invalid tool
      try {
        await publicServer.callTool("invalid_tool", {});
        assert.fail("Should have thrown error for invalid tool");
      } catch (error) {
        console.log("✅ Invalid tool error handled correctly");
        assert.ok(
          error.message && error.message.length > 0,
          "Should have error message for invalid tool"
        );
      }

      // Test invalid calculation
      try {
        await publicServer.callTool("calculate", { expression: "invalid!" });
        assert.fail("Should have thrown error for invalid expression");
      } catch (error) {
        console.log(
          "✅ Invalid expression error handled correctly:",
          error.message
        );
        assert.ok(
          error.message && error.message.length > 0,
          "Should have error message for invalid expression"
        );
      }

      await publicServer.disconnect();
      await privateClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await privateClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("🎯 Concurrent operations test", async () => {
    console.log("🎯 Testing concurrent operations...");

    const socksPort = 3087;
    const clientPort = 10087;
    const socksServer = new SOCKSServer(socksPort);
    const privateClient = new PrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await privateClient.start();
      await publicServer.connect();

      const operations = [
        () => publicServer.callTool("ping", { message: "Concurrent 1" }),
        () => publicServer.callTool("calculate", { expression: "10 + 5" }),
        () => publicServer.callTool("get_system_info", {}),
        () => publicServer.callTool("ping", { message: "Concurrent 2" }),
      ];

      const startTime = Date.now();
      const results = await Promise.all(operations.map((op) => op()));
      const duration = Date.now() - startTime;

      console.log(
        `⚡ ${operations.length} concurrent operations completed in ${duration}ms`
      );

      assert.ok(
        results.length === operations.length,
        "All operations should complete"
      );
      results.forEach((result) => {
        assert.ok(result.content, "Each operation should have content");
      });

      await publicServer.disconnect();
      await privateClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await privateClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("📈 Transport verification summary", async () => {
    console.log("📈 Final transport verification...");

    const socksPort = 3088;
    const clientPort = 10088;
    const socksServer = new SOCKSServer(socksPort);
    const privateClient = new PrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await privateClient.start();
      await publicServer.connect();

      // Verify SOCKS proxy configuration
      assert.ok(
        publicServer.socksProxyUrl === `socks5://localhost:${socksPort}`,
        "Should use SOCKS proxy"
      );
      assert.ok(publicServer.connected, "Should be connected through proxy");

      // Final connectivity test
      const result = await publicServer.callTool("ping", {
        message: "Final E2E verification through SOCKS",
      });

      console.log("📡 Transport verification complete:");
      console.log(
        `   ✅ Public server -> SOCKS proxy (localhost:${socksPort})`
      );
      console.log(
        `   ✅ SOCKS proxy -> Private client (localhost:${clientPort})`
      );
      console.log("   ✅ 6 tools accessible through SOCKS transport");
      console.log("   ✅ Real MCP protocol communication verified");
      console.log("   ✅ Error handling and concurrent operations tested");

      assert.ok(
        result.content[0].text.includes("Final E2E verification"),
        "Final test should work"
      );

      await publicServer.disconnect();
      await privateClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await privateClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});
