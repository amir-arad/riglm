


export interface LoggerPort {
  
  info(message: string, ...meta: unknown[]): void;

  
  warn(message: string, ...meta: unknown[]): void;

  
  error(message: string, ...meta: unknown[]): void;

  
  debug(message: string, ...meta: unknown[]): void;

  
  child(meta: Record<string, unknown>): LoggerPort;
}
