import { SOCKSServer } from "./socks-server.js";
import { PrivateMCPClient } from "./private-client.js";
import { PublicMCPServer } from "./public-server.js";

/**
 * Simple Demo Script
 * Demonstrates SOCKS-based MCP communication
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runDemo() {
  console.log("🚀 Starting SOCKS-based MCP Demo\n");

  let socksServer, privateClient, publicServer;

  try {
    // Step 1: Start SOCKS proxy server
    console.log("1️⃣ Starting SOCKS proxy server on port 1080...");
    socksServer = new SOCKSServer(1080);
    await socksServer.start();
    await sleep(500);

    // Step 2: Start private MCP client (behind "firewall")
    console.log("2️⃣ Starting private MCP client on port 8080...");
    privateClient = new PrivateMCPClient(8080);
    await privateClient.start();
    await sleep(500);

    // Step 3: Connect public MCP server through SOCKS proxy
    console.log("3️⃣ Connecting public MCP server via SOCKS proxy...");
    publicServer = new PublicMCPServer(
      "http://localhost:8080",
      "socks5://localhost:1080"
    );
    await publicServer.connect();
    await sleep(500);

    // Step 4: Demonstrate MCP communication
    console.log("4️⃣ Testing MCP communication...\n");

    // List available tools
    console.log("📋 Available tools:");
    const tools = await publicServer.listTools();
    tools.forEach((tool) => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });

    // Execute ping tool
    console.log("\n🏓 Testing ping tool:");
    const result1 = await publicServer.ping("Hello from demo!");
    console.log(`   Response: ${result1.content[0].text}`);

    // Execute ping with different message
    const result2 = await publicServer.ping("SOCKS proxy is working!");
    console.log(`   Response: ${result2.content[0].text}`);

    console.log("\n✨ Demo completed successfully!");
    console.log("\n🎯 Key achievements:");
    console.log("   ✅ SOCKS proxy established connection");
    console.log("   ✅ Private MCP client served tools through proxy");
    console.log("   ✅ Public MCP server consumed tools via proxy");
    console.log("   ✅ End-to-end MCP communication working");

    // Keep demo running for a moment to show it's stable
    console.log("\n⏳ Keeping connection alive for 3 seconds...");
    await sleep(3000);
  } catch (error) {
    console.error("💥 Demo failed:", error);
  } finally {
    // Cleanup
    console.log("\n🧹 Shutting down demo...");

    if (publicServer) {
      try {
        await publicServer.disconnect();
        console.log("   ✅ Public server disconnected");
      } catch (e) {}
    }

    if (privateClient) {
      try {
        await privateClient.stop();
        console.log("   ✅ Private client stopped");
      } catch (e) {}
    }

    if (socksServer) {
      try {
        await socksServer.stop();
        console.log("   ✅ SOCKS server stopped");
      } catch (e) {}
    }

    console.log("\n👋 Demo finished!");
  }
}

// Run demo when script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch((error) => {
    console.error("Demo runner failed:", error);
    process.exit(1);
  });
}

export { runDemo };
