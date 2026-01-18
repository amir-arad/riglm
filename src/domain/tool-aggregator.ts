/**
 * Tool Aggregator - Pure domain logic for tool namespacing and aggregation
 * NO EXTERNAL DEPENDENCIES
 */

import { ToolDefinition } from "./types";
import { FilterEngine } from "./filter-engine";

/**
 * Aggregates tools from multiple MCP servers with namespacing and filtering.
 */
export class ToolAggregator {
  /**
   * Create a namespaced tool name: serverName-toolName
   * Server names have dashes removed to avoid ambiguity in parsing.
   * @param serverName The MCP server name
   * @param toolName The original tool name
   * @returns Namespaced tool name
   */
  static namespace(serverName: string, toolName: string): string {
    // Remove dashes from server name to avoid ambiguity when parsing
    return `${serverName.replace(/-/g, "")}-${toolName}`;
  }

  /**
   * Parse a namespaced tool name back into server and tool components.
   * @param namespacedName The namespaced tool name (e.g., "github-search_code")
   * @returns Object with serverName and toolName, or null if invalid
   */
  static parseNamespacedName(namespacedName: string): {
    serverName: string;
    toolName: string;
  } | null {
    const dashIndex = namespacedName.indexOf("-");
    if (dashIndex === -1) {
      return null;
    }

    return {
      serverName: namespacedName.substring(0, dashIndex),
      toolName: namespacedName.substring(dashIndex + 1),
    };
  }

  /**
   * Aggregate tools from multiple servers with namespacing and filtering.
   * @param servers Array of server tool sets with filter engines
   * @returns Aggregated and filtered tool definitions
   */
  static aggregateTools(
    servers: Array<{
      serverName: string;
      tools: ToolDefinition[];
      filterEngine: FilterEngine;
    }>
  ): ToolDefinition[] {
    const aggregated: ToolDefinition[] = [];

    for (const { serverName, tools, filterEngine } of servers) {
      for (const tool of tools) {
        const namespacedName = this.namespace(serverName, tool.name);

        // Apply filtering
        if (filterEngine.shouldFilter(namespacedName)) {
          continue;
        }

        aggregated.push({
          name: namespacedName,
          description: tool.description,
          inputSchema: tool.inputSchema,
        });
      }
    }

    return aggregated;
  }

  /**
   * Build a tool handler lookup map from aggregated servers.
   * @param servers Array of server connections with their tools
   * @param callTool Function to call a tool on a specific server
   * @returns Map from namespaced tool name to handler function
   */
  static buildToolHandlers<T>(
    servers: Array<{
      serverName: string;
      tools: ToolDefinition[];
      callTool: (toolName: string, args?: Record<string, unknown>) => Promise<T>;
    }>
  ): Map<string, (args?: Record<string, unknown>) => Promise<T>> {
    const handlers = new Map<string, (args?: Record<string, unknown>) => Promise<T>>();

    for (const { serverName, tools, callTool } of servers) {
      for (const tool of tools) {
        const namespacedName = this.namespace(serverName, tool.name);
        handlers.set(namespacedName, (args) => callTool(tool.name, args));
      }
    }

    return handlers;
  }
}
