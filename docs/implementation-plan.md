# Implementation Plan: Personal AI Extension Manager

## Overview

Transform the MCP aggregator (Riglm) into a full-featured Personal AI Extension Manager with dynamic extension control via Web UI.

## Phase Summary

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Foundation & Cleanup | ✅ Complete |
| 2 | Dynamic Extension State | Planned |
| 3 | Real-Time WebSocket | Planned |
| 4 | Client Redesign | Planned |

---

## Phase 1: Foundation & Cleanup

**Goal:** Clean codebase ready for new features

### 1.1 Workspace Cleanup ✅
- Removed unrelated projects (FLUJO, cml, mcp-memory-zep, etc.)
- Flattened repository: merged server/ into root
- Removed: client/ (replaced by vanilla Web UI in public/), schemas/

### 1.2 Config Consolidation ✅
- Simplified to 2-tier format: Servers → Endpoints
- Removed contexts layer
- Single `ConfigManager` class

### 1.3 Dead Code Removal ✅
- Removed unused `/rpc` endpoint
- Removed `connectServerImpl()` and related code
- Cleaned up imports

### 1.4 Extension Registry ✅

File-based extension CRUD operations with Zod validation.

**Design Document**: See [extension-registry-design.md](./extension-registry-design.md) for terminology, design decisions, and rationale.

**Files:**
```
src/extension-manager/
├── index.ts                 # Public exports
└── extension.registry.ts    # CRUD operations
```

**Domain types:** `src/domain/extension.ts` (Zod schemas)
**Storage adapter:** `src/adapters/storage/file-extension.adapter.ts`

**Data Model:**
```typescript
interface Extension {
  id: string;
  type: "mcp-server";
  name: string;
  description?: string;
  enabled: boolean;
  config: LocalServerConfig | RemoteServerConfig;
  filters?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface LocalServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface RemoteServerConfig {
  url: string;
  headers?: Record<string, string>;
}
```

**Storage:** `data/extensions.json`

**API:**
```typescript
class ExtensionRegistry {
  list(): Extension[]
  get(id: string): Extension | undefined
  create(ext: Omit<Extension, 'id' | 'createdAt' | 'updatedAt'>): Extension
  update(id: string, ext: Partial<Extension>): Extension
  delete(id: string): boolean
  getEnabled(): Extension[]
}
```

---

## Phase 2: Dynamic Extension State

**Goal:** Enable/disable extensions per session without restart

### 2.1 Per-Session Extension State

Modify `hosts.service.ts` to track which extensions are enabled per session.

**Changes to `HostSession`:**
```typescript
interface HostSession {
  sessionId: string;
  enabledExtensions: Set<string>;  // NEW
  tools: ToolDefinition[];
  toolHandlers: Map<string, ToolHandler>;
  // ...
}
```

**New Methods:**
```typescript
// In HostsService
enableExtension(sessionId: string, extensionId: string): Promise<void>
disableExtension(sessionId: string, extensionId: string): Promise<void>
getSessionState(sessionId: string): SessionState
```

### 2.2 Tool List Updates

When extension is toggled:
1. Update `enabledExtensions` set
2. Recompute available tools
3. Send MCP `notifications/tools/list_changed`
4. Client re-fetches tool list

**Key:** The MCP SDK already supports `listChanged` capability (enabled in `hosts.service.ts:85`)

### 2.3 Management REST API

**New File:** `src/api/management.controller.ts`

**Endpoints:**
```
GET    /api/extensions              # List all extensions
POST   /api/extensions              # Create extension
GET    /api/extensions/:id          # Get extension
PUT    /api/extensions/:id          # Update extension
DELETE /api/extensions/:id          # Delete extension

GET    /api/sessions                # List active sessions
GET    /api/sessions/:id            # Get session details
PUT    /api/sessions/:id/extensions/:extId   # Toggle extension
DELETE /api/sessions/:id            # Force disconnect
```

---

## Phase 3: Real-Time WebSocket

**Goal:** Push session/extension events to Web UI

### 3.1 WebSocket Server

**New File:** `src/api/websocket.controller.ts`

**Dependencies:** Add `ws` package

**Events (Server → Client):**
```typescript
interface SessionCreatedEvent {
  type: "session:created";
  session: { id, endpointId, extensions: [...] };
}

interface SessionClosedEvent {
  type: "session:closed";
  sessionId: string;
}

interface ExtensionToggledEvent {
  type: "extension:toggled";
  sessionId: string;
  extensionId: string;
  enabled: boolean;
}
```

**Commands (Client → Server):**
```typescript
interface ToggleExtensionCommand {
  type: "toggle-extension";
  sessionId: string;
  extensionId: string;
  enabled: boolean;
}
```

### 3.2 Event Integration

Emit events from:
- `TransportSessionManager` - session lifecycle
- `HostsService` - extension toggles

---

## Phase 4: Client Redesign

**Goal:** Enhanced Web UI for extension and session management

