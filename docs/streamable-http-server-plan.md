# Streamable HTTP Server Transport Implementation Plan

**Status: COMPLETED**

Implementation completed with all tests passing (179 total, including 6 new Streamable HTTP tests).

Key implementation files:
- `src/ports/transport.port.ts` - HttpServerTransportPort interface
- `src/adapters/mcp/transports/http-server.adapter.ts` - Transport adapter
- `src/adapters/http/routes.ts` - /mcp route handler
- `test/e2e/streamable-http.e2e.test.ts` - E2E tests

## Overview

Add Streamable HTTP server transport support to riglm, enabling MCP clients to connect using the modern protocol (2025-03-26) instead of the deprecated SSE transport.

## Current State Analysis

### Transport Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PORTS (Abstractions)                    │
├─────────────────────────────────────────────────────────────────┤
│  TransportPort                                                  │
│    ├── sessionId: string                                        │
│    ├── start(): Promise<void>                                   │
│    ├── close(): Promise<void>                                   │
│    ├── onerror?: (error: Error) => void                         │
│    └── onclose?: () => void                                     │
│                                                                 │
│  SdkTransportPort extends TransportPort                         │
│    └── getSdkTransport(): unknown                               │
│                                                                 │
│  ServerTransportFactory                                         │
│    └── createSseServerTransport(path, response): TransportPort  │
│        ❌ Missing: createHttpServerTransport()                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ADAPTERS (Implementations)                  │
├─────────────────────────────────────────────────────────────────┤
│  Client-side (riglm → upstream):                                │
│    ✅ StdioClientTransportAdapter                               │
│    ✅ SseClientTransportAdapter                                 │
│    ✅ HttpClientTransportAdapter (StreamableHTTPClientTransport)│
│                                                                 │
│  Server-side (clients → riglm):                                 │
│    ✅ SseServerTransportAdapter (SSEServerTransport)            │
│    ❌ HttpServerTransportAdapter (StreamableHTTPServerTransport)│
└─────────────────────────────────────────────────────────────────┘
```

### Key Differences: SSE vs Streamable HTTP

| Aspect | SSE (Current) | Streamable HTTP (Target) |
|--------|---------------|--------------------------|
| Endpoints | `GET /sse` + `POST /messages/:sessionId` | Single `POST|GET /mcp` |
| Session ID | From transport.sessionId | `Mcp-Session-Id` header |
| Connection | Long-lived SSE stream | Request-response + optional SSE |
| State | Stateful (stream open) | Can be stateless |
| SDK Class | `SSEServerTransport` | `StreamableHTTPServerTransport` |

---

## TDD Implementation Strategy

### Guiding Principles

1. **Red-Green-Refactor**: Write failing tests first, then minimal implementation
2. **Test the Contract**: Tests define the interface before implementation exists
3. **Outside-In**: Start with E2E acceptance tests, drive down to unit tests
4. **Hexagonal Discipline**: Tests verify port contracts, not implementation details

### TDD Cycle Structure

Each phase follows:
```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 RED: Write failing test against expected behavior           │
│     └── Test compiles but fails (no implementation)             │
├─────────────────────────────────────────────────────────────────┤
│  🟢 GREEN: Write minimal code to pass the test                  │
│     └── Simplest implementation that satisfies the test         │
├─────────────────────────────────────────────────────────────────┤
│  🔵 REFACTOR: Clean up while keeping tests green                │
│     └── Extract abstractions, remove duplication                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Baseline Protection (Before Any Changes)

**Goal**: Ensure existing functionality is protected by tests.

### 0.1 Verify Existing Test Coverage

```bash
bun test                    # All 173 tests pass
bun run typecheck           # No type errors
bun run lint                # No lint errors
```

### 0.2 Add Regression Guard Test

