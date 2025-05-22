import { expect } from "chai";
import { ConfigManager } from "../src/config-manager";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("ConfigManager", () => {
  let configPath: string;
  let configManager: ConfigManager;

  beforeEach(() => {
    configPath = join(tmpdir(), `test-config-${Date.now()}.json`);
  });

  afterEach(async () => {
    await unlink(configPath).catch(() => 0);
  });

  const writeConfig = async (config: any) => {
    await writeFile(configPath, JSON.stringify(config), "utf8");
    configManager = new ConfigManager(configPath);
    configManager.load();
  };

  it("should load global filters", async () => {
    await writeConfig({
      servers: { test: { url: "http://test" } },
      contexts: { default: { servers: ["test"] } },
      endpoints: { default: { contexts: ["default"] } },
      filters: ["global_*", "test_*"],
    });

    const filters = configManager.getFilters();
    expect(filters).to.deep.equal(["global_*", "test_*"]);
  });

  it("should use server-specific filters when present", async () => {
    await writeConfig({
      servers: {
        server1: {
          url: "http://test1",
          filters: ["server1_*", "local_*"],
        },
      },
      contexts: { default: { servers: ["server1"] } },
      endpoints: { default: { contexts: ["default"] } },
      filters: ["global_*"],
    });

    const serverFilters = configManager.getFilters("server1");
    expect(serverFilters).to.deep.equal(["server1_*", "local_*"]);
  });

  it("should inherit global filters when server has no specific filters", async () => {
    await writeConfig({
      servers: {
        server1: { url: "http://test1" },
      },
      contexts: { default: { servers: ["server1"] } },
      endpoints: { default: { contexts: ["default"] } },
      filters: ["global_*", "shared_*"],
    });

    const serverFilters = configManager.getFilters("server1");
    expect(serverFilters).to.deep.equal(["global_*", "shared_*"]);
  });

  it("should handle missing filters gracefully", async () => {
    await writeConfig({
      servers: {
        server1: { url: "http://test1" },
      },
      contexts: { default: { servers: ["server1"] } },
      endpoints: { default: { contexts: ["default"] } },
    });

    const globalFilters = configManager.getFilters();
    expect(globalFilters).to.deep.equal([]);

    const serverFilters = configManager.getFilters("server1");
    expect(serverFilters).to.deep.equal([]);
  });

  it("should validate server-specific filters", async () => {
    try {
      await writeConfig({
        servers: {
          server1: {
            url: "http://test1",
            filters: "invalid", // Should be an array
          },
        },
        contexts: { default: { servers: ["server1"] } },
        endpoints: { default: { contexts: ["default"] } },
      });

      expect.fail("Should have thrown error");
    } catch (error) {
      expect(error.message).to.equal(
        'The filters in server "server1" must be an array of strings'
      );
    }
  });
});
