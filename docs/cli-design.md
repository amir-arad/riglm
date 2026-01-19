# CLI Design for Riglm

## Design Principles

1. **Zero-config defaults** - Works out of the box without any arguments
2. **Convention over configuration** - Sensible defaults that match common patterns
3. **Priority chain**: CLI flags > Environment variables > Config file > Defaults
4. **Familiar conventions** - POSIX-style flags, standard naming patterns

---

## Commands

```
riglm [command] [options]

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
| `--port` | `-p` | `RIGLM_PORT`, `PORT` | `3000` | HTTP server port |
| `--host` | `-H` | `RIGLM_HOST` | `0.0.0.0` | Bind address |
| `--config` | `-c` | `RIGLM_CONFIG`, `CONFIG_PATH` | Auto-detect* | Configuration file path |
| `--log-level` | `-l` | `RIGLM_LOG_LEVEL`, `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error`, `silent` |
| `--log-format` | | `RIGLM_LOG_FORMAT` | `pretty` | Output format: `pretty`, `json` |
| `--log-file` | | `RIGLM_LOG_FILE` | (none) | Also write logs to file |
| `--no-ui` | | `RIGLM_DISABLE_UI=1` | (enabled) | Disable web management UI |
| `--no-api` | | `RIGLM_DISABLE_API=1` | (enabled) | Disable REST management API |
| `--quiet` | `-q` | | | Suppress startup banner and non-error output |
| `--verbose` | `-v` | | | Shorthand for `--log-level=debug` |

*Config auto-detection (fixed locations, checked in order):
1. `./.riglm/config.json5` (local override)
2. `~/.config/riglm/config.json5` (XDG default on Linux/macOS)
3. `~/Library/Application Support/riglm/config.json5` (macOS alternative)
4. `%APPDATA%\riglm\config.json5` (Windows)

When config is found, `extensions.json` is expected in the same directory:

```
~/.config/riglm/           # or ./.riglm/ for local override
├── config.json5         # Server/endpoint configuration
├── extensions.json      # Extension registry
└── secrets.json         # (future) Secrets file
```

### Precedence Examples

```bash
# CLI takes precedence over env
RIGLM_PORT=4000 riglm serve --port 5000
# → Uses port 5000

# Env takes precedence over defaults
RIGLM_PORT=4000 riglm serve
# → Uses port 4000

# Default when nothing specified
riglm serve
# → Uses port 3000
```

### Usage Examples

```bash
# Minimal - uses all defaults
riglm

# Explicit config file
riglm serve -c /path/to/config.json5

# Development mode with debug logging and hot-reload
riglm serve -v -w

# Production mode - minimal logging, JSON format for log aggregation
riglm serve -q --log-format=json --log-level=warn

# Headless mode - MCP endpoints only, no UI or API
riglm serve --no-ui --no-api

# Bind to localhost only (for security)
riglm serve -H 127.0.0.1

# Custom port with log file
riglm serve -p 8080 --log-file=/var/log/riglm/server.log
```

---

## `validate` Command

Validate configuration without starting the server.

```bash
riglm validate [options]
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
riglm validate

# Validate specific file
riglm validate -c production.json5

# CI/CD pipeline validation
riglm validate --strict --format=json
```

---

## `init` Command

Create a new configuration file interactively or from a template.

```bash
riglm init [options]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--path` | `-p` | Output directory (default: `~/.config/riglm/`) |
| `--local` | | Create in `./.riglm/` instead of global |
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
# Interactive setup (creates ~/.config/riglm/)
riglm init -i

# Quick start with standard template
riglm init -t standard

# Create local project config
riglm init --local -t minimal

# Generate documented config for reference
riglm init -t full -p ./reference/
```

---

## `version` Command

```bash
riglm version [options]
```

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |
| `--check` | Check for updates (if registry available) |

### Output

```
riglm v1.0.0
Runtime: Bun 1.1.x
MCP SDK: @modelcontextprotocol/sdk 1.12.x
```

---

## Environment Variables

All environment variables use `RIGLM_` prefix. Legacy variables (without prefix) are supported for backward compatibility but deprecated.

