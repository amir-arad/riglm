

import { FilterEngine } from "./filter-engine";






export type JsonSchema = Record<string, unknown>;


export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}


export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}


export type ToolContent =
  | TextContent
  | ImageContent
  | AudioContent
  | ResourceContent;


export interface TextContent {
  type: "text";
  text: string;
}


export interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}


export interface AudioContent {
  type: "audio";
  data: string;
  mimeType: string;
}


export interface ResourceContent {
  type: "resource";
  resource: {
    uri: string;
    text?: string;
    mimeType?: string;
  };
}


export type ToolHandler = (
  args: Record<string, unknown> | undefined
) => Promise<ToolResponse>;






export class ToolAggregator {
  
  static namespace(serverName: string, toolName: string): string {
    
    return `${serverName.replace(/-/g, "")}-${toolName}`;
  }

  
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
