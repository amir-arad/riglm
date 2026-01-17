# CLI Design for ABC Server

## Design Principles

1. **Zero-config defaults** - Works out of the box without any arguments
2. **Convention over configuration** - Sensible defaults that match common patterns
3. **Priority chain**: CLI flags > Environment variables > Config file > Defaults
4. **Familiar conventions** - POSIX-style flags, standard naming patterns

---

## Commands

```
abc [command] [options]

Commands:
  serve     Start the server (default)
  validate  Validate configuration without starting
  init      Create a new configuration file
  version   Show version information

If no command is specified, `serve` is assumed.
```

---

## `serve` Command (Default)

### Options

| Flag | Short | Env Variable | Default | Description |
|------|-------|--------------|---------|-------------|
| `--port` | `-p` | `ABC_PORT`, `PORT` | `3000` | HTTP server port |
| `--host` | `-H` | `ABC_HOST` | `0.0.0.0` | Bind address |
| `--config` | `-c` | `ABC_CONFIG`, `CONFIG_PATH` | Auto-detect* | Configuration file path |
| `--log-level` | `-l` | `ABC_LOG_LEVEL`, `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error`, `silent` |
| `--log-format` | | `ABC_LOG_FORMAT` | `pretty` | Output format: `pretty`, `json` |
| `--log-file` | | `ABC_LOG_FILE` | (none) | Also write logs to file |
| `--no-ui` | | `ABC_DISABLE_UI=1` | (enabled) | Disable web management UI |
| `--no-api` | | `ABC_DISABLE_API=1` | (enabled) | Disable REST management API |
| `--quiet` | `-q` | | | Suppress startup banner and non-error output |
| `--verbose` | `-v` | | | Shorthand for `--log-level=debug` |
| `--watch` | `-w` | `ABC_WATCH=1` | (disabled) | Hot-reload on config file changes |
| `--dry-run` | | | | Validate config and print effective settings, then exit |

*Config auto-detection (fixed locations, checked in order):
1. `./.abc/config.json5` (local override)
2. `~/.config/abc/config.json5` (XDG default on Linux/macOS)
3. `~/Library/Application Support/abc/config.json5` (macOS alternative)
4. `%APPDATA%\abc\config.json5` (Windows)

When config is found, `extensions.json` is expected in the same directory:

```
~/.config/abc/           # or ./.abc/ for local override
├── config.json5         # Server/endpoint configuration
├── extensions.json      # Extension registry
└── secrets.json         # (future) Secrets file
```

### Precedence Examples

```bash
# CLI takes precedence over env
ABC_PORT=4000 abc serve --port 5000
# → Uses port 5000

# Env takes precedence over defaults
ABC_PORT=4000 abc serve
# → Uses port 4000

# Default when nothing specified
abc serve
# → Uses port 3000
```

### Usage Examples

```bash
# Minimal - uses all defaults
abc

# Explicit config file
abc serve -c /path/to/config.json5

# Development mode with debug logging and hot-reload
abc serve -v -w

# Production mode - minimal logging, JSON format for log aggregation
abc serve -q --log-format=json --log-level=warn

# Headless mode - MCP endpoints only, no UI or API
abc serve --no-ui --no-api

# Dry run - validate and show effective config
abc serve --dry-run

# Bind to localhost only (for security)
abc serve -H 127.0.0.1

# Custom port with log file
abc serve -p 8080 --log-file=/var/log/abc/server.log
```

---

## `validate` Command

Validate configuration without starting the server.

```bash
abc validate [options]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--config` | `-c` | Configuration file to validate |
| `--strict` | | Fail on warnings (missing env vars, deprecated fields) |
| `--format` | | Output format: `text` (default), `json` |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Valid configuration |
| 1 | Invalid configuration (parse error, schema violation) |
| 2 | Configuration file not found |
| 3 | Warnings present (with `--strict`) |

### Usage Examples

```bash
# Validate default config
abc validate

# Validate specific file
abc validate -c production.json5

# CI/CD pipeline validation
abc validate --strict --format=json
```

---

## `init` Command

Create a new configuration file interactively or from a template.

```bash
abc init [options]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--path` | `-p` | Output directory (default: `~/.config/abc/`) |
| `--local` | | Create in `./.abc/` instead of global |
| `--template` | `-t` | Template: `minimal`, `standard`, `full` |
| `--force` | `-f` | Overwrite existing files |
| `--interactive` | `-i` | Interactive setup wizard |