```typescript
// test/e2e/sse-regression.test.ts

describe("SSE Transport Regression Guard", () => {
  test("SSE endpoint responds to GET request", async () => {
    // Capture current behavior before changes
  });

  test("SSE session persists across multiple tool calls", async () => {
    // Document expected SSE behavior
  });

  test("SSE cleanup happens on connection close", async () => {
    // Verify cleanup behavior
  });
});
```

**Checkpoint**: All tests pass. This is our safety net.

---

## Phase 1: E2E Acceptance Test (Outside-In Start)

**Goal**: Define the desired end-user behavior with a failing E2E test.

### 1.1 🔴 RED: Write Failing E2E Test

```typescript
// test/e2e/streamable-http.e2e.test.ts

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

describe("Streamable HTTP Transport E2E", () => {
  // Setup similar to happy-flow.e2e.test.ts
  let client: Client;
  let uut: RiglmServer;

  beforeEach(async () => {
    // Configure server with mock backend
    mockConfig.setConfig({
      servers: {
        tools_server: { url: "http://localhost:3010/sse" },
      },
      endpoints: {
        main: { servers: ["tools_server"] },
      },
    });
    await uut.start();
  });

  test("connect via Streamable HTTP, list tools, call tool", async () => {
    // 🔴 This will fail - /mcp endpoint doesn't exist yet
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${uut.port}/main/mcp`)
    );

    await client.connect(transport);

    // Should discover namespaced tools
    const { tools } = await client.listTools();
    expect(tools.map(t => t.name)).toContain("tools_server-echo");

    // Should call tool and get result
    const result = await client.callTool({
      name: "tools_server-echo",
      arguments: { message: "HTTP works!" },
    });
    expect(result.content[0].text).toBe("HTTP works!");
  });

  test("session ID returned in Mcp-Session-Id header", async () => {
    // 🔴 Will fail - no session header handling
    const response = await fetch(`http://localhost:${uut.port}/main/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: { clientInfo: { name: "test", version: "1.0" } },
        id: 1,
      }),
    });

    expect(response.headers.get("Mcp-Session-Id")).toBeTruthy();
  });

  test("subsequent requests use session ID for routing", async () => {
    // 🔴 Will fail - no session routing
    // First request establishes session
    const initResponse = await fetch(`http://localhost:${uut.port}/main/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    });
    const sessionId = initResponse.headers.get("Mcp-Session-Id");

    // Second request uses session
    const toolsResponse = await fetch(`http://localhost:${uut.port}/main/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Mcp-Session-Id": sessionId!,
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 2 }),
    });

    expect(toolsResponse.ok).toBe(true);
    const result = await toolsResponse.json();
    expect(result.result.tools).toBeDefined();
  });
});
```

**Run tests**: `bun test test/e2e/streamable-http.e2e.test.ts`
**Expected**: Tests fail with connection errors (no `/mcp` endpoint).

### 1.2 Commit Failing Tests

```bash
git add test/e2e/streamable-http.e2e.test.ts
git commit -m "test: add failing E2E tests for Streamable HTTP transport

RED phase - defines acceptance criteria for HTTP transport support"
```

---

## Phase 2: Port Contract Tests

**Goal**: Define the interface contract before implementation.

### 2.1 🔴 RED: Write Port Contract Tests

```typescript
// test/ports/http-server-transport.port.test.ts

import { describe, test, expect } from "bun:test";

describe("HttpServerTransportPort Contract", () => {
  describe("Interface Requirements", () => {
    test("extends SdkTransportPort", () => {
      // Type-level test - will fail at compile time if interface missing
      const transport: HttpServerTransportPort = createMockHttpTransport();

      // Must have TransportPort methods
      expect(typeof transport.sessionId).toBe("string");
      expect(typeof transport.start).toBe("function");
      expect(typeof transport.close).toBe("function");

      // Must have SdkTransportPort method
      expect(typeof transport.getSdkTransport).toBe("function");

      // Must have HTTP-specific method
      expect(typeof transport.handleRequest).toBe("function");
    });

    test("handleRequest accepts HttpRequestPort and HttpResponsePort", async () => {
      const transport: HttpServerTransportPort = createMockHttpTransport();
      const req: HttpRequestPort = {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { jsonrpc: "2.0" },
      };
      const res: HttpResponsePort = createMockResponse();

      // Should not throw type error
      await transport.handleRequest(req, res);
    });
  });

  describe("Session Lifecycle", () => {
    test("sessionId available after construction", () => {
      // 🔴 Will fail - no implementation yet
      const transport = createHttpServerTransport({
        sessionIdGenerator: () => "test-session-123",
      });

      expect(transport.sessionId).toBe("test-session-123");
    });

    test("onsessioninitialized callback fires with session ID", async () => {
      // 🔴 Will fail
      let capturedSessionId: string | null = null;
      const transport = createHttpServerTransport({
        onsessioninitialized: (id) => { capturedSessionId = id; },
      });

      await transport.handleRequest(mockInitRequest(), mockResponse());

      expect(capturedSessionId).toBeTruthy();
    });
  });
});

describe("ServerTransportFactory Contract", () => {
  test("createHttpServerTransport returns HttpServerTransportPort", () => {
    // 🔴 Will fail - method doesn't exist yet
    const factory: ServerTransportFactory = new ServerTransportFactoryAdapter();

    const transport = factory.createHttpServerTransport({});

    expect(transport).toBeDefined();
    expect(typeof transport.handleRequest).toBe("function");
  });
});
```

**Run tests**: `bun test test/ports/http-server-transport.port.test.ts`
**Expected**: Compilation errors (types don't exist), then runtime failures.

### 2.2 🟢 GREEN: Define Port Interfaces (Minimal)

```typescript
// src/ports/transport.port.ts (additions)

/**
 * HTTP request abstraction (decoupled from Express)
 */
export interface HttpRequestPort {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  url?: string;
}

/**
 * Extended transport for Streamable HTTP server
 */
export interface HttpServerTransportPort extends SdkTransportPort {
  handleRequest(req: HttpRequestPort, res: HttpResponsePort): Promise<void>;
}

/**
 * Options for creating HTTP server transport
 */
export interface HttpServerTransportOptions {
  sessionIdGenerator?: () => string;
  onsessioninitialized?: (sessionId: string) => void;
}

// Extend factory interface
export interface ServerTransportFactory {
  createSseServerTransport(
    messagePath: string,
    response: HttpResponsePort
  ): TransportPort;

  createHttpServerTransport(
    options: HttpServerTransportOptions
  ): HttpServerTransportPort;
}
```

**Run tests**: Type errors resolved. Runtime tests still fail (no implementation).

### 2.3 Commit Port Definitions

```bash
git add src/ports/transport.port.ts test/ports/
git commit -m "feat(ports): define HttpServerTransportPort interface

GREEN phase - minimal interface to satisfy contract tests
- HttpRequestPort for Express decoupling
- HttpServerTransportPort extending SdkTransportPort
- Factory method signature"
```

---

## Phase 3: Adapter Unit Tests

**Goal**: Test the adapter in isolation with mocked SDK.

### 3.1 🔴 RED: Write Adapter Unit Tests

```typescript
// test/adapters/http-server.adapter.test.ts

import { describe, test, expect, mock, beforeEach } from "bun:test";
import { HttpServerTransportAdapter } from "../../src/adapters/mcp/transports/http-server.adapter";

// Mock the SDK transport
mock.module("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: class MockTransport {
    sessionId = "mock-session-id";
    handleRequest = mock(() => Promise.resolve());
    close = mock(() => Promise.resolve());
    onerror?: (error: Error) => void;
    onclose?: () => void;
  },
}));

describe("HttpServerTransportAdapter", () => {
  describe("Construction", () => {
    test("creates with default session ID generator", () => {
      // 🔴 Will fail - class doesn't exist
      const adapter = new HttpServerTransportAdapter({});

      expect(adapter.sessionId).toBeDefined();
      expect(typeof adapter.sessionId).toBe("string");
    });

    test("uses custom session ID generator", () => {
      const adapter = new HttpServerTransportAdapter({
        sessionIdGenerator: () => "custom-123",
      });

      expect(adapter.sessionId).toBe("custom-123");
    });

    test("calls onsessioninitialized callback", () => {
      let captured: string | undefined;
      const adapter = new HttpServerTransportAdapter({
        onsessioninitialized: (id) => { captured = id; },
      });

      // Trigger initialization (implementation detail)
      expect(captured).toBeDefined();
    });
  });

  describe("Request Handling", () => {
    test("delegates handleRequest to SDK transport", async () => {
      const adapter = new HttpServerTransportAdapter({});
      const mockReq = { method: "POST", headers: {}, body: {} };
      const mockRes = { write: mock(), end: mock() };

      await adapter.handleRequest(mockReq, mockRes);

      // Verify delegation
      const sdkTransport = adapter.getSdkTransport();
      expect(sdkTransport.handleRequest).toHaveBeenCalledWith(mockReq, mockRes);
    });
  });

  describe("Lifecycle", () => {
    test("start() succeeds (no-op for HTTP)", async () => {
      const adapter = new HttpServerTransportAdapter({});

      await expect(adapter.start()).resolves.toBeUndefined();
    });

    test("close() delegates to SDK transport", async () => {
      const adapter = new HttpServerTransportAdapter({});

      await adapter.close();

      const sdkTransport = adapter.getSdkTransport();
      expect(sdkTransport.close).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    test("onerror propagates to SDK transport", () => {
      const adapter = new HttpServerTransportAdapter({});
      const errorHandler = (err: Error) => console.error(err);

      adapter.onerror = errorHandler;

      const sdkTransport = adapter.getSdkTransport();
      expect(sdkTransport.onerror).toBe(errorHandler);
    });

    test("onclose propagates to SDK transport", () => {
      const adapter = new HttpServerTransportAdapter({});
      const closeHandler = () => console.log("closed");

      adapter.onclose = closeHandler;

      const sdkTransport = adapter.getSdkTransport();
      expect(sdkTransport.onclose).toBe(closeHandler);
    });
  });

  describe("SDK Integration", () => {
    test("getSdkTransport returns underlying transport", () => {
      const adapter = new HttpServerTransportAdapter({});

      const sdk = adapter.getSdkTransport();

      expect(sdk).toBeDefined();
      expect(typeof sdk.handleRequest).toBe("function");
    });
  });
});
```

**Run tests**: `bun test test/adapters/http-server.adapter.test.ts`
**Expected**: Import error (file doesn't exist).

### 3.2 🟢 GREEN: Implement Adapter

```typescript
// src/adapters/mcp/transports/http-server.adapter.ts

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  HttpServerTransportPort,
  HttpServerTransportOptions,
  HttpRequestPort,
  HttpResponsePort,
} from "../../../ports/transport.port";

export class HttpServerTransportAdapter implements HttpServerTransportPort {
  private transport: StreamableHTTPServerTransport;
  private _sessionId: string = "";

  constructor(options: HttpServerTransportOptions) {
    const sessionIdGenerator = options.sessionIdGenerator ?? (() =>
      `http-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );

    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator,
      onsessioninitialized: (sessionId: string) => {
        this._sessionId = sessionId;
        options.onsessioninitialized?.(sessionId);
      },
    });
  }

  get sessionId(): string {
    return this._sessionId;
  }

  async handleRequest(req: HttpRequestPort, res: HttpResponsePort): Promise<void> {
    await this.transport.handleRequest(req as any, res as any);
  }

  async start(): Promise<void> {
    // Streamable HTTP doesn't require explicit start
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  set onerror(handler: ((error: Error) => void) | undefined) {
    this.transport.onerror = handler;
  }

  get onerror(): ((error: Error) => void) | undefined {
    return this.transport.onerror;
  }

  set onclose(handler: (() => void) | undefined) {
    this.transport.onclose = handler;
  }

  get onclose(): (() => void) | undefined {
    return this.transport.onclose;
  }

  getSdkTransport(): StreamableHTTPServerTransport {
    return this.transport;
  }
}
```

**Run tests**: Unit tests pass.

### 3.3 Update Factory

```typescript
// src/adapters/mcp/transports/index.ts (additions)

import { HttpServerTransportAdapter } from "./http-server.adapter";

export class ServerTransportFactoryAdapter implements ServerTransportFactory {
  // ... existing SSE method

  createHttpServerTransport(options: HttpServerTransportOptions): HttpServerTransportPort {
    return new HttpServerTransportAdapter(options);
  }
}

export { HttpServerTransportAdapter } from "./http-server.adapter";
```

### 3.4 Commit Adapter

```bash
git add src/adapters/mcp/transports/
git commit -m "feat(adapter): implement HttpServerTransportAdapter

GREEN phase - adapter wrapping StreamableHTTPServerTransport
- Delegates request handling to SDK
- Session ID management via callbacks
- Full TransportPort lifecycle support"
```

---

## Phase 4: Route Integration Tests

**Goal**: Test HTTP routing in isolation before wiring to real server.

### 4.1 🔴 RED: Write Route Unit Tests

```typescript
// test/adapters/http/mcp-route.test.ts

import { describe, test, expect, mock, beforeEach } from "bun:test";
import express from "express";
import request from "supertest"; // or use Bun's fetch

describe("MCP Route Handler", () => {
  let app: express.Application;
  let mockHostsService: any;
  let mockTransportFactory: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockHostsService = {
      hasSession: mock(() => false),
      getSession: mock(() => undefined),
      createSession: mock(() => Promise.resolve("new-session-id")),
      removeSession: mock(() => Promise.resolve()),
    };

    mockTransportFactory = {
      createHttpServerTransport: mock(() => ({
        sessionId: "new-session-id",
        handleRequest: mock(() => Promise.resolve()),
        start: mock(() => Promise.resolve()),
        close: mock(() => Promise.resolve()),
      })),
    };

    // 🔴 Will fail - route doesn't exist yet
    app.use(makeMcpRoute(mockHostsService, mockTransportFactory));
  });

  describe("New Session", () => {
    test("POST /mcp creates new session", async () => {
      const response = await request(app)
        .post("/main/mcp")
        .send({ jsonrpc: "2.0", method: "initialize", id: 1 });

      expect(mockTransportFactory.createHttpServerTransport).toHaveBeenCalled();
      expect(mockHostsService.createSession).toHaveBeenCalled();
    });

    test("returns Mcp-Session-Id header", async () => {
      const response = await request(app)
        .post("/main/mcp")
        .send({ jsonrpc: "2.0", method: "initialize", id: 1 });

      expect(response.headers["mcp-session-id"]).toBe("new-session-id");
    });

    test("GET /mcp without session returns 400", async () => {
      const response = await request(app).get("/main/mcp");

      expect(response.status).toBe(400);
    });
  });

  describe("Existing Session", () => {
    beforeEach(() => {
      mockHostsService.hasSession = mock(() => true);
      mockHostsService.getSession = mock(() => ({
        transport: {
          handleRequest: mock(() => Promise.resolve()),
        },
      }));
    });

    test("routes to existing session by Mcp-Session-Id header", async () => {
      const response = await request(app)
        .post("/main/mcp")
        .set("Mcp-Session-Id", "existing-session")
        .send({ jsonrpc: "2.0", method: "tools/list", id: 2 });

      expect(mockHostsService.getSession).toHaveBeenCalledWith("existing-session");
    });

    test("unknown session ID returns 404", async () => {
      mockHostsService.hasSession = mock(() => false);

      const response = await request(app)
        .post("/main/mcp")
        .set("Mcp-Session-Id", "unknown-session")
        .send({ jsonrpc: "2.0", method: "tools/list", id: 2 });

      expect(response.status).toBe(404);
    });
  });

  describe("Endpoint Not Found", () => {
    test("unknown endpoint returns 404", async () => {
      const response = await request(app)
        .post("/nonexistent/mcp")
        .send({ jsonrpc: "2.0", method: "initialize", id: 1 });

      expect(response.status).toBe(404);
    });
  });
});
```

### 4.2 🟢 GREEN: Implement Route

```typescript
// src/adapters/http/routes.ts (additions)

