import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { randomUUID } from "crypto";

/**
 * Interface representing session data for a client connection
 */
export interface SessionData {
  sessionId: string;
  transport: SSEServerTransport;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Options for configuring the SessionManager
 */
export interface SessionManagerOptions {
  /**
   * Time in milliseconds after which an inactive session will be removed
   * Default: 30 minutes
   */
  inactivityThreshold?: number;
  
  /**
   * Interval in milliseconds for checking and cleaning up inactive sessions
   * Default: 5 minutes
   */
  cleanupInterval?: number;
}

/**
 * Manages client sessions for the HTTP/SSE transport
 * Handles session creation, tracking, and cleanup
 */
export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private server: Server;
  private inactivityThreshold: number;
  private cleanupInterval: number;
  private intervalId: NodeJS.Timeout | null = null;
  
  /**
   * Creates a new SessionManager
   * 
   * @param server The MCP server instance
   * @param options Configuration options
   */
  constructor(server: Server, options?: SessionManagerOptions) {
    this.server = server;
    this.inactivityThreshold = options?.inactivityThreshold || 30 * 60 * 1000; // Default: 30 minutes
    this.cleanupInterval = options?.cleanupInterval || 5 * 60 * 1000; // Default: 5 minutes
    
    // Set up session cleanup interval
    this.intervalId = setInterval(() => this.cleanupInactiveSessions(), this.cleanupInterval);
    
    console.log(`SessionManager initialized with inactivity threshold of ${this.inactivityThreshold/1000/60} minutes`);
  }
  
  /**
   * Creates a new session with a unique ID
   * 
   * @param endpoint The endpoint for client messages
   * @param res The HTTP response object for the SSE connection
   * @returns The session ID
   */
  async createSession(endpoint: string, res: any): Promise<string> {
    const sessionId = randomUUID();
    const transport = new SSEServerTransport(endpoint, res);
    
    // Connect the transport to the server
    await this.server.connect(transport);
    
    // Store session data
    this.sessions.set(sessionId, {
      sessionId,
      transport,
      createdAt: new Date(),
      lastActivity: new Date()
    });
    
    console.log(`New session created: ${sessionId}`);
    return sessionId;
  }
  
  /**
   * Gets a session by ID and updates its last activity timestamp
   * 
   * @param sessionId The session ID
   * @returns The session data or undefined if not found
   */
  getSession(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Update last activity timestamp
      session.lastActivity = new Date();
    }
    return session;
  }
  
  /**
   * Checks if a session exists
   * 
   * @param sessionId The session ID
   * @returns True if the session exists, false otherwise
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
  
  /**
   * Removes a session
   * 
   * @param sessionId The session ID
   */
  removeSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      console.log(`Removing session: ${sessionId}`);
      this.sessions.delete(sessionId);
    }
  }
  
  /**
   * Gets the number of active sessions
   * 
   * @returns The number of active sessions
   */
  getActiveSessions(): number {
    return this.sessions.size;
  }
  
  /**
   * Cleans up inactive sessions
   * Called periodically by the cleanup interval
   */
  private cleanupInactiveSessions(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      if (inactiveTime > this.inactivityThreshold) {
        console.log(`Session ${sessionId} inactive for ${inactiveTime/1000/60} minutes, removing`);
        this.removeSession(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} inactive sessions. Active sessions: ${this.sessions.size}`);
    }
  }
  
  /**
   * Cleans up all sessions and stops the cleanup interval
   * Called during server shutdown
   */
  async cleanup(): Promise<void> {
    // Stop the cleanup interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Clear all sessions
    const sessionCount = this.sessions.size;
    this.sessions.clear();
    console.log(`Cleaned up all ${sessionCount} sessions during shutdown`);
  }
}