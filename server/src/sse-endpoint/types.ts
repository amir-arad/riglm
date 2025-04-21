import { JSONSchema7 } from "json-schema";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
}

export type McpToolResponse = {
  content: ToolContent[];
  isError?: boolean;
};

export type ToolContent =
  | TextContent
  | ImageContent
  | ResourceContent
  | AudioContent;

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image";
  data: string; // base64 encoded
  mimeType: string; // e.g., "image/png", "image/jpeg"
};

export interface AudioContent {
  type: "audio";
  data: string; // base64 encoded
  mimeType: string; // e.g., "audio/wav", "audio/mpeg"
}

export type ResourceContent = {
  type: "resource";
  resource: {
    uri: string; // Resource identifier
    text?: string; // Optional resource content
    mimeType?: string; // Optional resource MIME type
  };
};

export type ToolHandler = (
  args: Record<string, unknown> | undefined
) => Promise<McpToolResponse>;
