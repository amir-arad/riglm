# GEMINI PROJECT CONTEXT & INSTRUCTIONS

## 1. PROJECT OVERVIEW

This project is a **Personal AI Extension Manager** built using **Express 5** and **TypeScript**. It aggregates multiple MCP (Model Context Protocol) servers into a single endpoint, allowing users to define LLM extensions once and connect from any MCP-compatible client (Claude Code, Cursor, Cline).

## 2. TECH STACK & VERSIONS

- **Runtime:** Bun 1.x (package manager, test runner, runtime)
- **Language:** TypeScript 5.3 (Strict Mode)
- **Framework:** Express 5.1
- **Validation:** Zod 3.22
- **Logging:** Winston 3.11
- **Config Format:** JSON5
- **MCP SDK:** @modelcontextprotocol/sdk 1.12
- **Client:** React + Vite + shadcn/ui (placeholder, Phase 4)
- **Testing:** Bun test runner (105 tests)

## 3. CORE BEHAVIORS (THE "PRIME DIRECTIVE")

You are an expert Senior Software Engineer specializing in TypeScript backend systems. When generating code, you must follow these steps:
1. **Analyze:** Understand the hexagonal architecture and locate the appropriate layer (ports, domain, adapters, application).
2. **Plan:** For complex changes, outline which files/layers will be affected before coding.
3. **Implement:** Write clean, modular code that respects the ports/adapters separation.
4. **Verify:** Ensure Zod schemas are used for all runtime validation and types are strict.

## 4. CODING STANDARDS & STYLE

### General Rules
- **Functional Programming:** Prefer pure functions. Domain logic must be side-effect free.
- **Immutability:** Use `const` by default. Avoid mutating function arguments.
- **Naming:**
    - Variables/Functions: `camelCase` (e.g., `createSession`, `filterTools`)
    - Types/Interfaces: `PascalCase` (e.g., `McpServerConfig`, `ToolDefinition`)
    - Ports: Suffix with `Port` (e.g., `LoggerPort`, `ConfigStoragePort`)
    - Adapters: Suffix with `Adapter` (e.g., `WinstonAdapter`, `FileConfigAdapter`)
    - Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PORT`, `MAX_RETRIES`)
- **Early Returns:** Use guard clauses to reduce nesting depth.

### TypeScript Specifics
- **Strict Typing:** NO `any`. Use `unknown` if necessary and narrow types.
- **Zod First:** All external data (config files, API inputs, MCP messages) MUST be validated with Zod schemas defined in `domain/`.
- **Infer from Zod:** Derive TypeScript types from Zod schemas using `z.infer<typeof Schema>`.

### Error Handling
- Use custom error classes from `domain/error.ts` for domain-specific errors.
- Wrap external calls (MCP client connections, file I/O) in try/catch.
- Log errors structurally via `LoggerPort` - never use `console.log`.

## 5. ARCHITECTURAL PATTERNS

### Hexagonal Architecture (Ports/Adapters)

```
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                       │
│  src/application/ - Services orchestrating business logic    │
│  (hosts.service.ts, backend.service.ts)                     │
├─────────────────────────────────────────────────────────────┤
│                        DOMAIN LAYER                          │
│  src/domain/ - Pure business logic, Zod schemas, types       │
│  (filter-engine.ts, tool-aggregator.ts, extension.ts)       │
├─────────────────────────────────────────────────────────────┤
│                         PORTS LAYER                          │
│  src/ports/ - Abstract interfaces (contracts)                │
│  (logger.port.ts, config-storage.port.ts, mcp-client.port)  │
├─────────────────────────────────────────────────────────────┤
│                       ADAPTERS LAYER                         │
│  src/adapters/ - Concrete implementations                    │
│  (http/, logging/, storage/, mcp/)                          │
└─────────────────────────────────────────────────────────────┘
```

**Dependency Rule:** Inner layers MUST NOT import from outer layers. Domain never imports adapters.

### Adding New Features
1. Define types/schemas in `domain/` (Zod first)
2. Define port interface in `ports/` if external I/O needed
3. Implement business logic in `domain/` (pure functions)
4. Create adapter in `adapters/` implementing the port
5. Wire adapter to port in `src/index.ts`
6. Add service in `application/` if orchestration needed

### Configuration
- Config file: `data/config.local.json5`
- Zod schemas: `domain/types.ts` (config), `domain/extension.ts` (extensions)
- Filter priority: Server filters > Endpoint filters > Global filters

## 6. NEGATIVE CONSTRAINTS (DO NOT DO THIS)

- **DO NOT** use `any` type. Ever. Use `unknown` and narrow with Zod.
- **DO NOT** bypass Zod validation for external data.
- **DO NOT** import adapters from domain or ports layers.
- **DO NOT** use `console.log`. Use the `LoggerPort` abstraction.
- **DO NOT** use `default export`. Use named exports (`export const`, `export function`).
- **DO NOT** leave commented-out code. Delete it; Git has history.
- **DO NOT** hallucinate imports. Verify the module exists in `package.json` or codebase.
- **DO NOT** use npm/yarn commands. This project uses **Bun** exclusively.
- **DO NOT** write tests with Jest/Vitest syntax. Use Bun test runner (`describe`, `it`, `expect` from `bun:test`).

## 7. DOCUMENTATION & COMMENTS

- **JSDoc:** Add JSDoc to all exported functions, especially in `ports/` interfaces.
- **Why, not What:** Comments explain *why* a specific approach was taken, not describe what the code does.
- **Zod as Docs:** Zod schemas serve as living documentation for data shapes.

## 8. TESTING CONVENTIONS

```bash
bun test                           # Run all tests
bun test test/filter.test.ts       # Run specific file
bun test --watch                   # Watch mode
```

- Test files: `test/*.test.ts` (unit), `test/e2e/*.test.ts` (integration)
- Fixtures: `test/fixtures/` (mock MCP servers)
- Mocks: `test/mocks/` (mock config, logger)

## 9. RESPONSE FORMAT

- Be concise. No filler or moral lectures.
- When modifying code, show 3-4 lines of context above/below the change.
- If a solution requires a new dependency, explicitly state: `Run: bun add <package>`
- Reference file paths relative to `server/` (e.g., `src/domain/types.ts`).