| Variable | Legacy | Description |
|----------|--------|-------------|
| `RIGLM_PORT` | `PORT` | Server port |
| `RIGLM_HOST` | - | Bind address |
| `RIGLM_CONFIG` | `CONFIG_PATH` | Config file path |
| `RIGLM_LOG_LEVEL` | `LOG_LEVEL` | Log level |
| `RIGLM_LOG_FORMAT` | - | Log format (pretty/json) |
| `RIGLM_LOG_FILE` | - | Log file path |
| `RIGLM_DISABLE_UI` | - | Disable web UI (any truthy value) |
| `RIGLM_DISABLE_API` | - | Disable management API |
| `RIGLM_WATCH` | - | Enable config hot-reload |

### Truthy Values

For boolean env vars: `1`, `true`, `yes`, `on` (case-insensitive)

---

## Startup Banner

Default output on startup (unless `--quiet`):

```
╭─────────────────────────────────────────────────╮
│  Riglm v1.0.0                                   │
│  AI Extension Manager                           │
╰─────────────────────────────────────────────────╯

  Config:     /home/user/riglm/config.json5
  Endpoints:  main, dev
  Servers:    3 configured (2 local, 1 remote)

  MCP:        http://localhost:3000/:endpoint/sse
  Web UI:     http://localhost:3000/ui
  API:        http://localhost:3000/api

  Press Ctrl+C to stop
```

With `--quiet`:
```
Riglm listening on http://localhost:3000
```

---

## Help Output

```
riglm - AI Extension Manager

Usage:
  riglm [command] [options]

Commands:
  serve      Start the server (default)
  validate   Validate configuration file
  init       Create new configuration file
  version    Show version information
  help       Show this help message

Options (serve):
  -p, --port <port>        Server port [env: RIGLM_PORT] [default: 3000]
  -H, --host <host>        Bind address [env: RIGLM_HOST] [default: 0.0.0.0]
  -c, --config <path>      Config file path [env: RIGLM_CONFIG]
  -l, --log-level <level>  Log level (debug|info|warn|error|silent)
      --log-format <fmt>   Log format (pretty|json) [default: pretty]
      --log-file <path>    Write logs to file
      --no-ui              Disable web management UI
      --no-api             Disable REST management API
  -q, --quiet              Suppress startup banner
  -v, --verbose            Enable debug logging

Examples:
  riglm                            # Start with defaults
  riglm serve -p 8080 -v             # Custom port, debug mode
  riglm serve --no-ui --no-api       # MCP endpoints only
  riglm validate -c prod.json5       # Validate config
  riglm init -i                      # Interactive setup

Documentation:
  https://github.com/your-org/riglm

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
}

function resolveConfig(cli: CliArgs, env: NodeJS.ProcessEnv): ResolvedConfig {
  return {
    port: cli.port ?? env.RIGLM_PORT ?? env.PORT ?? 3000,
    host: cli.host ?? env.RIGLM_HOST ?? '0.0.0.0',
    configPath: cli.config ?? env.RIGLM_CONFIG ?? env.CONFIG_PATH ?? findConfig(),
    logLevel: cli.verbose ? 'debug' : (cli.logLevel ?? env.RIGLM_LOG_LEVEL ?? 'info'),
    logFormat: cli.logFormat ?? env.RIGLM_LOG_FORMAT ?? 'pretty',
    logFile: cli.logFile ?? env.RIGLM_LOG_FILE,
    enableUi: !cli.noUi && env.RIGLM_DISABLE_UI !== '1',
    enableApi: !cli.noApi && env.RIGLM_DISABLE_API !== '1',
  };
}
```

### Feature Flags for UI/API

The server should conditionally mount routes:

```typescript
// In server.ts
if (config.enableUi) {
  this.app.use(express.static('public'));
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
op run -- riglm serve           # 1Password
doppler run -- riglm serve      # Doppler
sops exec-env secrets.yaml 'riglm serve'  # SOPS
```

#### Phase 2: Separate Secrets File

Optional `secrets.json` file (mode 0600) alongside config:

```
~/.config/riglm/
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
--secrets <path>       Path to secrets file [env: RIGLM_SECRETS]
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
riglm status              # Show running server status
riglm config show         # Display effective configuration
riglm config set <k> <v>  # Modify config
riglm servers list        # List configured servers
riglm servers test <id>   # Test server connectivity
riglm endpoints list      # List endpoints
riglm logs                # Tail server logs
riglm doctor              # Diagnose common issues
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
| Quick start | `riglm` |
| Development | `riglm -v -w` |
| Production | `riglm -q --log-format=json` |
| Headless/embedded | `riglm --no-ui --no-api` |
| Docker | `riglm --host 0.0.0.0 -p $PORT` |
| Validate CI | `riglm validate --strict` |
| New project | `riglm init -i` |
