/**
 * Help Text
 *
 * Formatted help output for the CLI.
 * @see docs/cli-design.md for specification
 */

// ============================================================================
// Help Text
// ============================================================================

const HELP_TEXT = `
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
  -w, --watch              Hot-reload on config changes (stub)
      --dry-run            Validate config and exit

Options (validate):
  -c, --config <path>      Config file to validate
      --strict             Fail on warnings
      --format <fmt>       Output format (text|json) [default: text]

Options (init):
  -p, --path <dir>         Output directory [default: ~/.config/abc/]
      --local              Create in ./.abc/ instead of global
  -t, --template <name>    Template: minimal, standard, full [default: minimal]
  -f, --force              Overwrite existing files

Options (version):
      --json               Output as JSON

Examples:
  abc                              # Start with defaults
  abc serve -p 8080 -v             # Custom port, debug mode
  abc serve --no-ui --no-api       # MCP endpoints only
  abc validate -c prod.json5       # Validate config
  abc init --local -t minimal      # Create local config

Documentation:
  https://github.com/your-org/abc
`.trim();

// ============================================================================
// Print Functions
// ============================================================================

/**
 * Print main help text
 */
export function printHelp(): void {
  console.log(HELP_TEXT);
}