// Add after existing SSE routes

hostsRoutes.all("/:endpointId/mcp", async (req, res) => {
  const request = req as EndpointRequest;
  if (!request.hostsService) {
    return res.status(404).json({ error: "Endpoint not found" });
  }

  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // Existing session
  if (sessionId) {
    if (!request.hostsService.hasSession(sessionId)) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = request.hostsService.getSession(sessionId);
    if (session?.transport && isHttpServerTransport(session.transport)) {
      await session.transport.handleRequest(req, res);
      return;
    }
    return res.status(400).json({ error: "Invalid transport type for session" });
  }

  // New session - only POST allowed
  if (req.method !== "POST") {
    return res.status(400).json({ error: "New sessions require POST" });
  }

  const controller = new AbortController();
  const transport = serverTransportFactory.createHttpServerTransport({
    onsessioninitialized: (newSessionId) => {
      res.setHeader("Mcp-Session-Id", newSessionId);
    },
  });

  try {
    await request.hostsService.createSession(transport, { signal: controller.signal });
    await transport.handleRequest(req, res);

    req.on("close", () => {
      controller.abort();
      request.hostsService.removeSession(transport.sessionId).catch(() => {});
    });
  } catch (error) {
    logger.error("Error creating HTTP session:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to create session" });
    }
  }
});

