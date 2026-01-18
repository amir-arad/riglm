/**
 * SSE Server Transport Adapter - Wraps MCP SDK SSEServerTransport
 */

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { SdkTransportPort, HttpResponsePort } from "../../../ports/transport.port";

/**
 * Adapter for SSE server transport to accept incoming MCP client connections.
 * Wraps the MCP SDK SSEServerTransport class.
 */
export class SseServerTransportAdapter implements SdkTransportPort {
  private transport: SSEServerTransport;

  /**
   * Create an SSE server transport
   * @param messagePath The path where POST messages should be sent
   * @param response The HTTP response object to stream events to
   */
  constructor(messagePath: string, response: HttpResponsePort) {
    // Cast to any since SSEServerTransport expects Express Response
    this.transport = new SSEServerTransport(messagePath, response as any);
  }

  get sessionId(): string {
    return this.transport.sessionId;
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
   * Handle POST message from client
   * This method delegates to the underlying SDK transport
   */
  async handlePostMessage(
    req: unknown,
    res: unknown,
    body: unknown
  ): Promise<void> {
    await this.transport.handlePostMessage(req as any, res as any, body);
  }

  /**
   * Get the underlying SDK transport for direct SDK usage
   */
  getSdkTransport(): SSEServerTransport {
    return this.transport;
  }
}
