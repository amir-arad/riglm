/**
 * ConfigService Unit Tests
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { ConfigService, createConfigService } from "../src/application/config.service";
import { createMockConfigStorage } from "./mocks/mock-config";
import { createSilentLogger } from "./mocks/mock-logger";
import { Config } from "../src/domain/types";

describe("ConfigService", () => {
  let configService: ConfigService;
  let mockConfig: ReturnType<typeof createMockConfigStorage>;
  const logger = createSilentLogger();

  const initialConfig: Config = {
    servers: {
      github: {
        command: "bunx",
        args: ["@anthropic-ai/mcp-server-github"],
        description: "GitHub integration",
      },
      filesystem: {
        url: "http://localhost:3001/sse",
        description: "File system access",
      },
    },
    endpoints: {
      main: {
        servers: ["github", "filesystem"],
        description: "Main endpoint",
      },
    },
    filters: ["*_internal"],
  };

  beforeEach(() => {
    mockConfig = createMockConfigStorage({ ...initialConfig });
    configService = createConfigService({
      config: mockConfig,
      logger,
    });
  });

  // ==========================================================================
  // Servers - List
  // ==========================================================================

  describe("listServers", () => {
    test("returns all servers with their IDs", () => {
      const servers = configService.listServers();
      expect(servers).toHaveLength(2);
      expect(servers.find((s) => s.id === "github")).toBeDefined();
      expect(servers.find((s) => s.id === "filesystem")).toBeDefined();
    });

    test("returns correct type for local server", () => {
      const servers = configService.listServers();
      const github = servers.find((s) => s.id === "github");
      expect(github?.type).toBe("local");
      expect(github?.command).toBe("bunx");
      expect(github?.args).toEqual(["@anthropic-ai/mcp-server-github"]);
    });

    test("returns correct type for remote server", () => {
      const servers = configService.listServers();
      const filesystem = servers.find((s) => s.id === "filesystem");
      expect(filesystem?.type).toBe("remote");
      expect(filesystem?.url).toBe("http://localhost:3001/sse");
    });

    test("returns empty array when no servers", () => {
      mockConfig.setConfig({ servers: {}, endpoints: {} });
      const servers = configService.listServers();
      expect(servers).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Servers - Get
  // ==========================================================================

  describe("getServer", () => {
    test("returns server by ID", () => {
      const server = configService.getServer("github");
      expect(server.id).toBe("github");
      expect(server.type).toBe("local");
      expect(server.command).toBe("bunx");
    });

    test("throws 404 for non-existent server", () => {
      expect(() => configService.getServer("nonexistent")).toThrow(
        "Server 'nonexistent' not found"
      );
    });
  });

  // ==========================================================================
  // Servers - Create
  // ==========================================================================

  describe("createServer", () => {
    test("creates a local server", () => {
      const server = configService.createServer({
        id: "new_server",
        type: "local",
        command: "bunx",
        args: ["@example/mcp-server"],
        description: "New server",
      });

      expect(server.id).toBe("new_server");
      expect(server.type).toBe("local");
      expect(server.command).toBe("bunx");
      expect(configService.listServers()).toHaveLength(3);
    });

    test("creates a remote server", () => {
      const server = configService.createServer({
        id: "remote_server",
        type: "remote",
        url: "http://example.com/sse",
        headers: { Authorization: "Bearer token" },
      });

      expect(server.id).toBe("remote_server");
      expect(server.type).toBe("remote");
      expect(server.url).toBe("http://example.com/sse");
      expect(server.headers).toEqual({ Authorization: "Bearer token" });
    });

    test("throws 409 for duplicate ID", () => {
      expect(() =>
        configService.createServer({
          id: "github",
          type: "local",
          command: "echo",
          args: [],
        })
      ).toThrow("Server 'github' already exists");
    });

    test("throws 422 for invalid ID pattern", () => {
      expect(() =>
        configService.createServer({
          id: "123invalid",
          type: "local",
          command: "echo",
          args: [],
        })
      ).toThrow();
    });

    test("throws 422 for missing command in local server", () => {
      expect(() =>
        configService.createServer({
          id: "test",
          type: "local",
          command: "",
          args: [],
        })
      ).toThrow();
    });

    test("throws 422 for missing url in remote server", () => {
      expect(() =>
        configService.createServer({
          id: "test",
          type: "remote",
          url: "",
        })
      ).toThrow();
    });
  });

  // ==========================================================================
  // Servers - Update
  // ==========================================================================

  describe("updateServer", () => {
    test("updates a local server", () => {
      const server = configService.updateServer("github", {
        command: "node",
        description: "Updated description",
      });

      expect(server.command).toBe("node");
      expect(server.description).toBe("Updated description");
      expect(server.args).toEqual(["@anthropic-ai/mcp-server-github"]); // preserved
    });

    test("updates a remote server", () => {
      const server = configService.updateServer("filesystem", {
        url: "http://newhost:3002/sse",
      });

      expect(server.url).toBe("http://newhost:3002/sse");
    });

    test("throws 404 for non-existent server", () => {
      expect(() =>
        configService.updateServer("nonexistent", { command: "echo" })
      ).toThrow("Server 'nonexistent' not found");
    });
  });

  // ==========================================================================
  // Servers - Delete
  // ==========================================================================

  describe("deleteServer", () => {
    test("deletes a server", () => {
      // First create a server not used by any endpoint
      configService.createServer({
        id: "unused",
        type: "local",
        command: "echo",
        args: [],
      });

      const result = configService.deleteServer("unused");
      expect(result.deleted).toBe(true);
      expect(result.warning).toBeUndefined();
      expect(() => configService.getServer("unused")).toThrow();
    });

    test("returns warning when server is used by endpoints", () => {
      const result = configService.deleteServer("github");
      expect(result.deleted).toBe(true);
      expect(result.warning).toContain("1 endpoint(s)");
      expect(result.usedBy).toContain("main");
    });

    test("removes server from endpoints when deleted", () => {
      configService.deleteServer("github");
      const endpoint = configService.getEndpoint("main");
      expect(endpoint.servers).not.toContain("github");
      expect(endpoint.servers).toContain("filesystem");
    });

    test("deletes endpoint when last server is removed", () => {
      // Create endpoint with only one server
      configService.createEndpoint({
        id: "single",
        servers: ["github"],
      });

      configService.deleteServer("github");

      // The "single" endpoint should be deleted (had only github)
      expect(() => configService.getEndpoint("single")).toThrow();
    });

    test("throws 404 for non-existent server", () => {
      expect(() => configService.deleteServer("nonexistent")).toThrow(
        "Server 'nonexistent' not found"
      );
    });
  });

  // ==========================================================================
  // Endpoints - List
  // ==========================================================================

  describe("listEndpoints", () => {
    test("returns all endpoints with their IDs", () => {
      const endpoints = configService.listEndpoints();
      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].id).toBe("main");
      expect(endpoints[0].servers).toEqual(["github", "filesystem"]);
    });

    test("returns empty array when no endpoints", () => {
      mockConfig.setConfig({ servers: initialConfig.servers, endpoints: {} });
      const endpoints = configService.listEndpoints();
      expect(endpoints).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Endpoints - Get
  // ==========================================================================

  describe("getEndpoint", () => {
    test("returns endpoint by ID", () => {
      const endpoint = configService.getEndpoint("main");
      expect(endpoint.id).toBe("main");
      expect(endpoint.servers).toEqual(["github", "filesystem"]);
      expect(endpoint.description).toBe("Main endpoint");
    });

    test("throws 404 for non-existent endpoint", () => {
      expect(() => configService.getEndpoint("nonexistent")).toThrow(
        "Endpoint 'nonexistent' not found"
      );
    });
  });

  // ==========================================================================
  // Endpoints - Create
  // ==========================================================================

  describe("createEndpoint", () => {
    test("creates an endpoint", () => {
      const endpoint = configService.createEndpoint({
        id: "new_endpoint",
        servers: ["github"],
        description: "New endpoint",
      });

      expect(endpoint.id).toBe("new_endpoint");
      expect(endpoint.servers).toEqual(["github"]);
      expect(endpoint.description).toBe("New endpoint");
      expect(configService.listEndpoints()).toHaveLength(2);
    });

    test("throws 409 for duplicate ID", () => {
      expect(() =>
        configService.createEndpoint({
          id: "main",
          servers: ["github"],
        })
      ).toThrow("Endpoint 'main' already exists");
    });

    test("throws 422 for non-existent servers", () => {
      expect(() =>
        configService.createEndpoint({
          id: "test",
          servers: ["nonexistent"],
        })
      ).toThrow("Server(s) not found: nonexistent");
    });

    test("throws 422 for empty servers array", () => {
      expect(() =>
        configService.createEndpoint({
          id: "test",
          servers: [],
        })
      ).toThrow();
    });

    test("creates endpoint with filters", () => {
      const endpoint = configService.createEndpoint({
        id: "filtered",
        servers: ["github"],
        filters: ["*_debug"],
      });

      expect(endpoint.filters).toEqual(["*_debug"]);
    });
  });

  // ==========================================================================
  // Endpoints - Update
  // ==========================================================================

  describe("updateEndpoint", () => {
    test("updates an endpoint", () => {
      const endpoint = configService.updateEndpoint("main", {
        description: "Updated description",
      });

      expect(endpoint.description).toBe("Updated description");
      expect(endpoint.servers).toEqual(["github", "filesystem"]); // preserved
    });

    test("updates servers list", () => {
      const endpoint = configService.updateEndpoint("main", {
        servers: ["github"],
      });

      expect(endpoint.servers).toEqual(["github"]);
    });

    test("throws 404 for non-existent endpoint", () => {
      expect(() =>
        configService.updateEndpoint("nonexistent", { description: "test" })
      ).toThrow("Endpoint 'nonexistent' not found");
    });

    test("throws 422 for non-existent servers in update", () => {
      expect(() =>
        configService.updateEndpoint("main", { servers: ["nonexistent"] })
      ).toThrow("Server(s) not found: nonexistent");
    });
  });

  // ==========================================================================
  // Endpoints - Delete
  // ==========================================================================

  describe("deleteEndpoint", () => {
    test("deletes an endpoint", () => {
      const result = configService.deleteEndpoint("main");
      expect(result.deleted).toBe(true);
      expect(() => configService.getEndpoint("main")).toThrow();
    });

    test("throws 404 for non-existent endpoint", () => {
      expect(() => configService.deleteEndpoint("nonexistent")).toThrow(
        "Endpoint 'nonexistent' not found"
      );
    });
  });

  // ==========================================================================
  // Settings
  // ==========================================================================

  describe("getSettings", () => {
    test("returns global filters", () => {
      const settings = configService.getSettings();
      expect(settings.filters).toEqual(["*_internal"]);
    });

    test("returns empty array when no filters", () => {
      mockConfig.setConfig({ servers: {}, endpoints: {} });
      const settings = configService.getSettings();
      expect(settings.filters).toEqual([]);
    });
  });

  describe("updateSettings", () => {
    test("updates global filters", () => {
      const settings = configService.updateSettings({
        filters: ["*_debug", "*_test"],
      });

      expect(settings.filters).toEqual(["*_debug", "*_test"]);
    });

    test("clears filters when set to undefined", () => {
      const settings = configService.updateSettings({
        filters: undefined,
      });

      expect(settings.filters).toEqual([]);
    });
  });

  // ==========================================================================
  // Status
  // ==========================================================================

  describe("getStatus", () => {
    test("returns server status", () => {
      const status = configService.getStatus();
      expect(status.status).toBe("ok");
      expect(status.uptime).toBeGreaterThanOrEqual(0);
      expect(status.memory.rss).toBeGreaterThan(0);
      expect(status.memory.heapUsed).toBeGreaterThan(0);
    });

    test("includes endpoint status", () => {
      const status = configService.getStatus();
      expect(status.endpoints).toHaveProperty("main");
      expect(status.endpoints.main.status).toBe("ok");
      expect(status.endpoints.main.activeSessions).toBe(0);
    });
  });

  // ==========================================================================
  // Config Reload
  // ==========================================================================

  describe("reloadConfig", () => {
    test("returns true on successful reload", () => {
      const result = configService.reloadConfig();
      expect(result).toBe(true);
    });
  });
});