### 4.1 Current State

The current Web UI is a vanilla HTML/CSS/JS implementation in `public/`. This may be enhanced or replaced with a React-based solution depending on feature requirements.

### 4.2 API Client (if React UI is adopted)

**Potential Structure:**
```
src/web/                      
├── api/
│   ├── client.ts             # Base fetch client
│   ├── extensions.api.ts     # Extension CRUD
│   ├── sessions.api.ts       # Session queries
│   └── websocket.ts          # Real-time connection
├── pages/
│   ├── Extensions.tsx
│   ├── Sessions.tsx
│   └── Dashboard.tsx
└── hooks/
    ├── useExtensions.ts
    ├── useSessions.ts
    └── useWebSocket.ts
```

### 4.3 Features

**Extensions Page (`/extensions`):**
- List all defined extensions
- Create/edit/delete extensions
- Show enabled/disabled status

**Sessions Page (`/sessions`):**
- Live list of connected MCP clients
- Per-session extension toggles
- Connection info (endpoint, client name)

**Profiles Page (`/profiles`):** (Optional for MVP)
- Save/load extension configurations
- Quick-switch between setups

---

## File Structure (Current + Planned)

```
riglm/                            # Flattened monorepo (no server/ or client/ subdirs)
├── src/
│   ├── index.ts                  # Entry point (wires adapters)
│   ├── server.ts                 # RiglmServer (Express app)
│   ├── embedded-assets.ts        # Standalone binary asset embedding
│   │
│   ├── ports/                    # Interface contracts ✅
│   │   ├── logger.port.ts
│   │   ├── config-storage.port.ts
│   │   ├── mcp-client.port.ts
│   │   ├── mcp-server.port.ts
│   │   └── transport.port.ts
│   │
│   ├── domain/                   # Pure business logic ✅
│   │   ├── types.ts
│   │   ├── error.ts
│   │   ├── filter-engine.ts
│   │   ├── config-resolver.ts
│   │   └── tool-aggregator.ts
│   │
│   ├── adapters/                 # Implementations ✅
│   │   ├── http/                 # Express routes
│   │   ├── logging/              # Winston adapter
│   │   ├── storage/              # File config adapter
│   │   └── mcp/                  # MCP client/server adapters
│   │
│   ├── application/              # Services ✅
│   │   ├── hosts.service.ts      # Modified in Phase 2
│   │   └── backend.service.ts
│   │
│   ├── extension-manager/        # Phase 1.4 ✅
│   │   ├── index.ts
│   │   └── extension.registry.ts
│   │
│   ├── api/                      # Phase 3 (planned)
│   │   └── websocket.controller.ts
│   │
│   ├── host-gateway/             # Session management ✅
│   │   └── transport-session-manager.ts
│   │
│   ├── cli/                      # CLI commands ✅
│   │
│   └── etc/                      # Utilities ✅
│       ├── env.ts
│       └── service.ts
│
├── public/                       # Vanilla Web UI (HTML/CSS/JS) ✅
│   ├── index.html
│   └── favicon.svg
│
├── data/
│   └── extensions.json           # Phase 1.4 ✅
│
├── test/                         # Unit and E2E tests ✅
│   ├── filter.test.ts
│   ├── e2e/
│   ├── fixtures/
│   └── mocks/
│
├── e2e-ui/                       # Playwright UI tests ✅
│
└── docs/                         # Documentation
```

**Note:** The `client/` directory with React/shadcn was removed. The current Web UI is a vanilla HTML/CSS/JS implementation in `public/`. Phase 4 may introduce a new React-based UI if needed.

---

## Verification Checklist

### After Phase 1
- [x] `bun run typecheck` passes
- [x] Server starts with `bun run dev`
- [x] Can connect MCP client to endpoint
- [x] 173 tests passing

### After Phase 2
- [ ] REST API returns extension list
- [ ] Can toggle extension via API
- [ ] Tool list updates after toggle

### After Phase 3
- [ ] WebSocket connects from browser
- [ ] Session events appear in real-time
- [ ] Toggle via WebSocket works

### After Phase 4
- [ ] Web UI loads at localhost:8080
- [ ] Extensions page shows list
- [ ] Sessions page shows live connections
- [ ] Toggle switches work end-to-end

---

## Dependencies to Add

### Server (Phase 3)
```json
{
  "dependencies": {
    "ws": "^8.x"
  },
  "devDependencies": {
    "@types/ws": "^8.x"
  }
}
```

### Client (Phase 4 - if React UI is adopted)
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "@tanstack/react-query": "^5.x"
  }
}
```

---

## Risk Mitigation

1. **Test suite** - ✅ Migrated to Bun's built-in test runner (173 tests passing)
2. **MCP client compatibility** - Test with Claude Code, Cursor, Cline
3. **WebSocket reliability** - Add reconnection logic in client
4. **State sync** - Handle race conditions in toggle operations
