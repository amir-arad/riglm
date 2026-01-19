import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { setTimeout } from "timers/promises";
import { TransportSessionManager } from "../../src/application/transport-session-manager";
import { TransportPort } from "../../src/ports/transport.port";
import { createSilentLogger } from "../mocks/mock-logger";

function fakeTransport(sessionId: string = "test"): TransportPort {
  let _onerror: ((error: Error) => void) | undefined;
  let _onclose: (() => void) | undefined;

  return {
    sessionId,
    start: async () => {},
    close: async () => {},
    get onerror() { return _onerror; },
    set onerror(handler) { _onerror = handler; },
    get onclose() { return _onclose; },
    set onclose(handler) { _onclose = handler; },
  };
}

describe("TransportSessionManager Error Handling Tests", () => {
  let sessionManager: TransportSessionManager;

  beforeEach(async () => {
    sessionManager = new TransportSessionManager(createSilentLogger());
  });

  afterEach(async () => {
    await sessionManager?.close();
  });

  test("should handle transport errors", async () => {
    const transport = fakeTransport();
    const session = sessionManager.createSession(transport);

    // Simulate transport error
    transport.onerror!(new Error("Transport error"));
    await setTimeout(10);

    expect(sessionManager.hasSession(session.sessionId)).toBe(false);
  });

  test("should handle errors during service cleanup", async () => {
    const session = sessionManager.createSession(fakeTransport());

    session.addService("failing-service", {
      close: async () => {
        throw new Error("Cleanup failed");
      },
    });

    await session.close();
    expect(sessionManager.hasSession(session.sessionId)).toBe(false);
  });

  test("should handle abort signal", async () => {
    const controller = new AbortController();
    const session = sessionManager.createSession(fakeTransport(), controller);
    controller.abort();
    await setTimeout(10);
    expect(sessionManager.hasSession(session.sessionId)).toBe(false);
  });

  test("should handle concurrent errors from multiple sessions", async () => {
    const sessions = [
      sessionManager.createSession(fakeTransport("1")),
      sessionManager.createSession(fakeTransport("2")),
      sessionManager.createSession(fakeTransport("3")),
    ];

    // Simulate errors in all sessions simultaneously
    await Promise.all(
      sessions.map((session) => {
        const transport = (session as any).transport;
        transport.onerror(new Error(`Error in session ${session.sessionId}`));
      })
    );

    // Wait for error handling
    await setTimeout(100);

    expect(sessionManager.getActiveSessions()).toBe(0);
  });

  test("should handle errors during cleanup of sessions", async () => {
    const controller = new AbortController();
    const session = sessionManager.createSession(fakeTransport(), controller);

    (session as any).lastActivity = new Date(Date.now() - 31 * 60 * 1000);

    session.addService("failing-service", {
      close: async () => {
        throw new Error("Cleanup failed");
      },
    });

    controller.abort();
    await setTimeout(50);
    expect(sessionManager.hasSession(session.sessionId)).toBe(false);
  });

  test("should handle errors during manager shutdown", async () => {
    const controller = new AbortController();
    const session = sessionManager.createSession(fakeTransport(), controller);

    // Add multiple services that throw during cleanup
    session.addService("failing-service-1", {
      close: async () => {
        throw new Error("Cleanup failed 1");
      },
    });
    session.addService("failing-service-2", {
      close: async () => {
        throw new Error("Cleanup failed 2");
      },
    });

    await sessionManager.close();
    expect(sessionManager.getActiveSessions()).toBe(0);
  });
});
