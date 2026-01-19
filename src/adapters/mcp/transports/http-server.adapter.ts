import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  HttpServerTransportPort,
  HttpServerTransportOptions,
  HttpRequestPort,
  HttpResponsePort,
} from "../../../ports/transport.port";

export class HttpServerTransportAdapter implements HttpServerTransportPort {
  private transport: StreamableHTTPServerTransport;
  private _sessionId: string;

  constructor(options: HttpServerTransportOptions) {
    this._sessionId =
      options.sessionIdGenerator?.() ??
      `http-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => this._sessionId,

      enableJsonResponse: true,
      onsessioninitialized: (sessionId: string) => {
        options.onsessioninitialized?.(sessionId);
      },
    });
  }

  get sessionId(): string {
    return this._sessionId;
  }

  async handleRequest(
    req: HttpRequestPort,
    res: HttpResponsePort,
    body?: unknown,
  ): Promise<void> {
    await this.transport.handleRequest(req as never, res as never, body);
  }

  async start(): Promise<void> {}

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

  getSdkTransport(): StreamableHTTPServerTransport {
    return this.transport;
  }
}
