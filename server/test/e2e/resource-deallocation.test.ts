import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createServer } from "http";
import { AddressInfo } from "net";
import { setTimeout } from "timers/promises";
import { TransportSessionManager } from "../../src/host-gateway/transport-session-manager";

function fakeTransport(sessionId: string = "test") {
  return {
    sessionId,
    close: async () => {},
  } as any;
}

describe("Resource Deallocation Tests", () => {
  let sessionManager: TransportSessionManager;
  let httpServer: ReturnType<typeof createServer>;

  beforeEach(async () => {
    // Set up HTTP server
    httpServer = createServer();
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    void (httpServer.address() as AddressInfo).port;

    sessionManager = new TransportSessionManager();
  });

  afterEach(async () => {
    await sessionManager?.close();
    await new Promise<void>((resolve) => httpServer?.close(() => resolve()));
  });

  test("should cleanup all services on session close", async () => {
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
      expect(service.isClosed()).toBe(true);
    });
  });

  test("should handle cleanup of failed services", async () => {
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
    expect(sessionManager.hasSession(session.sessionId)).toBe(false);
  });

  test("should cleanup sessions on manager close", async () => {
    // Create multiple sessions
    const sessions = [
      sessionManager.createSession(fakeTransport("1")),
      sessionManager.createSession(fakeTransport("2")),
      sessionManager.createSession(fakeTransport("3")),
    ];

    expect(sessionManager.getActiveSessions()).toBe(3);

    // Close session manager
    await sessionManager.close();

    // Verify all sessions were cleaned up
    sessions.forEach((session) => {
      expect(sessionManager.hasSession(session.sessionId)).toBe(false);
    });

    expect(sessionManager.getActiveSessions()).toBe(0);
  });

  test("should handle concurrent service cleanup", async () => {
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
    expect(duration).toBeGreaterThanOrEqual(50 * 3);
    expect(sessionManager.hasSession(session.sessionId)).toBe(false);
  });

  test("should cleanup interval timer on manager close", async () => {
    const initialIntervalId = (sessionManager as any).intervalId;
    expect(initialIntervalId).not.toBeNull();

    await sessionManager.close();

    const finalIntervalId = (sessionManager as any).intervalId;
    expect(finalIntervalId).toBeNull();
  });
});