### What Gets Created

```
<path>/
├── config.json5         # Server/endpoint configuration
└── extensions.json      # Empty extension registry
```

### Templates

- **minimal**: Empty servers/endpoints, just the structure
- **standard**: Example with filesystem and fetch servers
- **full**: All options documented with comments

### Usage Examples

```bash
# Interactive setup (creates ~/.config/abc/)
abc init -i

# Quick start with standard template
abc init -t standard

# Create local project config
abc init --local -t minimal

# Generate documented config for reference
abc init -t full -p ./reference/
```

---

## `version` Command

```bash
abc version [options]
```

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |
| `--check` | Check for updates (if registry available) |

### Output

```
abc v1.0.0
Runtime: Bun 1.1.x
MCP SDK: @modelcontextprotocol/sdk 1.12.x
```

---

## Environment Variables

All environment variables use `ABC_` prefix. Legacy variables (without prefix) are supported for backward compatibility but deprecated.

| Variable | Legacy | Description |
|----------|--------|-------------|
| `ABC_PORT` | `PORT` | Server port |
| `ABC_HOST` | - | Bind address |
| `ABC_CONFIG` | `CONFIG_PATH` | Config file path |
| `ABC_LOG_LEVEL` | `LOG_LEVEL` | Log level |
| `ABC_LOG_FORMAT` | - | Log format (pretty/json) |
| `ABC_LOG_FILE` | - | Log file path |
| `ABC_DISABLE_UI` | - | Disable web UI (any truthy value) |
| `ABC_DISABLE_API` | - | Disable management API |
| `ABC_WATCH` | - | Enable config hot-reload |

### Truthy Values

For boolean env vars: `1`, `true`, `yes`, `on` (case-insensitive)

---

## Startup Banner

Default output on startup (unless `--quiet`):

```
╭─────────────────────────────────────────────────╮
│  ABC Server v1.0.0                              │
│  Personal AI Extension Manager                  │
╰─────────────────────────────────────────────────╯

  Config:     /home/user/abc/config.json5
  Endpoints:  main, dev
  Servers:    3 configured (2 local, 1 remote)

  MCP:        http://localhost:3000/:endpoint/sse
  Web UI:     http://localhost:3000/ui
  API:        http://localhost:3000/api

  Press Ctrl+C to stop
```

With `--quiet`:
```
ABC Server listening on http://localhost:3000
```

---

## Help Output

```
abc - Personal AI Extension Manager

Usage:
  abc [command] [options]

Commands:
  serve      Start the server (default)
  validate   Validate configuration file
  init       Create new configuration file
  version    Show version information
  help       Show this help message

Options (serve):
  -p, --port <port>        Server port [env: ABC_PORT] [default: 3000]
  -H, --host <host>        Bind address [env: ABC_HOST] [default: 0.0.0.0]
  -c, --config <path>      Config file path [env: ABC_CONFIG]
  -l, --log-level <level>  Log level (debug|info|warn|error|silent)
      --log-format <fmt>   Log format (pretty|json) [default: pretty]
      --log-file <path>    Write logs to file
      --no-ui              Disable web management UI
      --no-api             Disable REST management API
  -q, --quiet              Suppress startup banner
  -v, --verbose            Enable debug logging
  -w, --watch              Hot-reload on config changes
      --dry-run            Validate config and exit

Examples:
  abc                              # Start with defaults
  abc serve -p 8080 -v             # Custom port, debug mode
  abc serve --no-ui --no-api       # MCP endpoints only
  abc validate -c prod.json5       # Validate config
  abc init -i                      # Interactive setup

Documentation:
  https://github.com/your-org/abc

```

---

## Implementation Notes

### Recommended Library

Use **Commander.js** or **yargs** for Node.js, or Bun's built-in argument parsing:

```typescript
// Example with Bun's Bun.argv
const args = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    port: { type: 'string', short: 'p' },
    config: { type: 'string', short: 'c' },
    verbose: { type: 'boolean', short: 'v' },
    quiet: { type: 'boolean', short: 'q' },
    // ...
  }
});
```

### Config Resolution

