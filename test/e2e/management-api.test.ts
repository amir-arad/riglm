/**
 * Management API E2E Tests
 *
 * Tests the REST API endpoints for configuration management:
 * - GET/POST/PUT/DELETE /api/servers
 * - GET/POST/PUT/DELETE /api/endpoints
 * - GET/PUT /api/settings
 * - GET /api/status
 * - POST /api/config/reload
 */

import { RiglmServer, ServerDeps } from "../../src/server";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { McpClientFactoryAdapter } from "../../src/adapters/mcp/mcp-client.adapter";
import { McpServerFactoryAdapter } from "../../src/adapters/mcp/mcp-server.adapter";
import { ClientTransportFactoryAdapter } from "../../src/adapters/mcp/transports";
import { createMockConfigStorage } from "../mocks/mock-config";
import { createSilentLogger } from "../mocks/mock-logger";

describe("Management API E2E", () => {
  let server: RiglmServer | null = null;
  let mockConfig: ReturnType<typeof createMockConfigStorage> | null = null;
  let baseUrl: string;
  const port = 56680;

  const logger = createSilentLogger();
  const clientFactory = new McpClientFactoryAdapter();
  const serverFactory = new McpServerFactoryAdapter();
  const transportFactory = new ClientTransportFactoryAdapter();

  function createServerDeps(): ServerDeps {
    return {
      env: { port, isProduction: false },
      config: mockConfig!,
      clientFactory,
      serverFactory,
      transportFactory,
      logger,
    };
  }

  beforeEach(async () => {
    mockConfig = createMockConfigStorage({
      servers: {
        github: {
          command: "bunx",
          args: ["@anthropic-ai/mcp-server-github"],
          description: "GitHub integration",
        },
        remote: {
          url: "http://localhost:3001/sse",
          description: "Remote server",
        },
      },
      endpoints: {
        main: {
          servers: ["github", "remote"],
          description: "Main endpoint",
        },
      },
      filters: ["*_internal"],
    });

    server = new RiglmServer(createServerDeps());
    await server.start();
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  // Helper for making API requests
  async function api(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; data: unknown }> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  // ==========================================================================
  // Servers API
  // ==========================================================================

  describe("GET /api/servers", () => {
    test("lists all servers", async () => {
      const { status, data } = await api("GET", "/api/servers");

      expect(status).toBe(200);
      expect((data as { servers: unknown[] }).servers).toHaveLength(2);
    });
  });

  describe("GET /api/servers/:id", () => {
    test("returns server by ID", async () => {
      const { status, data } = await api("GET", "/api/servers/github");

      expect(status).toBe(200);
      expect((data as { id: string }).id).toBe("github");
      expect((data as { type: string }).type).toBe("local");
    });

    test("returns 404 for non-existent server", async () => {
      const { status, data } = await api("GET", "/api/servers/nonexistent");

      expect(status).toBe(404);
      expect((data as { code: string }).code).toBe("SERVER_NOT_FOUND");
    });
  });

  describe("POST /api/servers", () => {
    test("creates a local server", async () => {
      const { status, data } = await api("POST", "/api/servers", {
        id: "new_local",
        type: "local",
        command: "bunx",
        args: ["@example/server"],
        description: "New local server",
      });

      expect(status).toBe(201);
      expect((data as { id: string }).id).toBe("new_local");
      expect((data as { type: string }).type).toBe("local");
    });

    test("creates a remote server", async () => {
      const { status, data } = await api("POST", "/api/servers", {
        id: "new_remote",
        type: "remote",
        url: "http://example.com/sse",
        headers: { Authorization: "Bearer token" },
      });

      expect(status).toBe(201);
      expect((data as { id: string }).id).toBe("new_remote");
      expect((data as { type: string }).type).toBe("remote");
      expect((data as { url: string }).url).toBe("http://example.com/sse");
    });

    test("returns 409 for duplicate ID", async () => {
      const { status, data } = await api("POST", "/api/servers", {
        id: "github",
        type: "local",
        command: "echo",
        args: [],
      });

      expect(status).toBe(409);
      expect((data as { code: string }).code).toBe("DUPLICATE_ID");
    });

    test("returns 422 for invalid ID pattern", async () => {
      const { status, data } = await api("POST", "/api/servers", {
        id: "123-invalid",
        type: "local",
        command: "echo",
        args: [],
      });

      expect(status).toBe(422);
      expect((data as { code: string }).code).toBe("VALIDATION_ERROR");
    });
  });

  describe("PUT /api/servers/:id", () => {
    test("updates a server", async () => {
      const { status, data } = await api("PUT", "/api/servers/github", {
        description: "Updated description",
      });

      expect(status).toBe(200);
      expect((data as { description: string }).description).toBe("Updated description");
    });

    test("returns 404 for non-existent server", async () => {
      const { status, data } = await api("PUT", "/api/servers/nonexistent", {
        description: "test",
      });

      expect(status).toBe(404);
      expect((data as { code: string }).code).toBe("SERVER_NOT_FOUND");
    });
  });

  describe("DELETE /api/servers/:id", () => {
    test("deletes a server", async () => {
      // First create a server not used by endpoints
      await api("POST", "/api/servers", {
        id: "unused",
        type: "local",
        command: "echo",
        args: [],
      });

      const { status, data } = await api("DELETE", "/api/servers/unused");

      expect(status).toBe(200);
      expect((data as { deleted: boolean }).deleted).toBe(true);
    });

    test("returns warning when server is used by endpoints", async () => {
      const { status, data } = await api("DELETE", "/api/servers/github");

      expect(status).toBe(200);
      expect((data as { deleted: boolean }).deleted).toBe(true);
      expect((data as { warning: string }).warning).toContain("endpoint(s)");
      expect((data as { usedBy: string[] }).usedBy).toContain("main");
    });

    test("returns 404 for non-existent server", async () => {
      const { status, data } = await api("DELETE", "/api/servers/nonexistent");

      expect(status).toBe(404);
      expect((data as { code: string }).code).toBe("SERVER_NOT_FOUND");
    });
  });

  // ==========================================================================
  // Endpoints API
  // ==========================================================================

  describe("GET /api/endpoints", () => {
    test("lists all endpoints", async () => {
      const { status, data } = await api("GET", "/api/endpoints");

      expect(status).toBe(200);
      expect((data as { endpoints: unknown[] }).endpoints).toHaveLength(1);
    });
  });

  describe("GET /api/endpoints/:id", () => {
    test("returns endpoint by ID", async () => {
      const { status, data } = await api("GET", "/api/endpoints/main");

      expect(status).toBe(200);
      expect((data as { id: string }).id).toBe("main");
      expect((data as { servers: string[] }).servers).toEqual(["github", "remote"]);
    });

    test("returns 404 for non-existent endpoint", async () => {
      const { status, data } = await api("GET", "/api/endpoints/nonexistent");

      expect(status).toBe(404);
      expect((data as { code: string }).code).toBe("ENDPOINT_NOT_FOUND");
    });
  });

  describe("POST /api/endpoints", () => {
    test("creates an endpoint", async () => {
      const { status, data } = await api("POST", "/api/endpoints", {
        id: "new_endpoint",
        servers: ["github"],
        description: "New endpoint",
      });

      expect(status).toBe(201);
      expect((data as { id: string }).id).toBe("new_endpoint");
      expect((data as { servers: string[] }).servers).toEqual(["github"]);
    });

    test("returns 409 for duplicate ID", async () => {
      const { status, data } = await api("POST", "/api/endpoints", {
        id: "main",
        servers: ["github"],
      });

      expect(status).toBe(409);
      expect((data as { code: string }).code).toBe("DUPLICATE_ID");
    });

    test("returns 422 for non-existent servers", async () => {
      const { status, data } = await api("POST", "/api/endpoints", {
        id: "test",
        servers: ["nonexistent"],
      });

      expect(status).toBe(422);
      expect((data as { code: string }).code).toBe("SERVERS_NOT_FOUND");
    });
  });

  describe("PUT /api/endpoints/:id", () => {
    test("updates an endpoint", async () => {
      const { status, data } = await api("PUT", "/api/endpoints/main", {
        description: "Updated description",
      });

      expect(status).toBe(200);
      expect((data as { description: string }).description).toBe("Updated description");
    });

    test("returns 404 for non-existent endpoint", async () => {
      const { status, data } = await api("PUT", "/api/endpoints/nonexistent", {
        description: "test",
      });

      expect(status).toBe(404);
      expect((data as { code: string }).code).toBe("ENDPOINT_NOT_FOUND");
    });
  });

  describe("DELETE /api/endpoints/:id", () => {
    test("deletes an endpoint", async () => {
      const { status, data } = await api("DELETE", "/api/endpoints/main");

      expect(status).toBe(200);
      expect((data as { deleted: boolean }).deleted).toBe(true);
    });

    test("returns 404 for non-existent endpoint", async () => {
      const { status, data } = await api("DELETE", "/api/endpoints/nonexistent");

      expect(status).toBe(404);
      expect((data as { code: string }).code).toBe("ENDPOINT_NOT_FOUND");
    });
  });

  // ==========================================================================
  // Settings API
  // ==========================================================================

  describe("GET /api/settings", () => {
    test("returns global settings", async () => {
      const { status, data } = await api("GET", "/api/settings");

      expect(status).toBe(200);
      expect((data as { filters: string[] }).filters).toEqual(["*_internal"]);
    });
  });

  describe("PUT /api/settings", () => {
    test("updates global settings", async () => {
      const { status, data } = await api("PUT", "/api/settings", {
        filters: ["*_debug", "*_test"],
      });

      expect(status).toBe(200);
      expect((data as { filters: string[] }).filters).toEqual(["*_debug", "*_test"]);
    });
  });

  // ==========================================================================
  // Status API
  // ==========================================================================

  describe("GET /api/status", () => {
    test("returns server status", async () => {
      const { status, data } = await api("GET", "/api/status");

      expect(status).toBe(200);
      expect((data as { status: string }).status).toBe("ok");
      expect((data as { uptime: number }).uptime).toBeGreaterThanOrEqual(0);
      expect((data as { memory: { rss: number } }).memory.rss).toBeGreaterThan(0);
      expect((data as { endpoints: Record<string, unknown> }).endpoints).toHaveProperty("main");
    });
  });

  // ==========================================================================
  // Config Reload API
  // ==========================================================================

  describe("POST /api/config/reload", () => {
    test("reloads configuration", async () => {
      const { status, data } = await api("POST", "/api/config/reload");

      expect(status).toBe(200);
      expect((data as { status: string }).status).toBe("ok");
      expect((data as { message: string }).message).toBe("Configuration reloaded");
    });
  });
});
