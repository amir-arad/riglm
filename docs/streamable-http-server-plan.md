# Streamable HTTP Server Transport Implementation Plan

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

## Implementation Strategy

### Guiding Principles

1. **Hexagonal Discipline**: New code follows ports/adapters pattern
2. **Backward Compatibility**: SSE endpoints remain functional
3. **Test-First**: Each component has unit + integration tests
4. **Incremental Delivery**: Ship in phases, each independently valuable

### Phase 1: Port Extension (Foundation)

**Goal**: Extend abstractions without breaking existing code.

#### 1.1 Extend TransportPort for HTTP semantics

```typescript
// ports/transport.port.ts

/**
 * Extended transport for Streamable HTTP server
 * Handles the request-response pattern of HTTP transport
 */
export interface HttpServerTransportPort extends SdkTransportPort {
  /**
   * Handle an incoming HTTP request
   * Used for both POST (client→server) and GET (server→client SSE)
   */
  handleRequest(req: HttpRequestPort, res: HttpResponsePort): Promise<void>;
}

/**
 * HTTP request abstraction (decoupled from Express)
 */
export interface HttpRequestPort {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  url?: string;
}
```

#### 1.2 Extend ServerTransportFactory

```typescript
// ports/transport.port.ts

export interface ServerTransportFactory {
  // Existing
  createSseServerTransport(
    messagePath: string,
    response: HttpResponsePort
  ): TransportPort;

  // New
  createHttpServerTransport(
    options: HttpServerTransportOptions
  ): HttpServerTransportPort;
}

export interface HttpServerTransportOptions {
  sessionIdGenerator?: () => string;
  onsessioninitialized?: (sessionId: string) => void;
}
```

**Tests (Phase 1)**:
- `test/ports/transport.port.test.ts` - Type conformance tests
- Verify backward compatibility with existing SSE code

---

### Phase 2: Adapter Implementation

**Goal**: Create the Streamable HTTP server adapter wrapping MCP SDK.

#### 2.1 Create HttpServerTransportAdapter

```typescript
// adapters/mcp/transports/http-server.adapter.ts

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export class HttpServerTransportAdapter implements HttpServerTransportPort {
  private transport: StreamableHTTPServerTransport;
  private _sessionId: string;

  constructor(options: HttpServerTransportOptions) {
    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: options.sessionIdGenerator,
      onsessioninitialized: (sessionId) => {
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

  // ... error/close handlers

  getSdkTransport(): StreamableHTTPServerTransport {
    return this.transport;
  }
}
```

#### 2.2 Update Factory

```typescript
// adapters/mcp/transports/index.ts

export class ServerTransportFactoryAdapter implements ServerTransportFactory {
  // Existing
  createSseServerTransport(...): TransportPort { ... }

  // New
  createHttpServerTransport(options: HttpServerTransportOptions): HttpServerTransportPort {
    return new HttpServerTransportAdapter(options);
  }
}
```

**Tests (Phase 2)**:
- `test/adapters/http-server.adapter.test.ts` - Unit tests for adapter
- Mock StreamableHTTPServerTransport behavior
- Test session lifecycle, error handling, cleanup

---

### Phase 3: Route Integration

**Goal**: Add HTTP endpoint alongside existing SSE.

#### 3.1 Add Streamable HTTP Route

```typescript
// adapters/http/routes.ts

// New endpoint: POST|GET /:endpointId/mcp
hostsRoutes.all("/:endpointId/mcp", async (req, res) => {
  const request = req as EndpointRequest;
  if (!request.hostsService) {
    return res.status(404).json({ error: "Endpoint not found" });
  }

  // Check for existing session via header
  const existingSessionId = req.headers["mcp-session-id"] as string | undefined;

  if (existingSessionId && request.hostsService.hasSession(existingSessionId)) {
    // Existing session - route to transport
    const session = request.hostsService.getSession(existingSessionId);
    if (session?.transport && isHttpServerTransport(session.transport)) {
      await session.transport.handleRequest(req, res);
      return;
    }
  }

  // New session - create transport and session
  if (req.method === "POST") {
    const controller = new AbortController();
    const transport = serverTransportFactory.createHttpServerTransport({
      sessionIdGenerator: () => generateSessionId(),
      onsessioninitialized: (sessionId) => {
        res.setHeader("Mcp-Session-Id", sessionId);
      },
    });

    const sessionId = await request.hostsService.createSession(
      transport,
      { signal: controller.signal }
    );

    // Handle the request that initiated the session
    await transport.handleRequest(req, res);

    req.on("close", () => {
      controller.abort();
      request.hostsService.removeSession(sessionId);
    });
  } else {
    res.status(405).json({ error: "Method not allowed for new sessions" });
  }
});
```

#### 3.2 Session Management Considerations

The `TransportSessionManager` needs no changes - it already:
- Tracks sessions by ID
- Handles cleanup on transport close
- Manages inactivity timeouts

However, HTTP transport sessions have different lifecycle:
- May be shorter-lived (request-response)
- Session ID comes from header, not transport
- Need to handle stateless reconnection

**Add session lookup helper**:

```typescript
// host-gateway/transport-session-manager.ts

// Add method to find session by custom criteria
getSessionByPredicate(
  predicate: (session: TransportSession) => boolean
): TransportSession | undefined {
  for (const session of this.sessions.values()) {
    if (predicate(session)) return session;
  }
  return undefined;
}
```

