import { expect } from "chai";
import { createServer } from "http";
import { AddressInfo } from "net";
import { setTimeout } from "timers/promises";
import { TransportSessionManager } from "../../src/host-gateway/transport-session-manager";

describe("Resource Deallocation Tests", () => {
  let sessionManager: TransportSessionManager;
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

  beforeEach(async () => {
    // Set up HTTP server
    httpServer = createServer();
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    port = (httpServer.address() as AddressInfo).port;

    sessionManager = new TransportSessionManager();
  });

  afterEach(async () => {
    await sessionManager?.close();
    await new Promise<void>((resolve) => httpServer?.close(() => resolve()));
  });

  it("should cleanup all services on session close", async () => {
    const services = Array.from({ length: 3 }, (_, i) => {
      let closed = false;
      return {
        name: `service-${i}`,
        service: {
          close: async () => {
            closed = true;
          },
          isClosed: () => closed,
        },
      };
    });
    const session = sessionManager.createSession(fakeTransport());
    services.forEach(({ name, service }) => {
      session.addService(name, service);
    });
    await session.close();
    services.forEach(({ service }) => {
      expect(service.isClosed()).to.be.true;
    });
  });

  it("should handle cleanup of failed services", async () => {
    const goodService = {
      close: async () => {},
    };

    const failingService = {
      close: async () => {
        throw new Error("Service cleanup failed");
      },
    };

    const session = sessionManager.createSession(fakeTransport());
    session.addService("good-service", goodService);
    session.addService("failing-service", failingService);

    // Session close should complete despite service failure
    await session.close();
    expect(sessionManager.hasSession(session.sessionId)).to.be.false;
  });

  it("should cleanup sessions on manager close", async () => {
    // Create multiple sessions
    const sessions = [
      sessionManager.createSession(fakeTransport("1")),
      sessionManager.createSession(fakeTransport("2")),
      sessionManager.createSession(fakeTransport("3")),
    ];

    expect(sessionManager.getActiveSessions()).to.equal(3);

    // Close session manager
    await sessionManager.close();

    // Verify all sessions were cleaned up
    sessions.forEach((session) => {
      expect(sessionManager.hasSession(session.sessionId)).to.be.false;
    });

    expect(sessionManager.getActiveSessions()).to.equal(0);
  });

  it("should handle concurrent service cleanup", async () => {
    const session = sessionManager.createSession(fakeTransport());

    // Add services with varying cleanup times
    const services = Array.from({ length: 3 }, (_, i) => ({
      close: () => setTimeout(50 * (i + 1)),
    }));

    services.forEach((service, i) => {
      session.addService(`service-${i}`, service);
    });

    // Close session - should wait for all services
    const start = Date.now();
    await session.close();
    const duration = Date.now() - start;

    // Should take at least the longest of all timeouts
    expect(duration).to.be.at.least(50 * 3);
    expect(sessionManager.hasSession(session.sessionId)).to.be.false;
  });

  it("should cleanup interval timer on manager close", async () => {
    const initialIntervalId = (sessionManager as any).intervalId;
    expect(initialIntervalId).to.not.be.null;

    await sessionManager.close();

    const finalIntervalId = (sessionManager as any).intervalId;
    expect(finalIntervalId).to.be.null;
  });
});

function fakeTransport(sessionId: string = "test") {
  return {
    sessionId,
    close: async () => {},
  } as any;
}
