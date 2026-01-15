/**
 * Unit tests for Extension domain types and validation (Zod-based)
 */

import { describe, test, expect } from "bun:test";
import { ZodError } from "zod";
import {
  isLocalConfig,
  isRemoteConfig,
  validateExtension,
  validateCreateInput,
  type Extension,
  type CreateExtensionInput,
  type McpServerConfig,
} from "../src/domain/extension";

describe("Extension Domain", () => {
  describe("isLocalConfig", () => {
    test("returns true for local config with command and args", () => {
      const config: McpServerConfig = { command: "node", args: ["server.js"] };
      expect(isLocalConfig(config)).toBe(true);
    });

    test("returns true for local config with env", () => {
      const config: McpServerConfig = {
        command: "bunx",
        args: ["@anthropic-ai/mcp-server-github"],
        env: { GITHUB_TOKEN: "test" },
      };
      expect(isLocalConfig(config)).toBe(true);
    });

    test("returns false for remote config", () => {
      const config: McpServerConfig = { url: "http://localhost:3001/sse" };
      expect(isLocalConfig(config)).toBe(false);
    });
  });

  describe("isRemoteConfig", () => {
    test("returns true for remote config with url", () => {
      const config: McpServerConfig = { url: "http://localhost:3001/sse" };
      expect(isRemoteConfig(config)).toBe(true);
    });

    test("returns true for remote config with headers", () => {
      const config: McpServerConfig = {
        url: "https://api.example.com/mcp",
        headers: { Authorization: "Bearer token" },
      };
      expect(isRemoteConfig(config)).toBe(true);
    });

    test("returns false for local config", () => {
      const config: McpServerConfig = { command: "node", args: [] };
      expect(isRemoteConfig(config)).toBe(false);
    });
  });

  describe("validateExtension", () => {
    const validExtension: Extension = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      type: "mcp-server",
      name: "GitHub",
      description: "GitHub MCP server",
      enabled: true,
      config: { command: "bunx", args: ["@anthropic-ai/mcp-server-github"] },
      filters: ["dangerous_*"],
      tags: ["vcs", "code"],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    test("accepts valid extension with local config", () => {
      expect(() => validateExtension(validExtension)).not.toThrow();
    });

    test("accepts valid extension with remote config", () => {
      const ext: Extension = {
        ...validExtension,
        config: { url: "http://localhost:3001/sse" },
      };
      expect(() => validateExtension(ext)).not.toThrow();
    });

    test("accepts extension with minimal required fields", () => {
      const minimal: Extension = {
        id: "123",
        type: "mcp-server",
        name: "Test",
        enabled: false,
        config: { url: "http://test" },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      expect(() => validateExtension(minimal)).not.toThrow();
    });

    test("rejects null", () => {
      expect(() => validateExtension(null)).toThrow(ZodError);
    });

    test("rejects non-object", () => {
      expect(() => validateExtension("string")).toThrow(ZodError);
    });

    test("rejects empty object", () => {
      expect(() => validateExtension({})).toThrow(ZodError);
    });

    test("rejects missing id", () => {
      const { id, ...rest } = validExtension;
      expect(() => validateExtension(rest)).toThrow(ZodError);
    });

    test("rejects empty id", () => {
      expect(() => validateExtension({ ...validExtension, id: "" })).toThrow(ZodError);
    });

    test("rejects invalid type", () => {
      expect(() => validateExtension({ ...validExtension, type: "unknown" })).toThrow(ZodError);
    });

    test("rejects missing name", () => {
      const { name, ...rest } = validExtension;
      expect(() => validateExtension(rest)).toThrow(ZodError);
    });

    test("rejects empty name", () => {
      expect(() => validateExtension({ ...validExtension, name: "" })).toThrow(ZodError);
    });

    test("rejects non-boolean enabled", () => {
      expect(() => validateExtension({ ...validExtension, enabled: "true" })).toThrow(ZodError);
    });

    test("rejects non-string description", () => {
      expect(() => validateExtension({ ...validExtension, description: 123 })).toThrow(ZodError);
    });

    test("rejects non-array filters", () => {
      expect(() => validateExtension({ ...validExtension, filters: "filter" })).toThrow(ZodError);
    });

    test("rejects non-string filter items", () => {
      expect(() => validateExtension({ ...validExtension, filters: [123] })).toThrow(ZodError);
    });

    test("rejects non-array tags", () => {
      expect(() => validateExtension({ ...validExtension, tags: "tag" })).toThrow(ZodError);
    });

    test("rejects invalid local config - missing args", () => {
      expect(() =>
        validateExtension({ ...validExtension, config: { command: "node" } })
      ).toThrow(ZodError);
    });

    test("rejects invalid local config - non-string command", () => {
      expect(() =>
        validateExtension({ ...validExtension, config: { command: 123, args: [] } })
      ).toThrow(ZodError);
    });

    test("rejects invalid local config - empty command", () => {
      expect(() =>
        validateExtension({ ...validExtension, config: { command: "", args: [] } })
      ).toThrow(ZodError);
    });

    test("rejects invalid remote config - empty url", () => {
      expect(() =>
        validateExtension({ ...validExtension, config: { url: "" } })
      ).toThrow(ZodError);
    });

    test("rejects config without command or url", () => {
      expect(() =>
        validateExtension({ ...validExtension, config: { other: "field" } })
      ).toThrow(ZodError);
    });
  });

  describe("validateCreateInput", () => {
    const validInput: CreateExtensionInput = {
      type: "mcp-server",
      name: "GitHub",
      enabled: true,
      config: { command: "bunx", args: ["@anthropic-ai/mcp-server-github"] },
    };

    test("accepts valid input", () => {
      expect(() => validateCreateInput(validInput)).not.toThrow();
    });

    test("accepts input with optional fields", () => {
      const input: CreateExtensionInput = {
        ...validInput,
        description: "GitHub server",
        filters: ["*_dangerous"],
        tags: ["vcs"],
      };
      expect(() => validateCreateInput(input)).not.toThrow();
    });

    test("rejects null", () => {
      expect(() => validateCreateInput(null)).toThrow(ZodError);
    });

    test("rejects missing type", () => {
      const { type, ...rest } = validInput;
      expect(() => validateCreateInput(rest)).toThrow(ZodError);
    });

    test("rejects invalid type", () => {
      expect(() => validateCreateInput({ ...validInput, type: "invalid" })).toThrow(ZodError);
    });

    test("rejects missing name", () => {
      const { name, ...rest } = validInput;
      expect(() => validateCreateInput(rest)).toThrow(ZodError);
    });

    test("rejects empty name", () => {
      expect(() => validateCreateInput({ ...validInput, name: "" })).toThrow(ZodError);
    });

    test("rejects missing enabled", () => {
      const { enabled, ...rest } = validInput;
      expect(() => validateCreateInput(rest)).toThrow(ZodError);
    });

    test("rejects missing config", () => {
      const { config, ...rest } = validInput;
      expect(() => validateCreateInput(rest)).toThrow(ZodError);
    });

    test("rejects invalid config", () => {
      expect(() => validateCreateInput({ ...validInput, config: {} })).toThrow(ZodError);
    });
  });
});
