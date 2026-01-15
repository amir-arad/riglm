/**
 * Integration tests for ExtensionRegistry
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { ExtensionRegistry } from "../src/extension-manager";
import type { ExtensionStoragePort } from "../src/ports";
import type { Extension, CreateExtensionInput } from "../src/domain/extension";
import { createMockLogger } from "./mocks/mock-logger";

/**
 * Create an in-memory mock storage for testing
 */
function createMockStorage(): ExtensionStoragePort & { data: Extension[] } {
  const data: Extension[] = [];
  return {
    data,
    load: () => [...data],
    save: (exts: Extension[]) => {
      data.length = 0;
      data.push(...exts);
    },
    exists: () => true,
    initialize: () => {},
  };
}

describe("ExtensionRegistry", () => {
  let registry: ExtensionRegistry;
  let storage: ReturnType<typeof createMockStorage>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    storage = createMockStorage();
    logger = createMockLogger();
    registry = new ExtensionRegistry({ storage, logger });
    registry.init();
  });

  describe("init", () => {
    test("loads existing extensions from storage", () => {
      const existing: Extension = {
        id: "existing-id",
        type: "mcp-server",
        name: "Existing",
        enabled: true,
        config: { url: "http://existing" },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      storage.data.push(existing);

      const newRegistry = new ExtensionRegistry({ storage, logger });
      newRegistry.init();

      expect(newRegistry.list()).toHaveLength(1);
      expect(newRegistry.get("existing-id")).toEqual(existing);
    });

    test("logs number of loaded extensions", () => {
      expect(logger.calls.some((c) => c.level === "info" && c.message.includes("Loaded 0 extensions"))).toBe(true);
    });
  });

  describe("create", () => {
    test("creates extension with generated id", () => {
      const input: CreateExtensionInput = {
        type: "mcp-server",
        name: "GitHub",
        enabled: true,
        config: { command: "bunx", args: ["@anthropic-ai/mcp-server-github"] },
      };

      const ext = registry.create(input);

      expect(ext.id).toBeDefined();
      expect(ext.id.length).toBeGreaterThan(0);
      expect(ext.name).toBe("GitHub");
      expect(ext.type).toBe("mcp-server");
      expect(ext.enabled).toBe(true);
    });

    test("creates extension with timestamps", () => {
      const before = new Date().toISOString();

      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      const after = new Date().toISOString();

      expect(ext.createdAt).toBeDefined();
      expect(ext.updatedAt).toBeDefined();
      expect(ext.createdAt >= before).toBe(true);
      expect(ext.createdAt <= after).toBe(true);
      expect(ext.createdAt).toBe(ext.updatedAt);
    });

    test("persists extension to storage", () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      expect(storage.data).toHaveLength(1);
      expect(storage.data[0].id).toBe(ext.id);
    });

    test("logs creation", () => {
      registry.create({
        type: "mcp-server",
        name: "GitHub",
        enabled: true,
        config: { url: "http://github" },
      });

      expect(logger.calls.some((c) => c.level === "info" && c.message.includes("Created extension: GitHub"))).toBe(true);
    });

    test("preserves optional fields", () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        description: "Test description",
        enabled: true,
        config: { url: "http://test" },
        filters: ["*_dangerous"],
        tags: ["test", "example"],
      });

      expect(ext.description).toBe("Test description");
      expect(ext.filters).toEqual(["*_dangerous"]);
      expect(ext.tags).toEqual(["test", "example"]);
    });
  });

  describe("list", () => {
    test("returns empty array when no extensions", () => {
      expect(registry.list()).toEqual([]);
    });

    test("returns all extensions", () => {
      registry.create({ type: "mcp-server", name: "A", enabled: true, config: { url: "http://a" } });
      registry.create({ type: "mcp-server", name: "B", enabled: false, config: { url: "http://b" } });
      registry.create({ type: "mcp-server", name: "C", enabled: true, config: { url: "http://c" } });

      const list = registry.list();

      expect(list).toHaveLength(3);
      expect(list.map((e) => e.name)).toEqual(["A", "B", "C"]);
    });

    test("returns a copy, not the internal array", () => {
      registry.create({ type: "mcp-server", name: "A", enabled: true, config: { url: "http://a" } });

      const list1 = registry.list();
      const list2 = registry.list();

      expect(list1).not.toBe(list2);
      expect(list1).toEqual(list2);
    });
  });

  describe("get", () => {
    test("returns extension by id", () => {
      const created = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      const found = registry.get(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("Test");
    });

    test("returns undefined for unknown id", () => {
      expect(registry.get("unknown-id")).toBeUndefined();
    });
  });

  describe("getEnabled", () => {
    test("returns empty array when no enabled extensions", () => {
      registry.create({ type: "mcp-server", name: "A", enabled: false, config: { url: "http://a" } });
      registry.create({ type: "mcp-server", name: "B", enabled: false, config: { url: "http://b" } });

      expect(registry.getEnabled()).toEqual([]);
    });

    test("returns only enabled extensions", () => {
      registry.create({ type: "mcp-server", name: "A", enabled: true, config: { url: "http://a" } });
      registry.create({ type: "mcp-server", name: "B", enabled: false, config: { url: "http://b" } });
      registry.create({ type: "mcp-server", name: "C", enabled: true, config: { url: "http://c" } });

      const enabled = registry.getEnabled();

      expect(enabled).toHaveLength(2);
      expect(enabled.map((e) => e.name)).toEqual(["A", "C"]);
    });
  });

  describe("getByTag", () => {
    test("returns extensions with matching tag", () => {
      registry.create({ type: "mcp-server", name: "A", enabled: true, config: { url: "http://a" }, tags: ["vcs", "code"] });
      registry.create({ type: "mcp-server", name: "B", enabled: true, config: { url: "http://b" }, tags: ["ai"] });
      registry.create({ type: "mcp-server", name: "C", enabled: true, config: { url: "http://c" }, tags: ["vcs"] });

      const vcsExtensions = registry.getByTag("vcs");

      expect(vcsExtensions).toHaveLength(2);
      expect(vcsExtensions.map((e) => e.name)).toEqual(["A", "C"]);
    });

    test("returns empty array when no matching tags", () => {
      registry.create({ type: "mcp-server", name: "A", enabled: true, config: { url: "http://a" }, tags: ["vcs"] });

      expect(registry.getByTag("unknown")).toEqual([]);
    });

    test("handles extensions without tags", () => {
      registry.create({ type: "mcp-server", name: "A", enabled: true, config: { url: "http://a" } });
      registry.create({ type: "mcp-server", name: "B", enabled: true, config: { url: "http://b" }, tags: ["test"] });

      expect(registry.getByTag("test")).toHaveLength(1);
    });
  });

  describe("update", () => {
    test("updates extension fields", () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Original",
        enabled: true,
        config: { url: "http://original" },
      });

      const updated = registry.update(ext.id, { name: "Updated", enabled: false });

      expect(updated.name).toBe("Updated");
      expect(updated.enabled).toBe(false);
      expect(updated.config).toEqual({ url: "http://original" });
    });

    test("updates updatedAt timestamp", async () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      const updated = registry.update(ext.id, { name: "Updated" });

      expect(updated.createdAt).toBe(ext.createdAt);
      expect(updated.updatedAt).not.toBe(ext.updatedAt);
      expect(updated.updatedAt > ext.updatedAt).toBe(true);
    });

    test("preserves id and createdAt", () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      // Try to override id and createdAt (should be ignored at runtime)
      const updated = registry.update(ext.id, {
        name: "Updated",
        id: "new-id",
        createdAt: "2000-01-01T00:00:00Z",
      } as any);

      expect(updated.id).toBe(ext.id);
      expect(updated.createdAt).toBe(ext.createdAt);
    });

    test("persists update to storage", () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      registry.update(ext.id, { name: "Updated" });

      expect(storage.data[0].name).toBe("Updated");
    });

    test("throws for unknown id", () => {
      expect(() => registry.update("unknown-id", { name: "Test" })).toThrow("Extension not found: unknown-id");
    });

    test("logs update", () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      registry.update(ext.id, { name: "Updated" });

      expect(logger.calls.some((c) => c.level === "info" && c.message.includes("Updated extension: Updated"))).toBe(true);
    });
  });

  describe("delete", () => {
    test("removes extension", () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      const result = registry.delete(ext.id);

      expect(result).toBe(true);
      expect(registry.list()).toHaveLength(0);
      expect(registry.get(ext.id)).toBeUndefined();
    });

    test("persists deletion to storage", () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      registry.delete(ext.id);

      expect(storage.data).toHaveLength(0);
    });

    test("returns false for unknown id", () => {
      expect(registry.delete("unknown-id")).toBe(false);
    });

    test("does not affect other extensions", () => {
      const ext1 = registry.create({ type: "mcp-server", name: "A", enabled: true, config: { url: "http://a" } });
      const ext2 = registry.create({ type: "mcp-server", name: "B", enabled: true, config: { url: "http://b" } });

      registry.delete(ext1.id);

      expect(registry.list()).toHaveLength(1);
      expect(registry.get(ext2.id)).toBeDefined();
    });

    test("logs deletion", () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      registry.delete(ext.id);

      expect(logger.calls.some((c) => c.level === "info" && c.message.includes("Deleted extension: Test"))).toBe(true);
    });
  });

  describe("toggle", () => {
    test("toggles enabled to disabled", () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      const toggled = registry.toggle(ext.id);

      expect(toggled.enabled).toBe(false);
    });

    test("toggles disabled to enabled", () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: false,
        config: { url: "http://test" },
      });

      const toggled = registry.toggle(ext.id);

      expect(toggled.enabled).toBe(true);
    });

    test("throws for unknown id", () => {
      expect(() => registry.toggle("unknown-id")).toThrow("Extension not found: unknown-id");
    });

    test("updates updatedAt timestamp", async () => {
      const ext = registry.create({
        type: "mcp-server",
        name: "Test",
        enabled: true,
        config: { url: "http://test" },
      });

      await new Promise((r) => setTimeout(r, 10));

      const toggled = registry.toggle(ext.id);

      expect(toggled.updatedAt > ext.updatedAt).toBe(true);
    });
  });
});
