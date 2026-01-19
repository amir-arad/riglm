import { Filters } from "./config-resolver";

export class FilterEngine {
  constructor(private filters: Filters = []) {}

  shouldFilter(toolId: string): boolean {
    return this.matchesPatterns(toolId, this.filters);
  }

  getFilterStatus(toolId: string): {
    filtered: boolean;
    reason?: "ignored";
  } {
    if (this.shouldFilter(toolId)) {
      return { filtered: true, reason: "ignored" };
    }
    return { filtered: false };
  }

  getPatterns(): Filters {
    return [...this.filters];
  }

  private matchesPatterns(toolId: string, patterns: string[]): boolean {
    if (patterns.length === 0) {
      return false;
    }

    return patterns.some((pattern) => {
      const regexPattern = pattern
        .replace(/\*\*-/g, "__DOUBLESTAR_DASH__")
        .replace(/\?/g, "__QUESTION_MARK__")
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/__DOUBLESTAR_DASH__/g, "(?:.*-)?")
        .replace(/\*/g, ".*")
        .replace(/__QUESTION_MARK__/g, ".");

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(toolId);
    });
  }
}
