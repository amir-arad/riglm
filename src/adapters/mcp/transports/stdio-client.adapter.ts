/**
 * Stdio Client Transport Adapter - Wraps MCP SDK StdioClientTransport
 */

import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SdkTransportPort, StdioTransportConfig } from "../../../ports/transport.port";

/**
 * Adapter for stdio transport to local MCP servers.
 * Wraps the MCP SDK StdioClientTransport class.
 */
export class StdioClientTransportAdapter implements SdkTransportPort {
  private transport: StdioClientTransport;
  private _sessionId: string;

  constructor(config: StdioTransportConfig) {
    this.transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: {
        // Inherit process environment
        ...Object.fromEntries(
          Object.entries(process.env)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, v as string])
        ),
        // Override with config-specific env vars
        ...config.env,
      },
    });

    // Generate a session ID since StdioClientTransport doesn't have one until started
    this._sessionId = `stdio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  get sessionId(): string {
    return this._sessionId;
  }

  async start(): Promise<void> {
    await this.transport.start?.();
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

  /**
   * Get the underlying SDK transport for direct SDK usage
   */
  getSdkTransport(): StdioClientTransport {
    return this.transport;
  }
}
