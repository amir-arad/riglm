# Implementation Plan: Personal AI Extension Manager

## Overview

Transform the MCP router (RigLM) into a full-featured Personal AI Extension Manager with dynamic extension control via Web UI.

## Phase Summary

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Foundation & Cleanup | ✅ Complete |
| 2 | Layered Server Toggle | ✅ Complete |
| 3 | Sessions UI | Planned |

---

## Phase 1: Foundation & Cleanup ✅

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

---

## Phase 2: Layered Server Toggle

**Goal:** Toggle MCP servers at endpoint-level (persistent) and session-level (ephemeral)

### 2.1 Data Model

```typescript
// Endpoint config (persistent, in config.json5)
interface EndpointConfig {
  servers: string[];           // Available servers
  disabledServers?: string[];  // Disabled by default (NEW)
  filters?: string[];
}

// Session state (ephemeral, in-memory)
interface HostSession {
  sessionId: string;
  serverOverrides: Map<string, boolean>;  // NEW: true=force-enable, false=force-disable
  tools: ToolDefinition[];
  toolHandlers: Map<string, ToolHandler>;
}
```

### 2.2 Toggle Logic

```typescript
function isServerEnabled(serverName: string, endpoint: EndpointConfig, session: HostSession): boolean {
  // 1. Check session override (highest priority)
  if (session.serverOverrides.has(serverName)) {
    return session.serverOverrides.get(serverName)!;
  }
  // 2. Check endpoint default
  if (endpoint.disabledServers?.includes(serverName)) {
    return false;
  }
  // 3. Server is in endpoint.servers list = enabled
  return endpoint.servers.includes(serverName);
}
```

### 2.3 API Endpoints

```
# Endpoint-level (persistent)
PUT  /api/endpoints/:id/servers/:server/disable   # Add to disabledServers
PUT  /api/endpoints/:id/servers/:server/enable    # Remove from disabledServers

# Session-level (ephemeral)
GET  /api/sessions                                 # List active sessions
GET  /api/sessions/:id                             # Session details + effective tool list
POST /api/sessions/:id/override/:server            # Body: { enabled: boolean }
DELETE /api/sessions/:id/override/:server          # Clear override, use endpoint default
```

### 2.4 MCP Notification

Wire up `notifyToolsListChanged()` (already declared in capabilities but never called):

- Call when config reloads
- Call when server toggled at endpoint level
- Call when session override changes

MCP clients will automatically re-fetch the tool list.

### 2.5 Files to Modify

| File | Changes |
|------|---------|
| `src/domain/config-resolver.ts` | Add `disabledServers` to EndpointConfigSchema |
| `src/application/hosts.service.ts` | Add `serverOverrides` to HostSession, implement toggle logic |
| `src/adapters/http/management.routes.ts` | Add session and toggle endpoints |
| `src/adapters/mcp/mcp-server.adapter.ts` | Expose `notifyToolsListChanged()` |

---

## Phase 3: Sessions UI

**Goal:** Add session management to existing vanilla UI

### 3.1 New Sessions View

Add to `public/index.html`:

```
#/sessions route
├── Table: sessionId, endpoint, connectedAt, servers
├── Per-row: toggle switches for each server
├── "Reset to default" button per session
└── Auto-refresh: poll /api/sessions every 10s when visible
```

### 3.2 Enhanced Endpoints View

Update existing Endpoints view:
- Show `disabledServers` as grayed-out toggle switches
- Toggle persists to config file

### 3.3 Visual Feedback

- Toast notifications on toggle success/failure
- Spinner during API calls
- Session count badge in nav

### 3.4 Files to Modify

| File | Changes |
|------|---------|
| `public/index.html` | Add Sessions view (~150 lines), enhance Endpoints view |

---

## Verification Checklist

### After Phase 1 ✅
- [x] `bun run typecheck` passes
- [x] Server starts with `bun run dev`
- [x] Can connect MCP client to endpoint
- [x] 110 tests passing

### After Phase 2 ✅
- [x] `GET /api/sessions` returns active sessions
- [x] `POST /api/sessions/:id/override/:server` toggles server for session
- [x] MCP client receives `tools/list_changed` notification
- [x] Tool list updates correctly after toggle

### After Phase 3
- [ ] Sessions view shows live connections
- [ ] Toggle switches work for session-level overrides
- [ ] Endpoint toggles persist to config
- [ ] UI auto-refreshes every 10s

---

## Dependencies

**No new dependencies required.**

- No WebSocket (polling is sufficient for personal use)
- No React (vanilla JS handles current complexity)
- No database (session state is ephemeral by design)

---

## Deferred Features

Add only if users request:

- **Profiles** - Save/load extension configurations
- **WebSocket** - Real-time push (when >50 concurrent sessions)
- **React migration** - When UI complexity exceeds vanilla JS
- **Database** - When session state needs to survive restarts
