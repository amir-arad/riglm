import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createServer } from "http";
import { AddressInfo } from "net";
import { TransportSessionManager } from "../../src/host-gateway/transport-session-manager";
import { setTimeout } from "node:timers/promises";

function fakeTransport(sessionId: string = "test") {
  return {
    sessionId,
    close: async () => {},
  } as any;
}

describe("Stream Termination Tests", () => {
  let sessionManager: TransportSessionManager;
  let httpServer: ReturnType<typeof createServer>;

  beforeEach(async () => {
    httpServer = createServer();
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    void (httpServer.address() as AddressInfo).port;

    sessionManager = new TransportSessionManager();
  });

  afterEach(async () => {
    await sessionManager?.close();
    await new Promise<void>((resolve) => httpServer?.close(() => resolve()));
  });

  test("should terminate stream when client disconnects", async () => {
    const controller = new AbortController();
    const session = sessionManager.createSession(fakeTransport(), controller);

    expect(sessionManager.hasSession(session.sessionId)).toBe(true);

    // Simulate client disconnect
    controller.abort();

    // Wait for cleanup
    await setTimeout(100);

    expect(sessionManager.hasSession(session.sessionId)).toBe(false);
  });

  test("should handle server-initiated aborts", async () => {
    const controller = new AbortController();
    const session = sessionManager.createSession(fakeTransport(), controller);
    expect(sessionManager.hasSession(session.sessionId)).toBe(true);

    // Simulate server-initiated abort
    await sessionManager.removeSession(session.sessionId);

    expect(sessionManager.hasSession(session.sessionId)).toBe(false);
  });

  test("should terminate stream on timeout", async () => {
    const controller = new AbortController();
    const session = sessionManager.createSession(fakeTransport(), controller);
    const sessionId = session.sessionId;

    // Force session to be inactive
    (session as any).lastActivity = new Date(Date.now() - 31 * 60 * 1000);

    // Trigger cleanup
    await (sessionManager as any).cleanupInactiveSessions();

    expect(sessionManager.hasSession(sessionId)).toBe(false);
  });

  test("should handle concurrent stream terminations", async () => {
    const sessions = await Promise.all([
      sessionManager.createSession(fakeTransport("S-1")),
      sessionManager.createSession(fakeTransport("S-2")),
      sessionManager.createSession(fakeTransport("S-3")),
    ]);

    expect(sessionManager.getActiveSessions()).toBe(3);

    // Terminate streams concurrently
    await Promise.all(
      sessions.map((session) => sessionManager.removeSession(session.sessionId))
    );

    expect(sessionManager.getActiveSessions()).toBe(0);
  });

  test("should cleanup resources when abort signal is triggered", async () => {
    const controller = new AbortController();
    const session = sessionManager.createSession(fakeTransport(), controller);
    let servicesClosed = false;

    const mockService = {
      close: async () => {
        servicesClosed = true;
      },
    };

    session.addService("mockService", mockService);

    controller.abort();

    // Wait for cleanup
    await setTimeout(100);

    expect(servicesClosed).toBe(true);
    expect(sessionManager.hasSession(session.sessionId)).toBe(false);
  });
});