```typescript
interface ResolvedConfig {
  port: number;
  host: string;
  configPath: string;
  logLevel: LogLevel;
  logFormat: 'pretty' | 'json';
  logFile?: string;
  enableUi: boolean;
  enableApi: boolean;
  watch: boolean;
}

function resolveConfig(cli: CliArgs, env: NodeJS.ProcessEnv): ResolvedConfig {
  return {
    port: cli.port ?? env.ABC_PORT ?? env.PORT ?? 3000,
    host: cli.host ?? env.ABC_HOST ?? '0.0.0.0',
    configPath: cli.config ?? env.ABC_CONFIG ?? env.CONFIG_PATH ?? findConfig(),
    logLevel: cli.verbose ? 'debug' : (cli.logLevel ?? env.ABC_LOG_LEVEL ?? 'info'),
    logFormat: cli.logFormat ?? env.ABC_LOG_FORMAT ?? 'pretty',
    logFile: cli.logFile ?? env.ABC_LOG_FILE,
    enableUi: !cli.noUi && env.ABC_DISABLE_UI !== '1',
    enableApi: !cli.noApi && env.ABC_DISABLE_API !== '1',
    watch: cli.watch ?? env.ABC_WATCH === '1',
  };
}
```

### Feature Flags for UI/API

The server should conditionally mount routes:

```typescript
// In server.ts
if (config.enableUi) {
  this.app.use('/ui', express.static('client/public'));
}

if (config.enableApi) {
  this.app.use('/api', managementRoutes);
}

// MCP endpoints always enabled
this.app.use('/', mcpRoutes);
```

---

## Future Considerations

### Secrets Management

The config file contains sensitive values (API tokens, auth headers). A layered approach is planned:

#### Phase 1: Environment Variable Interpolation

Support `${VAR}` syntax in config values, resolved from process environment at startup:

```json5
{
  "servers": {
    "github": {
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    "remote": {
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer ${API_TOKEN}" }
    }
  }
}
```

This enables delegation to external secret managers:
```bash
op run -- abc serve           # 1Password
doppler run -- abc serve      # Doppler
sops exec-env secrets.yaml 'abc serve'  # SOPS
```

#### Phase 2: Separate Secrets File

Optional `secrets.json` file (mode 0600) alongside config:

```
~/.config/abc/
├── config.json5      # Can be versioned/shared
└── secrets.json      # Never versioned, restricted permissions
```

Config references secrets by key:
```json5
// config.json5
{
  "servers": {
    "github": {
      "env": { "GITHUB_TOKEN": { "$secret": "github_token" } }
    }
  }
}

// secrets.json
{
  "github_token": "ghp_xxxx"
}
```

CLI flags:
```
--secrets <path>       Path to secrets file [env: ABC_SECRETS]
--no-env-interpolation Disable ${VAR} expansion
```

#### Phase 3: Secret Provider Integration

Pluggable secret providers for direct integration:

```json5
{
  "secrets": {
    "provider": "1password",  // or "keyring", "vault", "aws-secrets-manager"
    "config": { "vault": "Development" }
  },
  "servers": {
    "github": {
      "env": { "GITHUB_TOKEN": { "$ref": "op://Development/GitHub/token" } }
    }
  }
}
```

Supported providers (planned):
- `file` - Local secrets.json (Phase 2)
- `env` - Environment variables only
- `keyring` - OS keyring (macOS Keychain, Linux Secret Service, Windows Credential Manager)
- `1password` - 1Password CLI integration
- `vault` - HashiCorp Vault

### Potential Future Commands

```bash
abc status              # Show running server status
abc config show         # Display effective configuration
abc config set <k> <v>  # Modify config
abc servers list        # List configured servers
abc servers test <id>   # Test server connectivity
abc endpoints list      # List endpoints
abc logs                # Tail server logs
abc doctor              # Diagnose common issues
```

### Potential Future Options

```bash
--tls-cert <path>       # Enable HTTPS
--tls-key <path>        # TLS key file
--auth <method>         # Enable authentication (basic, bearer, oidc)
--cors-origin <origin>  # CORS allowed origins
--rate-limit <rpm>      # Rate limiting
--timeout <ms>          # Request timeout
--max-connections <n>   # Connection limit
```

---

## Summary

| Use Case | Command |
|----------|---------|
| Quick start | `abc` |
| Development | `abc -v -w` |
| Production | `abc -q --log-format=json` |
| Headless/embedded | `abc --no-ui --no-api` |
| Docker | `abc --host 0.0.0.0 -p $PORT` |
| Validate CI | `abc validate --strict` |
| New project | `abc init -i` |
