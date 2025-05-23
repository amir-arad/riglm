import { SOCKSServer } from "./socks-server.js";

console.log("Starting simple test...");

async function simpleTest() {
  try {
    console.log("Creating SOCKS server...");
    const server = new SOCKSServer(1080);

    console.log("Starting SOCKS server...");
    await server.start();

    console.log("SOCKS server started successfully!");

    setTimeout(async () => {
      console.log("Stopping SOCKS server...");
      await server.stop();
      console.log("Test completed successfully!");
      process.exit(0);
    }, 2000);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

simpleTest();
