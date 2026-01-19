import { describe, test, expect } from "bun:test";
import { FilterEngine } from "../src/domain/filter-engine";
import { Filters } from "../src/domain/config-resolver";

describe("FilterEngine", () => {
  describe("shouldFilter", () => {
    test("should return false when no filters are configured", () => {
      const engine = new FilterEngine();
      expect(engine.shouldFilter("test_tool")).toBe(false);
    });

    test("should filter tools matching ignore patterns", () => {
      const filters: Filters = ["debug_*", "test_hidden_*"];
      const engine = new FilterEngine(filters);

      expect(engine.shouldFilter("debug_tool")).toBe(true);
      expect(engine.shouldFilter("test_hidden_tool")).toBe(true);
      expect(engine.shouldFilter("production_tool")).toBe(false);
    });

    test("should handle multiple patterns", () => {
      const filters: Filters = ["debug_*", "test_*", "legacy_*"];
      const engine = new FilterEngine(filters);

      expect(engine.shouldFilter("debug_tool")).toBe(true);
      expect(engine.shouldFilter("test_tool")).toBe(true);
      expect(engine.shouldFilter("legacy_tool")).toBe(true);
      expect(engine.shouldFilter("valid_tool")).toBe(false);
    });

    test("should handle **- glob patterns for deep path matching", () => {
      const filters: Filters = [
        "**-debug_*",
        "server-**-test_*",
        "**-hidden-**",
      ];
      const engine = new FilterEngine(filters);

      // Test **/ at the beginning - should match any depth
      expect(engine.shouldFilter("debug_tool")).toBe(true);
      expect(engine.shouldFilter("level1-debug_tool")).toBe(true);
      expect(engine.shouldFilter("level1-level2-debug_tool")).toBe(true);
      expect(engine.shouldFilter("level1-level2-level3-debug_production")).toBe(
        true
      );

      // Test **/ in the middle - should match paths within server
      expect(engine.shouldFilter("server-test_tool")).toBe(true);
      expect(engine.shouldFilter("server-module-test_tool")).toBe(true);
      expect(
        engine.shouldFilter("server-module-submodule-test_integration")
      ).toBe(true);
      expect(engine.shouldFilter("other-module-test_tool")).toBe(false);

      // Test **/ for directory matching
      expect(engine.shouldFilter("project-hidden-secret")).toBe(true);
      expect(engine.shouldFilter("project-hidden-deep-secret")).toBe(true);
      expect(engine.shouldFilter("hidden-file")).toBe(true);
      expect(engine.shouldFilter("public-file")).toBe(false);
    });

    test("should handle complex nested patterns", () => {
      const filters: Filters = [
        "**-temp-**",
        "org-**-legacy_*",
        "**-test-**-mock_*",
      ];
      const engine = new FilterEngine(filters);

      // Test nested directory exclusions
      expect(engine.shouldFilter("project-temp-file")).toBe(true);
      expect(engine.shouldFilter("project-temp-nested-file")).toBe(true);
      expect(engine.shouldFilter("temp-file")).toBe(true);
      expect(engine.shouldFilter("project-cache-file")).toBe(false);

      // Test organizational patterns
      expect(engine.shouldFilter("org-legacy_system")).toBe(true);
      expect(engine.shouldFilter("org-team-legacy_tool")).toBe(true);
      expect(engine.shouldFilter("org-team-modern_tool")).toBe(false);
      expect(engine.shouldFilter("company-team-legacy_tool")).toBe(false);

      // Test complex nested test patterns
      expect(engine.shouldFilter("project-test-mock_data")).toBe(true);
      expect(engine.shouldFilter("project-test-unit-mock_service")).toBe(true);
      expect(engine.shouldFilter("service-test-integration-mock_client")).toBe(
        true
      );
      expect(engine.shouldFilter("project-test-real_service")).toBe(false);
      expect(engine.shouldFilter("project-src-mock_data")).toBe(false);
    });

    test("should handle edge cases with **- patterns", () => {
      // Test **/* - should match everything
      const starStarSlashStar = new FilterEngine(["**-*"]);
      expect(starStarSlashStar.shouldFilter("anything")).toBe(true);
      expect(starStarSlashStar.shouldFilter("path-to-anything")).toBe(true);

      // Test **/ alone - should match empty string and paths ending with /
      const starStarSlash = new FilterEngine(["**-"]);
      expect(starStarSlash.shouldFilter("")).toBe(true); // Empty string matches
      expect(starStarSlash.shouldFilter("path-")).toBe(true);
      expect(starStarSlash.shouldFilter("path")).toBe(false);

      // Test specific path requirements
      const aStarStarB = new FilterEngine(["a-**-b"]);
      expect(aStarStarB.shouldFilter("a-b")).toBe(true);
      expect(aStarStarB.shouldFilter("a-middle-b")).toBe(true);
      expect(aStarStarB.shouldFilter("a-deep-nested-b")).toBe(true);
      expect(aStarStarB.shouldFilter("x-b")).toBe(false);
      expect(aStarStarB.shouldFilter("a-c")).toBe(false);

      // Test exact matches at any depth
      const starStarExact = new FilterEngine(["**-exact"]);
      expect(starStarExact.shouldFilter("exact")).toBe(true);
      expect(starStarExact.shouldFilter("path-exact")).toBe(true);
      expect(starStarExact.shouldFilter("deep-nested-exact")).toBe(true);
      expect(starStarExact.shouldFilter("exact_tool")).toBe(false);
    });
  });

  describe("getFilterStatus", () => {
    test("should return correct status for ignored tools", () => {
      const filters: Filters = ["debug_*"];
      const engine = new FilterEngine(filters);
      const status = engine.getFilterStatus("debug_tool");

      expect(status).toEqual({
        filtered: true,
        reason: "ignored",
      });
    });

    test("should return unfiltered status for non-matching tools", () => {
      const filters: Filters = ["debug_*", "test_*"];
      const engine = new FilterEngine(filters);
      const status = engine.getFilterStatus("valid_tool");

      expect(status).toEqual({
        filtered: false,
      });
    });
  });
});
