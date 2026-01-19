

import { IncomingMessage, ServerResponse } from "http";

import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { SdkTransportPort } from "../../../ports/transport.port";


export class SseServerTransportAdapter implements SdkTransportPort {
  private transport: SSEServerTransport;

  
  constructor(messagePath: string, response: ServerResponse) {
    
    this.transport = new SSEServerTransport(messagePath, response);
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

  
  async handlePostMessage(
    req: IncomingMessage & {
      auth?: AuthInfo;
    }, res: ServerResponse, body: unknown
  ): Promise<void> {
    await this.transport.handlePostMessage(req, res, body);
  }

  
  getSdkTransport(): SSEServerTransport {
    return this.transport;
  }
}
