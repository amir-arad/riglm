import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  SdkTransportPort,
  SseTransportConfig,
} from "../../../ports/transport.port";

export class SseClientTransportAdapter implements SdkTransportPort {
  private transport: SSEClientTransport;
  private _sessionId: string;

  constructor(config: SseTransportConfig) {
    const headers = {
      ...(config.headers || {}),
      Accept: "text/event-stream",
    };

    this.transport = new SSEClientTransport(new URL(config.url), {
      eventSourceInit: {
        fetch: (url, init) =>
          fetch(url, {
            ...init,
            headers,
            signal: config.signal,
          }),
      },
      requestInit: {
        headers,
        signal: config.signal,
      },
    });

    this._sessionId = `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  getSdkTransport(): SSEClientTransport {
    return this.transport;
  }
}
