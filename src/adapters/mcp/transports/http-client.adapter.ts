

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SdkTransportPort, HttpTransportConfig } from "../../../ports/transport.port";


export class HttpClientTransportAdapter implements SdkTransportPort {
  private transport: StreamableHTTPClientTransport;
  private _sessionId: string;

  constructor(config: HttpTransportConfig) {
    const headers = config.headers || {};

    this.transport = new StreamableHTTPClientTransport(new URL(config.url), {
      fetch: (url, init) =>
        fetch(url, {
          ...init,
          headers: { ...init?.headers, ...headers },
          signal: config.signal,
        }),
    });

    
    this._sessionId = `http-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  
  getSdkTransport(): StreamableHTTPClientTransport {
    return this.transport;
  }
}
