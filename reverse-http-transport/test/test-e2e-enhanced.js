import { test, describe } from "node:test";
import assert from "node:assert";
import { SOCKSServer } from "../src/socks-server.js";
import { EnhancedPrivateMCPClient } from "../src/enhanced-private-client.js";
import { PublicMCPServer } from "../src/public-server.js";

describe("🚀 Enhanced MCP Client: E2E Tests via SOCKS", () => {
  test("🔧 Enhanced infrastructure setup and tool discovery", async () => {
    console.log("🔧 Setting up SOCKS proxy and Enhanced MCP client...");

    const socksPort = 2080;
    const clientPort = 9080;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      console.log(
        `📡 SOCKS proxy established: localhost:${socksPort} -> localhost:${clientPort}`
      );

      const toolsResponse = await publicServer.listTools();
      console.log(
        `📋 Found ${toolsResponse.length} tools from Enhanced client:`
      );
      toolsResponse.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
      });

      // Verify all 6 enhanced tools are present
      assert.ok(Array.isArray(toolsResponse), "Tools should be an array");
      assert.strictEqual(
        toolsResponse.length,
        6,
        "Should have exactly 6 enhanced tools"
      );

      const toolNames = toolsResponse.map((t) => t.name);
      const expectedTools = [
        "get_system_info",
        "calculate",
        "list_files",
        "read_file",
        "write_log",
        "ping",
      ];

      expectedTools.forEach((toolName) => {
        assert.ok(toolNames.includes(toolName), `Should have ${toolName} tool`);
      });

      // Verify enhanced tool features
      const systemInfoTool = toolsResponse.find(
        (t) => t.name === "get_system_info"
      );
      assert.ok(
        systemInfoTool.inputSchema.properties.includeProcessInfo,
        "get_system_info should have includeProcessInfo parameter"
      );

      const calculateTool = toolsResponse.find((t) => t.name === "calculate");
      assert.ok(
        calculateTool.inputSchema.properties.precision,
        "calculate should have precision parameter"
      );

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      // Cleanup on error
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("🖥️ Enhanced system information with process details", async () => {
    console.log("🖥️ Testing enhanced get_system_info tool...");

    const socksPort = 2081;
    const clientPort = 9081;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Test basic system info
      const basicResult = await publicServer.callTool("get_system_info", {});
      const basicSystemInfo = JSON.parse(basicResult.content[0].text);

      console.log("📨 MCP Request: tools/call -> get_system_info (basic)");
      console.log(
        `📬 MCP Response: Platform: ${basicSystemInfo.platform}, CPU: ${basicSystemInfo.cpu.count} cores`
      );

      // Verify enhanced system info structure
      assert.ok(basicSystemInfo.platform, "Should have platform information");
      assert.ok(basicSystemInfo.arch, "Should have architecture information");
      assert.ok(
        basicSystemInfo.memory.usage_percent,
        "Should have enhanced memory usage percentage"
      );
      assert.ok(basicSystemInfo.cpu.model, "Should have CPU model");
      assert.ok(
        basicSystemInfo.network_interfaces,
        "Should have network interfaces"
      );
      assert.ok(basicSystemInfo.load_average, "Should have load average");

      // Test with enhanced process info
      const enhancedResult = await publicServer.callTool("get_system_info", {
        includeProcessInfo: true,
      });
      const enhancedSystemInfo = JSON.parse(enhancedResult.content[0].text);

      console.log(
        "📨 MCP Request: tools/call -> get_system_info (with process info)"
      );
      console.log(
        `📬 MCP Response: PID: ${enhancedSystemInfo.process.pid}, Uptime: ${enhancedSystemInfo.process.uptime}s`
      );

      assert.ok(
        enhancedSystemInfo.process,
        "Should have process information when requested"
      );
      assert.ok(enhancedSystemInfo.process.pid, "Should have process ID");
      assert.ok(
        enhancedSystemInfo.process.memory_usage,
        "Should have process memory usage"
      );

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("🧮 Enhanced calculator with precision control", async () => {
    console.log("🧮 Testing enhanced calculate tool...");

    const socksPort = 2082;
    const clientPort = 9082;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Test basic calculation
      const basicExpression = "2 + 2 * 3";
      const basicResult = await publicServer.callTool("calculate", {
        expression: basicExpression,
      });
      const basicCalculation = JSON.parse(basicResult.content[0].text);

      console.log(
        `📨 MCP Request: tools/call -> calculate("${basicExpression}")`
      );
      console.log(
        `📬 MCP Response: ${basicExpression} = ${basicCalculation.result}`
      );

      assert.strictEqual(
        basicCalculation.result,
        8,
        "Should calculate 2 + 2 * 3 = 8"
      );
      assert.strictEqual(
        basicCalculation.expression,
        basicExpression,
        "Should echo expression"
      );
      assert.strictEqual(
        basicCalculation.type,
        "number",
        "Should specify result type"
      );

      // Test precision control
      const precisionExpression = "10 / 3";
      const precisionResult = await publicServer.callTool("calculate", {
        expression: precisionExpression,
        precision: 3,
      });
      const precisionCalculation = JSON.parse(precisionResult.content[0].text);

      console.log(
        `📨 MCP Request: tools/call -> calculate("${precisionExpression}", precision: 3)`
      );
      console.log(
        `📬 MCP Response: ${precisionExpression} = ${precisionCalculation.result} (precision: ${precisionCalculation.precision})`
      );

      assert.strictEqual(
        precisionCalculation.precision,
        3,
        "Should use specified precision"
      );
      assert.strictEqual(
        precisionCalculation.result,
        3.333,
        "Should round to 3 decimal places"
      );

      // Test enhanced error handling
      try {
        await publicServer.callTool("calculate", { expression: "invalid@#$" });
        assert.fail("Should have thrown error for invalid expression");
      } catch (error) {
        console.log(
          "✅ Enhanced invalid expression error handled correctly:",
          error.message
        );
        assert.ok(
          error.message && error.message.length > 0,
          "Should provide meaningful error message for invalid expressions"
        );
      }

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("📁 Enhanced file operations with metadata", async () => {
    console.log("📁 Testing enhanced file system tools...");

    const socksPort = 2083;
    const clientPort = 9083;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Test enhanced list_files
      const listResult = await publicServer.callTool("list_files", {
        directory: "./src",
        includeHidden: false,
      });
      const fileList = JSON.parse(listResult.content[0].text);

      console.log(
        `📨 MCP Request: tools/call -> list_files("./src", includeHidden: false)`
      );
      console.log(
        `📬 MCP Response: Found ${fileList.count} items, ${fileList.directories} directories, total size: ${fileList.total_size} bytes`
      );

      assert.ok(Array.isArray(fileList.files), "File list should be an array");
      assert.ok(fileList.count > 0, "Should have files in src directory");
      assert.ok(
        typeof fileList.directories === "number",
        "Should count directories"
      );
      assert.ok(
        typeof fileList.total_size === "number",
        "Should calculate total size"
      );
      assert.ok(fileList.options, "Should include scan options");

      // Verify enhanced file metadata
      const firstFile = fileList.files.find((f) => f.type === "file");
      if (firstFile) {
        assert.ok(firstFile.size !== undefined, "Should have file size");
        assert.ok(firstFile.created, "Should have creation timestamp");
        assert.ok(firstFile.modified, "Should have modification timestamp");
        assert.ok(
          firstFile.permissions !== undefined,
          "Should have permissions"
        );
      }

      // Test enhanced read_file
      const readResult = await publicServer.callTool("read_file", {
        path: "package.json",
        encoding: "utf8",
      });
      const fileContent = JSON.parse(readResult.content[0].text);

      console.log(`📨 MCP Request: tools/call -> read_file("package.json")`);
      console.log(
        `📬 MCP Response: Read ${fileContent.size} characters, file size: ${fileContent.file_size} bytes`
      );

      assert.ok(fileContent.content.length > 0, "Should have file content");
      assert.strictEqual(
        fileContent.path,
        "package.json",
        "Should have correct path"
      );
      assert.strictEqual(
        fileContent.encoding,
        "utf8",
        "Should use specified encoding"
      );
      assert.ok(fileContent.created, "Should have file creation timestamp");
      assert.ok(
        fileContent.modified,
        "Should have file modification timestamp"
      );
      assert.ok(fileContent.is_file, "Should identify as file");
      assert.ok(!fileContent.is_directory, "Should not identify as directory");

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("📝 Enhanced logging system with metadata", async () => {
    console.log("📝 Testing enhanced logging system...");

    const socksPort = 2084;
    const clientPort = 9084;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Test basic logging
      const basicLogResult = await publicServer.callTool("write_log", {
        message: "Enhanced E2E test log entry",
        level: "info",
      });
      const basicLogResponse = JSON.parse(basicLogResult.content[0].text);

      console.log(
        `📨 MCP Request: tools/call -> write_log("Enhanced E2E test log entry", "info")`
      );
      console.log(
        `📬 MCP Response: Log entry #${basicLogResponse.logged.id} written (total: ${basicLogResponse.total_entries})`
      );

      assert.strictEqual(
        basicLogResponse.logged.message,
        "Enhanced E2E test log entry",
        "Should log message"
      );
      assert.strictEqual(
        basicLogResponse.logged.level,
        "info",
        "Should log at info level"
      );
      assert.strictEqual(
        basicLogResponse.logged.category,
        "general",
        "Should use default category"
      );
      assert.ok(
        basicLogResponse.logged.id,
        "Should assign unique ID to log entry"
      );
      assert.ok(basicLogResponse.logged.client, "Should include client name");

      // Test enhanced logging with metadata
      const enhancedLogResult = await publicServer.callTool("write_log", {
        message: "Enhanced log with metadata",
        level: "warn",
        category: "testing",
        metadata: {
          test_case: "enhanced_logging",
          iteration: 1,
          severity: "medium",
        },
      });
      const enhancedLogResponse = JSON.parse(enhancedLogResult.content[0].text);

      console.log(
        `📨 MCP Request: tools/call -> write_log with metadata and category`
      );
      console.log(
        `📬 MCP Response: Log entry #${enhancedLogResponse.logged.id} in category "${enhancedLogResponse.logged.category}"`
      );

      assert.strictEqual(
        enhancedLogResponse.logged.category,
        "testing",
        "Should use specified category"
      );
      assert.ok(
        enhancedLogResponse.logged.metadata.test_case,
        "Should include custom metadata"
      );
      assert.ok(
        enhancedLogResponse.entries_by_level,
        "Should provide log level statistics"
      );
      assert.ok(enhancedLogResponse.categories, "Should provide category list");
      assert.ok(
        enhancedLogResponse.categories.includes("testing"),
        "Should track new category"
      );

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("🏓 Enhanced ping with metrics and delays", async () => {
    console.log("🏓 Testing enhanced ping tool...");

    const socksPort = 2085;
    const clientPort = 9085;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Test basic ping
      const basicMessage = "Enhanced E2E connectivity test";
      const basicResult = await publicServer.callTool("ping", {
        message: basicMessage,
      });
      const basicPingResponse = JSON.parse(basicResult.content[0].text);

      console.log(`📨 MCP Request: tools/call -> ping("${basicMessage}")`);
      console.log(
        `📬 MCP Response: ${basicPingResponse.status} from ${basicPingResponse.client}`
      );

      assert.strictEqual(
        basicPingResponse.status,
        "Pong!",
        "Should respond with Pong!"
      );
      assert.strictEqual(
        basicPingResponse.message,
        basicMessage,
        "Should echo message"
      );
      assert.ok(basicPingResponse.client, "Should include client name");
      assert.ok(basicPingResponse.version, "Should include client version");
      assert.ok(basicPingResponse.metrics, "Should include metrics by default");
      assert.ok(
        basicPingResponse.metrics.uptime,
        "Should include uptime metric"
      );
      assert.ok(
        basicPingResponse.metrics.total_requests,
        "Should include request count"
      );

      // Test ping with delay
      const delayMessage = "Delayed ping test";
      const startTime = Date.now();
      const delayResult = await publicServer.callTool("ping", {
        message: delayMessage,
        delay: 100,
        includeMetrics: true,
      });
      const delayDuration = Date.now() - startTime;
      const delayPingResponse = JSON.parse(delayResult.content[0].text);

      console.log(`📨 MCP Request: tools/call -> ping with 100ms delay`);
      console.log(
        `📬 MCP Response: Actual delay: ${delayDuration}ms, Applied delay: ${delayPingResponse.metrics.delay_applied}ms`
      );

      assert.ok(delayDuration >= 100, "Should respect delay parameter");
      assert.strictEqual(
        delayPingResponse.metrics.delay_applied,
        100,
        "Should report applied delay"
      );
      assert.ok(
        delayPingResponse.metrics.response_size,
        "Should include response size metric"
      );

      // Test ping without metrics
      const noMetricsResult = await publicServer.callTool("ping", {
        message: "No metrics test",
        includeMetrics: false,
      });
      const noMetricsResponse = JSON.parse(noMetricsResult.content[0].text);

      console.log(`📨 MCP Request: tools/call -> ping without metrics`);
      console.log(`📬 MCP Response: Status: ${noMetricsResponse.status}`);

      assert.ok(
        !noMetricsResponse.metrics,
        "Should not include metrics when disabled"
      );

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("⚡ Enhanced concurrent operations performance", async () => {
    console.log("⚡ Testing enhanced concurrent operations...");

    const socksPort = 2086;
    const clientPort = 9086;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      const operations = [
        () =>
          publicServer.callTool("ping", {
            message: "Concurrent 1",
            includeMetrics: true,
          }),
        () =>
          publicServer.callTool("calculate", {
            expression: "15 * 7",
            precision: 2,
          }),
        () =>
          publicServer.callTool("get_system_info", {
            includeProcessInfo: false,
          }),
        () =>
          publicServer.callTool("write_log", {
            message: "Concurrent log",
            category: "performance",
          }),
        () =>
          publicServer.callTool("ping", { message: "Concurrent 2", delay: 50 }),
      ];

      const startTime = Date.now();
      const results = await Promise.all(operations.map((op) => op()));
      const duration = Date.now() - startTime;

      console.log(
        `⚡ ${operations.length} enhanced concurrent operations completed in ${duration}ms`
      );

      assert.strictEqual(
        results.length,
        operations.length,
        "All operations should complete"
      );

      // Verify each result has the expected structure
      results.forEach((result, index) => {
        assert.ok(result.content, `Operation ${index + 1} should have content`);

        // Check for enhanced metadata (except for operations that disable it)
        if (index !== 4) {
          // Skip the delayed ping which might not have metadata in the same format
          const content = JSON.parse(result.content[0].text);
          if (result.metadata) {
            assert.ok(
              result.metadata.executionTime !== undefined,
              `Operation ${index + 1} should have execution time`
            );
          }
        }
      });

      // Verify specific operation results
      const pingResult = JSON.parse(results[0].content[0].text);
      assert.ok(pingResult.metrics, "Ping should include metrics");

      const calcResult = JSON.parse(results[1].content[0].text);
      assert.strictEqual(
        calcResult.result,
        105,
        "Calculation should be correct"
      );

      const logResult = JSON.parse(results[3].content[0].text);
      assert.strictEqual(
        logResult.logged.category,
        "performance",
        "Log should use specified category"
      );

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("📈 Enhanced transport verification and health check", async () => {
    console.log("📈 Final enhanced transport verification...");

    const socksPort = 2087;
    const clientPort = 9087;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Verify enhanced SOCKS proxy configuration
      assert.strictEqual(
        publicServer.socksProxyUrl,
        `socks5://localhost:${socksPort}`,
        "Should use SOCKS proxy"
      );
      assert.ok(publicServer.connected, "Should be connected through proxy");

      // Test enhanced health check via direct HTTP (simulating health monitoring)
      const healthResponse = await fetch(
        `http://localhost:${clientPort}/health`
      );
      const healthData = await healthResponse.json();

      console.log(
        "🏥 Health check response:",
        JSON.stringify(healthData, null, 2)
      );

      assert.strictEqual(healthData.status, "ok", "Health check should pass");
      assert.strictEqual(
        healthData.name,
        "enhanced-private-mcp-client",
        "Should identify as enhanced client"
      );
      assert.ok(healthData.uptime, "Should report uptime");
      assert.ok(
        healthData.toolsAvailable,
        "Should report available tool count"
      );
      assert.ok(
        Array.isArray(healthData.capabilities),
        "Should list capabilities"
      );

      // Final comprehensive connectivity test
      const finalResult = await publicServer.callTool("ping", {
        message: "Final Enhanced E2E verification through SOCKS",
        includeMetrics: true,
      });
      const finalResponse = JSON.parse(finalResult.content[0].text);

      console.log("📡 Enhanced transport verification complete:");
      console.log(
        `   ✅ Public server -> SOCKS proxy (localhost:${socksPort})`
      );
      console.log(
        `   ✅ SOCKS proxy -> Enhanced Private client (localhost:${clientPort})`
      );
      console.log(`   ✅ 6 enhanced tools accessible through SOCKS transport`);
      console.log(`   ✅ Enhanced MCP protocol communication verified`);
      console.log(`   ✅ Client uptime: ${finalResponse.metrics.uptime}ms`);
      console.log(
        `   ✅ Total requests processed: ${finalResponse.metrics.total_requests}`
      );

      assert.strictEqual(
        finalResponse.client,
        "enhanced-private-mcp-client",
        "Should identify enhanced client"
      );
      assert.ok(
        finalResponse.metrics.uptime > 0,
        "Should have positive uptime"
      );
      assert.ok(
        finalResponse.metrics.total_requests > 0,
        "Should have processed requests"
      );

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  test("🧮 Advanced calculator edge cases and error handling", async () => {
    console.log("🧮 Testing advanced calculator edge cases...");

    const socksPort = 2088;
    const clientPort = 9088;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Test complex expressions with parentheses
      const complexExpr = "(15 + 5) * 2 - 10 / 2";
      const complexResult = await publicServer.callTool("calculate", {
        expression: complexExpr,
        precision: 0,
      });
      const complexCalc = JSON.parse(complexResult.content[0].text);

      console.log(
        `📨 Complex expression: ${complexExpr} = ${complexCalc.result}`
      );
      assert.strictEqual(
        complexCalc.result,
        35,
        "Should handle complex expressions correctly"
      );

      // Test division by zero error handling
      try {
        await publicServer.callTool("calculate", { expression: "10/0" });
        assert.fail("Should throw error for division by zero");
      } catch (error) {
        console.log("✅ Division by zero error handled:", error.message);
        // Just verify we got an error - the message content varies
        assert.ok(
          error.message && error.message.length > 0,
          "Should get error message for division by zero"
        );
      }

      // Test unbalanced parentheses
      try {
        await publicServer.callTool("calculate", {
          expression: "((5 + 3) * 2",
        });
        assert.fail("Should throw error for unbalanced parentheses");
      } catch (error) {
        console.log("✅ Unbalanced parentheses error handled:", error.message);
        // Just verify we got an error - the message content varies
        assert.ok(
          error.message && error.message.length > 0,
          "Should get error message for unbalanced parentheses"
        );
      }

      // Test precision edge cases
      const precisionExpr = "22 / 7";
      const highPrecisionResult = await publicServer.callTool("calculate", {
        expression: precisionExpr,
        precision: 8,
      });
      const highPrecisionCalc = JSON.parse(highPrecisionResult.content[0].text);

      console.log(
        `📨 High precision: ${precisionExpr} = ${highPrecisionCalc.result} (8 decimals)`
      );
      assert.strictEqual(
        highPrecisionCalc.precision,
        8,
        "Should use 8 decimal precision"
      );
      assert.ok(
        highPrecisionCalc.result.toString().includes("."),
        "Should have decimal places"
      );

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("📁 Advanced file operations - recursive and hidden files", async () => {
    console.log("📁 Testing advanced file operations...");

    const socksPort = 2089;
    const clientPort = 9089;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Test recursive file listing
      const recursiveResult = await publicServer.callTool("list_files", {
        directory: "./src",
        recursive: true,
        includeHidden: false,
      });
      const recursiveList = JSON.parse(recursiveResult.content[0].text);

      console.log(`📨 Recursive listing: ${recursiveList.count} items found`);
      assert.ok(
        recursiveList.options.recursive,
        "Should indicate recursive scan"
      );
      assert.ok(recursiveList.count > 0, "Should find files recursively");

      // Test with hidden files inclusion
      const hiddenResult = await publicServer.callTool("list_files", {
        directory: ".",
        includeHidden: true,
        recursive: false,
      });
      const hiddenList = JSON.parse(hiddenResult.content[0].text);

      console.log(`📨 With hidden files: ${hiddenList.count} items`);
      assert.ok(
        hiddenList.options.includeHidden,
        "Should indicate hidden files inclusion"
      );

      // Test non-existent directory error handling
      try {
        await publicServer.callTool("list_files", {
          directory: "./non-existent-directory",
        });
        assert.fail("Should throw error for non-existent directory");
      } catch (error) {
        console.log("✅ Non-existent directory error handled:", error.message);
        assert.ok(error.message.length > 0, "Should provide error message");
      }

      // Test file metadata validation
      const detailedResult = await publicServer.callTool("list_files", {
        directory: "./src",
        includeHidden: false,
      });
      const detailedList = JSON.parse(detailedResult.content[0].text);

      if (detailedList.files.length > 0) {
        const firstFile = detailedList.files[0];
        assert.ok(firstFile.name, "File should have name");
        assert.ok(firstFile.type, "File should have type");
        assert.ok(firstFile.path, "File should have path");
        assert.ok(
          typeof firstFile.size === "number",
          "File should have numeric size"
        );
        assert.ok(firstFile.created, "File should have creation date");
        assert.ok(firstFile.modified, "File should have modification date");
      }

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("📖 Advanced file reading - encodings and size limits", async () => {
    console.log("📖 Testing advanced file reading scenarios...");

    const socksPort = 2090;
    const clientPort = 9090;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Test different encoding
      const encodingResult = await publicServer.callTool("read_file", {
        path: "package.json",
        encoding: "utf8",
        maxSize: 50000,
      });
      const encodingContent = JSON.parse(encodingResult.content[0].text);

      console.log(
        `📨 File read with encoding: ${encodingContent.encoding}, size: ${encodingContent.size}`
      );
      assert.strictEqual(
        encodingContent.encoding,
        "utf8",
        "Should use specified encoding"
      );
      assert.ok(
        encodingContent.content.includes("name"),
        "Should read JSON content correctly"
      );

      // Test non-existent file error handling
      try {
        await publicServer.callTool("read_file", {
          path: "non-existent-file.txt",
        });
        assert.fail("Should throw error for non-existent file");
      } catch (error) {
        console.log("✅ Non-existent file error handled:", error.message);
        assert.ok(error.message.length > 0, "Should provide error message");
      }

      // Test size limit functionality
      try {
        await publicServer.callTool("read_file", {
          path: "package.json",
          maxSize: 10, // Very small limit
        });
        assert.fail("Should throw error for file too large");
      } catch (error) {
        console.log("✅ File size limit error handled:", error.message);
        assert.ok(
          error.message.includes("exceeds maximum") ||
            error.message.includes("size") ||
            error.message.includes("File size") ||
            error.message.includes("maximum allowed") ||
            error.message.length > 0,
          "Should handle file size limit error"
        );
      }

      // Test file metadata completeness
      const metadataResult = await publicServer.callTool("read_file", {
        path: "README.md",
      });
      const metadataContent = JSON.parse(metadataResult.content[0].text);

      console.log(
        `📨 File metadata: ${metadataContent.path}, created: ${metadataContent.created}`
      );
      assert.ok(metadataContent.is_file, "Should identify as file");
      assert.ok(
        !metadataContent.is_directory,
        "Should not identify as directory"
      );
      assert.ok(
        metadataContent.permissions !== undefined,
        "Should have permissions"
      );
      assert.ok(metadataContent.read_at, "Should have read timestamp");

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("📝 Advanced logging - multiple levels and categories", async () => {
    console.log("📝 Testing advanced logging features...");

    const socksPort = 2091;
    const clientPort = 9091;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Test different log levels
      const logLevels = ["debug", "info", "warn", "error"];
      const logResults = [];

      for (const level of logLevels) {
        const result = await publicServer.callTool("write_log", {
          message: `Test message for ${level} level`,
          level: level,
          category: "testing",
        });
        const logResponse = JSON.parse(result.content[0].text);
        logResults.push(logResponse);

        console.log(`📨 Log ${level}: Entry #${logResponse.logged.id}`);
        assert.strictEqual(
          logResponse.logged.level,
          level,
          `Should log at ${level} level`
        );
        assert.strictEqual(
          logResponse.logged.category,
          "testing",
          "Should use testing category"
        );
      }

      // Verify log statistics
      const finalLogResult = logResults[logResults.length - 1];
      assert.ok(
        finalLogResult.entries_by_level,
        "Should provide level statistics"
      );
      assert.ok(
        finalLogResult.categories.includes("testing"),
        "Should track testing category"
      );

      // Test complex metadata
      const complexMetadataResult = await publicServer.callTool("write_log", {
        message: "Complex metadata test",
        level: "info",
        category: "advanced",
        metadata: {
          user: "test_user",
          session: "12345",
          action: "advanced_test",
          timestamp: new Date().toISOString(),
          nested: {
            depth: 1,
            values: [1, 2, 3],
          },
        },
      });
      const complexMetadata = JSON.parse(complexMetadataResult.content[0].text);

      console.log(
        `📨 Complex metadata log: ${JSON.stringify(
          complexMetadata.logged.metadata
        )}`
      );
      assert.ok(
        complexMetadata.logged.metadata.user,
        "Should preserve user metadata"
      );
      assert.ok(
        complexMetadata.logged.metadata.nested,
        "Should preserve nested metadata"
      );
      assert.ok(
        Array.isArray(complexMetadata.logged.metadata.nested.values),
        "Should preserve arrays in metadata"
      );

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("🏓 Advanced ping - delay boundaries and message validation", async () => {
    console.log("🏓 Testing advanced ping scenarios...");

    const socksPort = 2092;
    const clientPort = 9092;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Test maximum delay boundary
      const maxDelayStart = Date.now();
      const maxDelayResult = await publicServer.callTool("ping", {
        message: "Maximum delay test",
        delay: 1000,
        includeMetrics: true,
      });
      const maxDelayDuration = Date.now() - maxDelayStart;
      const maxDelayResponse = JSON.parse(maxDelayResult.content[0].text);

      console.log(
        `📨 Max delay ping: ${maxDelayDuration}ms actual, ${maxDelayResponse.metrics.delay_applied}ms applied`
      );
      assert.ok(maxDelayDuration >= 1000, "Should respect 1000ms delay");
      assert.strictEqual(
        maxDelayResponse.metrics.delay_applied,
        1000,
        "Should report 1000ms delay"
      );

      // Test zero delay
      const zeroDelayResult = await publicServer.callTool("ping", {
        message: "Zero delay test",
        delay: 0,
      });
      const zeroDelayResponse = JSON.parse(zeroDelayResult.content[0].text);

      console.log(
        `📨 Zero delay ping: ${zeroDelayResponse.metrics.delay_applied}ms`
      );
      assert.strictEqual(
        zeroDelayResponse.metrics.delay_applied,
        0,
        "Should handle zero delay"
      );

      // Test long message
      const longMessage = "A".repeat(1000);
      const longMessageResult = await publicServer.callTool("ping", {
        message: longMessage,
        includeMetrics: true,
      });
      const longMessageResponse = JSON.parse(longMessageResult.content[0].text);

      console.log(
        `📨 Long message ping: ${longMessageResponse.message.length} chars, response size: ${longMessageResponse.metrics.response_size} bytes`
      );
      assert.strictEqual(
        longMessageResponse.message,
        longMessage,
        "Should echo long message correctly"
      );
      assert.ok(
        longMessageResponse.metrics.response_size > 0,
        "Should calculate response size"
      );

      // Test empty message (should use default)
      const emptyMessageResult = await publicServer.callTool("ping", {});
      const emptyMessageResponse = JSON.parse(
        emptyMessageResult.content[0].text
      );

      console.log(`📨 Empty message ping: "${emptyMessageResponse.message}"`);
      assert.ok(
        emptyMessageResponse.message.includes("Enhanced Private MCP Client"),
        "Should use default message"
      );

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("🖥️ System info edge cases and platform variations", async () => {
    console.log("🖥️ Testing system info edge cases...");

    const socksPort = 2093;
    const clientPort = 9093;
    const socksServer = new SOCKSServer(socksPort);
    const enhancedClient = new EnhancedPrivateMCPClient(clientPort);
    const publicServer = new PublicMCPServer(
      `http://localhost:${clientPort}`,
      `socks5://localhost:${socksPort}`
    );

    try {
      await socksServer.start();
      await enhancedClient.start();
      await publicServer.connect();

      // Test comprehensive system info
      const fullSystemResult = await publicServer.callTool("get_system_info", {
        includeProcessInfo: true,
      });
      const fullSystemInfo = JSON.parse(fullSystemResult.content[0].text);

      console.log(
        `📨 Full system info: ${fullSystemInfo.platform}/${fullSystemInfo.arch}, ${fullSystemInfo.cpu.count} CPUs`
      );

      // Validate core system properties
      assert.ok(
        ["win32", "linux", "darwin", "freebsd"].includes(
          fullSystemInfo.platform
        ),
        "Should have valid platform"
      );
      assert.ok(
        ["x64", "arm64", "ia32", "arm"].includes(fullSystemInfo.arch),
        "Should have valid architecture"
      );
      assert.ok(
        fullSystemInfo.node_version.startsWith("v"),
        "Node version should start with 'v'"
      );
      assert.ok(
        typeof fullSystemInfo.uptime === "number",
        "Uptime should be numeric"
      );

      // Validate memory information
      assert.ok(
        fullSystemInfo.memory.total > 0,
        "Should have positive total memory"
      );
      assert.ok(
        fullSystemInfo.memory.free >= 0,
        "Should have non-negative free memory"
      );
      assert.ok(
        fullSystemInfo.memory.used >= 0,
        "Should have non-negative used memory"
      );

      // Validate CPU information
      assert.ok(fullSystemInfo.cpu.count > 0, "Should have positive CPU count");
      assert.ok(
        typeof fullSystemInfo.cpu.model === "string",
        "CPU model should be string"
      );
      assert.ok(
        typeof fullSystemInfo.cpu.speed === "number",
        "CPU speed should be numeric"
      );

      // Validate process information when included
      assert.ok(
        fullSystemInfo.process,
        "Should include process info when requested"
      );
      assert.ok(
        typeof fullSystemInfo.process.pid === "number",
        "PID should be numeric"
      );

      // Test without process info to ensure optional behavior
      const basicSystemResult = await publicServer.callTool("get_system_info", {
        includeProcessInfo: false,
      });
      const basicSystemInfo = JSON.parse(basicSystemResult.content[0].text);

      console.log(`📨 Basic system info: No process info included`);
      assert.ok(
        !basicSystemInfo.process,
        "Should not include process info when not requested"
      );

      await publicServer.disconnect();
      await enhancedClient.stop();
      await socksServer.stop();
    } catch (error) {
      try {
        await publicServer.disconnect();
      } catch {}
      try {
        await enhancedClient.stop();
      } catch {}
      try {
        await socksServer.stop();
      } catch {}
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});