**Tests (Phase 3)**:
- `test/e2e/streamable-http.e2e.test.ts` - Full flow tests
- Connect via `StreamableHTTPClientTransport`
- Tool discovery and invocation
- Session persistence across requests
- Concurrent sessions

---

### Phase 4: Test Infrastructure

**Goal**: Parallel test coverage for HTTP transport.

#### 4.1 Mock HTTP Server Fixture

```typescript
// test/fixtures/mock-http-server.ts

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export function mockHttpServer() {
  const server = makeMockServer();
  const app = express();

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string;

    let transport = sessions.get(sessionId);
    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, transport!);
          res.setHeader("Mcp-Session-Id", id);
        },
      });
      await server.connect(transport);
    }

    await transport.handleRequest(req, res);
  });

  return { listen, close };
}
```

#### 4.2 E2E Test Suite

```typescript
// test/e2e/streamable-http.e2e.test.ts

describe("Streamable HTTP Transport E2E", () => {
  describe("Session Lifecycle", () => {
    test("establish session via POST, receive Mcp-Session-Id header");
    test("subsequent requests use Mcp-Session-Id for routing");
    test("session persists across multiple requests");
    test("session cleanup on inactivity timeout");
  });

  describe("Tool Operations", () => {
    test("list tools via HTTP transport");
    test("call tool and receive JSON response");
    test("call tool and receive SSE stream response");
  });

  describe("Multi-Server Aggregation", () => {
    test("aggregate tools from stdio + HTTP backends");
    test("route tool calls to correct backend");
  });

  describe("Error Handling", () => {
    test("invalid session ID returns 404");
    test("malformed request returns 400");
    test("backend failure returns appropriate error");
  });

  describe("Concurrent Sessions", () => {
    test("multiple HTTP sessions operate independently");
    test("HTTP and SSE sessions coexist");
  });
});
```

#### 4.3 Backward Compatibility Tests

```typescript
// test/e2e/transport-compat.test.ts

describe("Transport Backward Compatibility", () => {
  test("SSE transport still works after HTTP addition");
  test("mixed SSE and HTTP clients connect to same endpoint");
  test("existing SSE tests pass without modification");
});
```

---

### Phase 5: Documentation & Migration

**Goal**: Document the feature and migration path.

#### 5.1 Update docs/mcp-sdk-reference.md

Add Streamable HTTP server usage:

```typescript
// Server-side Streamable HTTP (new)
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});
await server.connect(transport);
```

#### 5.2 Update CLAUDE.md

Add to Architecture section:

```
MCP Clients (Claude Code, Cursor, Cline)
         │
         │ SSE/HTTP (both supported)
         ▼
```

#### 5.3 Update docs/mcp-transport.md

Add riglm-specific section on supported transports.

---

## File Change Summary

### New Files

| File | Purpose |
|------|---------|
| `src/adapters/mcp/transports/http-server.adapter.ts` | Streamable HTTP server adapter |
| `test/adapters/http-server.adapter.test.ts` | Adapter unit tests |
| `test/fixtures/mock-http-server.ts` | Mock for E2E tests |
| `test/e2e/streamable-http.e2e.test.ts` | HTTP transport E2E tests |
| `test/e2e/transport-compat.test.ts` | Backward compatibility tests |

### Modified Files

| File | Changes |
|------|---------|
| `src/ports/transport.port.ts` | Add `HttpServerTransportPort`, `HttpRequestPort`, factory method |
| `src/adapters/mcp/transports/index.ts` | Add factory method, export new adapter |
| `src/adapters/http/routes.ts` | Add `/:endpointId/mcp` route |
| `docs/mcp-sdk-reference.md` | Document Streamable HTTP usage |
| `CLAUDE.md` | Update architecture diagram |

### Unchanged Files

| File | Reason |
|------|--------|
| `src/adapters/mcp/transports/sse-server.adapter.ts` | Backward compatibility |
| `src/host-gateway/transport-session-manager.ts` | Already transport-agnostic |
| `src/application/hosts.service.ts` | Already transport-agnostic |
| `test/e2e/happy-flow.e2e.test.ts` | Keep SSE tests intact |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| SDK API differences | Study SDK source, add defensive typing |
| Session state complexity | Extensive E2E tests for edge cases |
| Performance regression | Benchmark before/after |
| Breaking SSE clients | Run all existing tests, add compat suite |

---

## Definition of Done

- [ ] All new code follows hexagonal architecture
- [ ] 100% test coverage for new adapter
- [ ] E2E tests for all Streamable HTTP scenarios
- [ ] Existing SSE tests pass unchanged
- [ ] Documentation updated
- [ ] No TypeScript errors (`bun run typecheck`)
- [ ] No lint errors (`bun run lint`)
- [ ] Manual testing with Claude Code CLI (`--transport http`)

---

## Execution Order

```
Phase 1: Port Extension
    └── 1.1 Extend TransportPort → 1.2 Extend Factory
              │
              ▼
Phase 2: Adapter Implementation
    └── 2.1 HttpServerTransportAdapter → 2.2 Update Factory
              │
              ▼
Phase 3: Route Integration
    └── 3.1 Add /mcp route → 3.2 Session management
              │
              ▼
Phase 4: Test Infrastructure (parallel with Phase 3)
    └── 4.1 Mock server → 4.2 E2E tests → 4.3 Compat tests
              │
              ▼
Phase 5: Documentation
    └── 5.1 SDK ref → 5.2 CLAUDE.md → 5.3 Transport docs
```

Each phase is independently testable and deployable.
