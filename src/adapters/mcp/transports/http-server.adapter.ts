/**
 * HTTP Server Transport Adapter - Wraps MCP SDK StreamableHTTPServerTransport
 */

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  HttpServerTransportPort,
  HttpServerTransportOptions,
  HttpRequestPort,
  HttpResponsePort,
} from "../../../ports/transport.port";

/**
 * Adapter for Streamable HTTP server transport to accept incoming MCP client connections.
 * Wraps the MCP SDK StreamableHTTPServerTransport class.
 *
 * Note: The session ID is pre-generated in the constructor so it's available immediately
 * for session management, before handleRequest is called.
 */
export class HttpServerTransportAdapter implements HttpServerTransportPort {
  private transport: StreamableHTTPServerTransport;
  private _sessionId: string;

  constructor(options: HttpServerTransportOptions) {
    // Pre-generate session ID so it's available immediately
    // The SDK will use this same ID when onsessioninitialized is called
    this._sessionId =
      options.sessionIdGenerator?.() ??
      `http-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => this._sessionId,
      // Enable JSON responses instead of SSE streaming for simple request/response patterns
      enableJsonResponse: true,
      onsessioninitialized: (sessionId: string) => {
        options.onsessioninitialized?.(sessionId);
      },
    });
  }

  get sessionId(): string {
    return this._sessionId;
  }

  async handleRequest(req: HttpRequestPort, res: HttpResponsePort, body?: unknown): Promise<void> {
    // Cast to any since SDK expects Express types but our abstraction is compatible
    // Pass body as third parameter since Express middleware has already consumed the body stream
    await this.transport.handleRequest(req as never, res as never, body);
  }

  async start(): Promise<void> {
    // Streamable HTTP doesn't require explicit start - handled per request
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
  getSdkTransport(): StreamableHTTPServerTransport {
    return this.transport;
  }
}