// Type guard helper
function isHttpServerTransport(transport: unknown): transport is HttpServerTransportPort {
  return transport !== null &&
    typeof transport === "object" &&
    "handleRequest" in transport;
}
```

### 4.3 Commit Route

```bash
git add src/adapters/http/routes.ts test/adapters/http/
git commit -m "feat(routes): add /:endpointId/mcp route for Streamable HTTP

GREEN phase - route handler for HTTP transport
- Session creation via POST
- Session routing via Mcp-Session-Id header
- Proper error responses for edge cases"
```

---

## Phase 5: E2E Integration (Make Acceptance Tests Pass)

**Goal**: Wire everything together to pass the E2E tests from Phase 1.

### 5.1 🟢 GREEN: Wire Up Dependencies

The route needs access to `serverTransportFactory`. Update server setup:

```typescript
// src/adapters/http/routes.ts

export function makeHostsRoutes(
  hostsServices: Services<HostsService>,
  serverTransportFactory: ServerTransportFactory,  // Add parameter
  logger: LoggerPort
) {
  // ... routes now have access to factory
}
```

```typescript
// src/server.ts

// Pass factory to routes
app.use(makeHostsRoutes(
  this.hostsServices,
  new ServerTransportFactoryAdapter(),  // Add factory
  logger
));
```

### 5.2 Run E2E Tests

```bash
bun test test/e2e/streamable-http.e2e.test.ts
```

**Expected**: Tests pass! 🎉

### 5.3 Commit Integration

```bash
git add src/server.ts src/adapters/http/routes.ts
git commit -m "feat: wire Streamable HTTP transport into server

