# Extension Registry - Terminology & Design Documentation

## Purpose

Document the terminology, design decisions, and rationale for the Extension Registry module.

---

## Terminology Glossary

### Core Concepts

| Term | Layer | Definition |
|------|-------|------------|
| **Extension** | Registry/Management | Abstract unit that can be registered, enabled/disabled, and managed. Has metadata (id, name, enabled, tags, timestamps). |
| **Server** | MCP Protocol | An MCP server instance (local via stdio or remote via SSE/HTTP). One type of Extension. |
| **Knowledge Artifact** | Content | Static or dynamic knowledge that can be injected into LLM context. A future Extension type. |
| **Endpoint** | Gateway | An aggregation point that combines multiple enabled Extensions for client connections. |
| **Session** | Connection | A single MCP client connection to an Endpoint. Has its own enabled/disabled Extension state. |
| **Profile** | Configuration | A saved preset of enabled/disabled Extensions. Quick-switch between setups. |

### Relationship Diagram

```
Extension (abstract)
├── type: "mcp-server"     → Server (MCP protocol layer)
│   ├── LocalServerConfig  → stdio transport (command + args)
│   └── RemoteServerConfig → HTTP/SSE transport (url)
│
└── type: "knowledge-base" → Knowledge Artifact (future)
    └── (TBD: file refs, RAG config, prompt templates?)
```

### Naming Convention

| Code Layer | Use "Server" | Use "Extension" |
|------------|--------------|-----------------|
| MCP adapters (`adapters/mcp/`) | ✓ | |
| Domain types (`domain/types.ts`) | ✓ | |
| Backend service | ✓ | |
| Extension registry | | ✓ |
| REST API | | ✓ |
| Web UI | | ✓ |

**Rationale**: "Server" is accurate at the MCP protocol level. "Extension" is the user-facing abstraction that encompasses servers and future types.

---

## Design Decisions

### Decision 1: Extension Type System

**Choice**: Extensions have a `type` discriminator field to support multiple extension kinds.

**Types planned**:
- `mcp-server` - MCP protocol servers (Phase 1)
- `knowledge-base` - Knowledge artifacts (Future phase)

**Interface**:
```typescript
interface Extension {
  id: string;
  type: "mcp-server" | "knowledge-base";  // Discriminator
  name: string;
  description?: string;
  enabled: boolean;
  config: McpServerConfig | KnowledgeBaseConfig;  // Union based on type
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Decision 2: Layered Terminology

**Choice**: Keep "Server" for MCP-level code, use "Extension" for management layer.

**Why**:
- MCP SDK uses "server/client" terminology
- "Extension" is the product-level abstraction
- Clean separation of concerns

### Decision 3: File-Based Storage

**Choice**: Store extensions in `server/data/extensions.json`

**Why**:
- Aligns with single-user, local-only model
- No database dependency
- Human-readable for debugging
- Consistent with existing `config.local.json5` approach

### Decision 4: Knowledge Artifacts (Deferred)

**Choice**: Leave knowledge artifact definition loosely specified for now.

**Known so far**:
- Will be a separate extension type (`type: "knowledge-base"`)
- Concrete implementation deferred to future phase

### Decision 5: Config File Strategy

**Choice**: Phase out monolithic `config.local.json5` in favor of purpose-specific config files.

**Evolution**:
```
Current:  config.local.json5 (servers + endpoints + filters)
    ↓
Future:   extensions.json    (extension definitions)
          endpoints.json     (routing/aggregation)
          profiles.json      (saved presets)
```

**Rationale**:
- Separation of concerns (extensions vs routing vs presets)
- Smaller, focused files are easier to manage
- Enables different update frequencies (extensions change often, endpoints rarely)

**Migration strategy**:
- Phase 1.4: Introduce `extensions.json` alongside existing config
- Interim: Both files coexist; runtime merges them
- Future: Deprecate and remove `config.local.json5`

### Decision 6: Endpoint Configuration

**Choice**: Endpoints will be configured in a separate `endpoints.json` file.

---

## Summary of Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Extension type system | Discriminated union with `type` field |
| 2 | Layered terminology | Server = MCP level, Extension = management level |
| 3 | File-based storage | JSON files in `server/data/` |
| 4 | Knowledge artifacts | Deferred; separate type when ready |
| 5 | Config strategy | Phase out monolithic config → purpose-specific files |
| 6 | Endpoint config | Separate `endpoints.json` file |

---

## Open Questions

1. **Filter inheritance**: Current filter hierarchy (server > endpoint > global) - where do filters live in the split config model?
