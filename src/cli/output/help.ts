const HELP_TEXT = `
riglm - AI Extension Manager

Usage:
  riglm [command] [options]

Commands:
  serve      Start the server (default)
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

Options (version):
      --json               Output as JSON

Examples:
  riglm                              # Start with defaults
  riglm serve -p 8080 -v             # Custom port, debug mode
  riglm serve --no-ui --no-api       # MCP endpoints only

Documentation:
  https://github.com/your-org/riglm
`.trim();

export function printHelp(): void {
  console.log(HELP_TEXT);
}
