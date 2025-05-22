import { expect } from "chai";
import { FilterEngine } from "../src/etc/filter";
import { Filters } from "../src/etc/config-schema";

describe("FilterEngine", () => {
  describe("shouldFilter", () => {
    it("should return false when no filters are configured", () => {
      const engine = new FilterEngine();
      expect(engine.shouldFilter("test_tool")).to.be.false;
    });

    it("should filter tools matching ignore patterns", () => {
      const filters: Filters = ["debug_*", "test_hidden_*"];
      const engine = new FilterEngine(filters);

      expect(engine.shouldFilter("debug_tool")).to.be.true;
      expect(engine.shouldFilter("test_hidden_tool")).to.be.true;
      expect(engine.shouldFilter("production_tool")).to.be.false;
    });

    it("should handle multiple patterns", () => {
      const filters: Filters = ["debug_*", "test_*", "legacy_*"];
      const engine = new FilterEngine(filters);

      expect(engine.shouldFilter("debug_tool")).to.be.true;
      expect(engine.shouldFilter("test_tool")).to.be.true;
      expect(engine.shouldFilter("legacy_tool")).to.be.true;
      expect(engine.shouldFilter("valid_tool")).to.be.false;
    });

    it("should handle **/ glob patterns for deep path matching", () => {
      const filters: Filters = [
        "**/debug_*",
        "server/**/test_*",
        "**/hidden/**",
      ];
      const engine = new FilterEngine(filters);

      // Test **/ at the beginning - should match any depth
      expect(engine.shouldFilter("debug_tool")).to.be.true;
      expect(engine.shouldFilter("level1/debug_tool")).to.be.true;
      expect(engine.shouldFilter("level1/level2/debug_tool")).to.be.true;
      expect(engine.shouldFilter("level1/level2/level3/debug_production")).to.be
        .true;

      // Test **/ in the middle - should match paths within server
      expect(engine.shouldFilter("server/test_tool")).to.be.true;
      expect(engine.shouldFilter("server/module/test_tool")).to.be.true;
      expect(engine.shouldFilter("server/module/submodule/test_integration")).to
        .be.true;
      expect(engine.shouldFilter("other/module/test_tool")).to.be.false;

      // Test **/ for directory matching
      expect(engine.shouldFilter("project/hidden/secret")).to.be.true;
      expect(engine.shouldFilter("project/hidden/deep/secret")).to.be.true;
      expect(engine.shouldFilter("hidden/file")).to.be.true;
      expect(engine.shouldFilter("public/file")).to.be.false;
    });

    it("should handle URI-like tool identifiers", () => {
      const filters: Filters = [
        "http://**",
        "github.com/**/private_*",
        "**/api/v*/internal/**",
      ];
      const engine = new FilterEngine(filters);

      // Test URI schemes
      expect(engine.shouldFilter("http://example.com/tool")).to.be.true;
      expect(engine.shouldFilter("http://api.service.com/v1/endpoint")).to.be
        .true;
      expect(engine.shouldFilter("https://example.com/tool")).to.be.false;

      // Test domain-based filtering
      expect(engine.shouldFilter("github.com/user/private_repo")).to.be.true;
      expect(engine.shouldFilter("github.com/org/team/private_tool")).to.be
        .true;
      expect(engine.shouldFilter("github.com/user/public_repo")).to.be.false;
      expect(engine.shouldFilter("gitlab.com/user/private_repo")).to.be.false;

      // Test API versioning patterns
      expect(engine.shouldFilter("service/api/v1/internal/secret")).to.be.true;
      expect(engine.shouldFilter("service/api/v2/internal/admin/tool")).to.be
        .true;
      expect(engine.shouldFilter("service/api/v1/public/tool")).to.be.false;
      expect(engine.shouldFilter("service/web/v1/internal/tool")).to.be.false;
    });

    it("should handle complex nested patterns", () => {
      const filters: Filters = [
        "**/temp/**",
        "org/**/legacy_*",
        "**/test/**/mock_*",
      ];
      const engine = new FilterEngine(filters);

      // Test nested directory exclusions
      expect(engine.shouldFilter("project/temp/file")).to.be.true;
      expect(engine.shouldFilter("project/temp/nested/file")).to.be.true;
      expect(engine.shouldFilter("temp/file")).to.be.true;
      expect(engine.shouldFilter("project/cache/file")).to.be.false;

      // Test organizational patterns
      expect(engine.shouldFilter("org/legacy_system")).to.be.true;
      expect(engine.shouldFilter("org/team/legacy_tool")).to.be.true;
      expect(engine.shouldFilter("org/team/modern_tool")).to.be.false;
      expect(engine.shouldFilter("company/team/legacy_tool")).to.be.false;

      // Test complex nested test patterns
      expect(engine.shouldFilter("project/test/mock_data")).to.be.true;
      expect(engine.shouldFilter("project/test/unit/mock_service")).to.be.true;
      expect(engine.shouldFilter("service/test/integration/mock_client")).to.be
        .true;
      expect(engine.shouldFilter("project/test/real_service")).to.be.false;
      expect(engine.shouldFilter("project/src/mock_data")).to.be.false;
    });

    it("should handle edge cases with **/ patterns", () => {
      // Test **/* - should match everything
      const starStarSlashStar = new FilterEngine(["**/*"]);
      expect(starStarSlashStar.shouldFilter("anything")).to.be.true;
      expect(starStarSlashStar.shouldFilter("path/to/anything")).to.be.true;

      // Test **/ alone - should match empty string and paths ending with /
      const starStarSlash = new FilterEngine(["**/"]);
      expect(starStarSlash.shouldFilter("")).to.be.true; // Empty string matches
      expect(starStarSlash.shouldFilter("path/")).to.be.true;
      expect(starStarSlash.shouldFilter("path")).to.be.false;

      // Test specific path requirements
      const aStarStarB = new FilterEngine(["a/**/b"]);
      expect(aStarStarB.shouldFilter("a/b")).to.be.true;
      expect(aStarStarB.shouldFilter("a/middle/b")).to.be.true;
      expect(aStarStarB.shouldFilter("a/deep/nested/b")).to.be.true;
      expect(aStarStarB.shouldFilter("x/b")).to.be.false;
      expect(aStarStarB.shouldFilter("a/c")).to.be.false;

      // Test exact matches at any depth
      const starStarExact = new FilterEngine(["**/exact"]);
      expect(starStarExact.shouldFilter("exact")).to.be.true;
      expect(starStarExact.shouldFilter("path/exact")).to.be.true;
      expect(starStarExact.shouldFilter("deep/nested/exact")).to.be.true;
      expect(starStarExact.shouldFilter("exact_tool")).to.be.false;
    });
  });

  describe("getFilterStatus", () => {
    it("should return correct status for ignored tools", () => {
      const filters: Filters = ["debug_*"];
      const engine = new FilterEngine(filters);
      const status = engine.getFilterStatus("debug_tool");

      expect(status).to.deep.equal({
        filtered: true,
        reason: "ignored",
      });
    });

    it("should return unfiltered status for non-matching tools", () => {
      const filters: Filters = ["debug_*", "test_*"];
      const engine = new FilterEngine(filters);
      const status = engine.getFilterStatus("valid_tool");

      expect(status).to.deep.equal({
        filtered: false,
      });
    });
  });
});