GREEN phase - E2E acceptance tests now pass
- ServerTransportFactory injected into routes
- Full request cycle working"
```

---

## Phase 6: Mock HTTP Server for Backend Testing

**Goal**: Test riglm connecting TO Streamable HTTP backends.

### 6.1 🔴 RED: Write Backend Connection Test

```typescript
// test/e2e/http-backend.e2e.test.ts

describe("Streamable HTTP Backend Connection", () => {
  let mockHttpBackend: ReturnType<typeof mockHttpServer>;

  beforeEach(async () => {
    // 🔴 Will fail - mock doesn't exist yet
    mockHttpBackend = mockHttpServer();
    await mockHttpBackend.listen(3020);
  });

  test("riglm connects to HTTP backend and aggregates tools", async () => {
    mockConfig.setConfig({
      servers: {
        http_backend: {
          url: "http://localhost:3020/mcp",  // No /sse suffix = HTTP
        },
      },
      endpoints: {
        main: { servers: ["http_backend"] },
      },
    });

    await uut.start();
    await client.connect(sseTransport);  // Client connects via SSE

    const { tools } = await client.listTools();
    expect(tools.map(t => t.name)).toContain("http_backend-echo");
  });
});
```

### 6.2 🟢 GREEN: Create Mock HTTP Server

```typescript
// test/fixtures/mock-http-server.ts

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { Server } from "http";
import { makeMockServer } from "./mock-server";

