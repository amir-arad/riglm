import { PrivateMCPClient } from "../src/private-client.js";

console.log("Testing private MCP client...");

async function testPrivateClient() {
  try {
    console.log("Creating private MCP client...");
    const client = new PrivateMCPClient(8080);

    console.log("Starting private MCP client...");
    await client.start();

    console.log("Private MCP client started successfully!");

    setTimeout(async () => {
      console.log("Stopping private MCP client...");
      await client.stop();
      console.log("Private client test completed successfully!");
      process.exit(0);
    }, 2000);
  } catch (error) {
    console.error("Private client test failed:", error);
    process.exit(1);
  }
}

testPrivateClient();
