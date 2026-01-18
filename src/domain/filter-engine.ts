/**
 * Filter Engine - Pure domain logic for tool filtering
 * NO EXTERNAL DEPENDENCIES
 */

import { Filters } from "./types";

/**
 * Engine for filtering tools based on glob patterns.
 * Supports wildcards: * (any characters), ? (single character), **- (optional segments with dash)
 */
export class FilterEngine {
  constructor(private filters: Filters = []) {}

  /**
   * Check if a tool should be filtered out based on configured patterns
   * @param toolId The full tool identifier (e.g., "github-search_code")
   * @returns true if the tool should be filtered out, false otherwise
   */
  shouldFilter(toolId: string): boolean {
    return this.matchesPatterns(toolId, this.filters);
  }

  /**
   * Get the filter status of a tool with reason
   * @param toolId The tool identifier to check
   * @returns Object containing filter status and reason
   */
  getFilterStatus(toolId: string): {
    filtered: boolean;
    reason?: "ignored";
  } {
    if (this.shouldFilter(toolId)) {
      return { filtered: true, reason: "ignored" };
    }
    return { filtered: false };
  }

  /**
   * Get the configured filter patterns
   */
  getPatterns(): Filters {
    return [...this.filters];
  }

  /**
   * Check if a tool ID matches any of the provided patterns
   * @param toolId The tool identifier to check
   * @param patterns Array of glob patterns to match against
   * @returns true if the tool ID matches any pattern, false otherwise
   */
  private matchesPatterns(toolId: string, patterns: string[]): boolean {
    if (patterns.length === 0) {
      return false;
    }

    return patterns.some((pattern) => {
      // Convert glob pattern to regex - handle **- specially
      const regexPattern = pattern
        .replace(/\*\*-/g, "__DOUBLESTAR_DASH__") // Protect **- during escaping
        .replace(/\?/g, "__QUESTION_MARK__") // Protect ? during escaping
        .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
        .replace(/__DOUBLESTAR_DASH__/g, "(?:.*-)?") // Convert **- to optional segments using -
        .replace(/\*/g, ".*") // Convert remaining * to .*
        .replace(/__QUESTION_MARK__/g, "."); // Convert ? to .

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(toolId);
    });
  }
}