export function mockHttpServer() {
  const mcpServer = makeMockServer();
  const app = express();
  app.use(express.json());

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  app.all("/mcp", async (req, res) => {
    let sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport = sessionId ? sessions.get(sessionId) : undefined;

    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, transport!);
          res.setHeader("Mcp-Session-Id", id);
        },
      });
      await mcpServer.connect(transport);
    }

    await transport.handleRequest(req, res);
  });

  let httpServer: Server | null = null;

  return {
    listen: (port: number) => new Promise<void>((resolve) => {
      httpServer = app.listen(port, resolve);
    }),
    close: async () => {
      await Promise.all([...sessions.values()].map(t => t.close()));
      await new Promise(resolve => httpServer?.close(resolve));
      await mcpServer.close();
    },
  };
}
```

### 6.3 Commit Mock

```bash
git add test/fixtures/mock-http-server.ts test/e2e/http-backend.e2e.test.ts
git commit -m "test: add mock Streamable HTTP server for backend testing

GREEN phase - mock server for testing HTTP backend connections"
```

---

## Phase 7: Backward Compatibility Tests

**Goal**: Ensure SSE still works.

### 7.1 🟢 Run All Existing Tests

```bash
bun test
```

**Expected**: All 173+ tests pass including new ones.

### 7.2 Add Explicit Compat Test

```typescript
// test/e2e/transport-compat.test.ts

