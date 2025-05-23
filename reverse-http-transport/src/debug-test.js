import { SOCKSServer } from "./socks-server.js";
import { PrivateMCPClient } from "./private-client.js";
import { PublicMCPServer } from "./public-server.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function debugTest() {
  console.log("🔍 Starting debug test...");

  let socksServer, privateClient, publicServer;

  try {
    // Step 1: SOCKS Server
    console.log("1️⃣ Starting SOCKS server...");
    socksServer = new SOCKSServer(1080);
    await socksServer.start();
    console.log("   ✅ SOCKS server running");
    await sleep(1000);

    // Step 2: Private Client
    console.log("2️⃣ Starting private MCP client...");
    privateClient = new PrivateMCPClient(8080);
    await privateClient.start();
    console.log("   ✅ Private client running");
    await sleep(1000);

    // Step 3: Public Server
    console.log("3️⃣ Connecting public MCP server...");
    publicServer = new PublicMCPServer(
      "http://localhost:8080",
      "socks5://localhost:1080"
    );
    await publicServer.connect();
    console.log("   ✅ Public server connected");
    await sleep(1000);

    // Step 4: Test Tools
    console.log("4️⃣ Testing tool listing...");
    const tools = await publicServer.listTools();
    console.log("   Tools:", tools);

    // Step 5: Test Tool Call
    console.log("5️⃣ Testing tool execution...");
    const result = await publicServer.ping("Debug test message");
    console.log("   Result:", result);

    console.log("\n🎉 All tests passed!");
  } catch (error) {
    console.error("💥 Test failed:", error);
  } finally {
    console.log("\n🧹 Cleaning up...");
    if (publicServer) await publicServer.disconnect();
    if (privateClient) await privateClient.stop();
    if (socksServer) await socksServer.stop();
  }
}

debugTest();
