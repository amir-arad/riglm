


export interface TransportPort {
  
  readonly sessionId: string;

  
  start(): Promise<void>;

  
  close(): Promise<void>;

  
  onerror?: (error: Error) => void;

  
  onclose?: () => void;
}


export interface SdkTransportPort extends TransportPort {
  
  getSdkTransport(): unknown;
}






export interface StdioTransportConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  signal?: AbortSignal;
}


export interface SseTransportConfig {
  url: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}


export interface HttpTransportConfig {
  url: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}






export interface HttpRequestPort {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  url?: string;
}


export interface HttpResponsePort {
  writeHead(statusCode: number, headers?: Record<string, string>): void;
  write(chunk: string | Buffer): boolean;
  end(data?: string | Buffer): void;
  setHeader(name: string, value: string | number | readonly string[]): void;
  headersSent: boolean;
}


export interface HttpServerTransportOptions {
  sessionIdGenerator?: () => string;
  onsessioninitialized?: (sessionId: string) => void;
}


export interface HttpServerTransportPort extends SdkTransportPort {
  
  handleRequest(req: HttpRequestPort, res: HttpResponsePort, body?: unknown): Promise<void>;
}






export interface ClientTransportFactory {
  
  createStdioTransport(config: StdioTransportConfig): TransportPort;

  
  createSseTransport(config: SseTransportConfig): TransportPort;

  
  createHttpTransport(config: HttpTransportConfig): TransportPort;
}


export interface ServerTransportFactory {
  
  createHttpServerTransport(options: HttpServerTransportOptions): HttpServerTransportPort;
}