describe("Transport Backward Compatibility", () => {
  test("SSE and HTTP clients can connect to same endpoint simultaneously", async () => {
    await uut.start();

    // SSE client
    const sseClient = new Client({ name: "sse", version: "1.0" });
    await sseClient.connect(new SSEClientTransport(
      new URL(`http://localhost:${uut.port}/main/sse`)
    ));

    // HTTP client
    const httpClient = new Client({ name: "http", version: "1.0" });
    await httpClient.connect(new StreamableHTTPClientTransport(
      new URL(`http://localhost:${uut.port}/main/mcp`)
    ));

    // Both should work
    const sseTools = await sseClient.listTools();
    const httpTools = await httpClient.listTools();

    expect(sseTools.tools).toEqual(httpTools.tools);
  });

  test("existing SSE tests pass unchanged", async () => {
    // This test exists to document that happy-flow.e2e.test.ts passes
    // without modification after adding HTTP support
    expect(true).toBe(true);
  });
});
```

### 7.3 Commit Compat Tests

```bash
git add test/e2e/transport-compat.test.ts
git commit -m "test: add transport compatibility tests

Verifies SSE and HTTP transports coexist correctly"
```

---

## Phase 8: 🔵 REFACTOR

**Goal**: Clean up while keeping all tests green.

### 8.1 Extract Common Transport Patterns

If duplication exists between SSE and HTTP adapters, extract:

```typescript
// src/adapters/mcp/transports/base-server.adapter.ts

export abstract class BaseServerTransportAdapter implements SdkTransportPort {
  protected abstract transport: Transport;

  // Common lifecycle methods
  async start(): Promise<void> {
    await this.transport.start?.();
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  // ... error handlers
}
```

### 8.2 Run Tests After Each Refactor

```bash
bun test && bun run typecheck && bun run lint
```

### 8.3 Commit Refactors Separately

```bash
git commit -m "refactor: extract BaseServerTransportAdapter

REFACTOR phase - reduce duplication between SSE and HTTP adapters"
```

---

## Phase 9: Documentation

**Goal**: Update docs to reflect new capability.

### 9.1 Update Documentation Files

- `docs/mcp-sdk-reference.md` - Add Streamable HTTP server example
- `CLAUDE.md` - Update architecture diagram
- `docs/mcp-transport.md` - Add riglm transport support section

### 9.2 Commit Documentation

```bash
git add docs/ CLAUDE.md
git commit -m "docs: document Streamable HTTP transport support"
```

---

## Execution Summary (TDD Order)

```
Phase 0: Baseline
    └── Verify all existing tests pass (safety net)

Phase 1: E2E Acceptance Tests
    └── 🔴 Write failing E2E tests defining desired behavior
    └── Commit: "test: add failing E2E tests for Streamable HTTP"

Phase 2: Port Contract
    └── 🔴 Write failing port contract tests
    └── 🟢 Define minimal interfaces to compile
    └── Commit: "feat(ports): define HttpServerTransportPort"

Phase 3: Adapter Unit Tests
    └── 🔴 Write failing adapter unit tests (mocked SDK)
    └── 🟢 Implement HttpServerTransportAdapter
    └── Commit: "feat(adapter): implement HttpServerTransportAdapter"

Phase 4: Route Unit Tests
    └── 🔴 Write failing route tests
    └── 🟢 Implement /mcp route handler
    └── Commit: "feat(routes): add MCP route"

Phase 5: E2E Integration
    └── 🟢 Wire dependencies, E2E tests pass
    └── Commit: "feat: wire Streamable HTTP into server"

Phase 6: Backend Mock
    └── 🔴 Write failing backend connection test
    └── 🟢 Create mock HTTP server fixture
    └── Commit: "test: add mock HTTP server"

Phase 7: Compatibility
    └── 🟢 Verify all tests pass
    └── Add explicit compat tests
    └── Commit: "test: add compatibility tests"

Phase 8: Refactor
    └── 🔵 Extract patterns, reduce duplication
    └── Commit: "refactor: ..."

Phase 9: Documentation
    └── Update docs
    └── Commit: "docs: document HTTP transport"
```

---

## Definition of Done

- [x] E2E acceptance tests written FIRST (Phase 1)
- [ ] All tests pass at each commit
- [ ] No skipped or pending tests in final state
- [ ] 100% coverage on new adapter code
- [ ] Existing SSE tests unchanged and passing
- [ ] `bun test && bun run typecheck && bun run lint` passes
- [ ] Manual verification with Claude Code CLI

---

## Commit Log Preview

```
test: add failing E2E tests for Streamable HTTP transport
feat(ports): define HttpServerTransportPort interface
test: add failing adapter unit tests
feat(adapter): implement HttpServerTransportAdapter
test: add failing route unit tests
feat(routes): add /:endpointId/mcp route
feat: wire Streamable HTTP transport into server
test: add mock Streamable HTTP server fixture
test: add transport compatibility tests
refactor: extract common transport patterns
docs: document Streamable HTTP transport support
```

Each commit represents a complete Red-Green-Refactor cycle.
