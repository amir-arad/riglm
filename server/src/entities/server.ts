import * as entityModel from "./entity.model";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export type ServerEntity = entityModel.IEntity & {
  name: string;
  url: string;
  transportType: string;
  authType: string;
  apiKey: string;
  username: string;
  password: string;
  headers: Array<{
    name: string;
    value: string;
  }>;
  status: "active" | "draft" | "testing" | "deprecated";
  error: string | null;
  lastConnected: string | Date;
  tools: Array<ToolDefinition>;
};

export function isServerEntity(
  entity: entityModel.IEntity
): entity is ServerEntity {
  return (
    typeof entity.name === "string" &&
    typeof entity.url === "string" &&
    typeof entity.transportType === "string" &&
    typeof entity.authType === "string" &&
    typeof entity.apiKey === "string" &&
    typeof entity.username === "string" &&
    typeof entity.password === "string" &&
    Array.isArray(entity.headers) &&
    typeof entity.status === "string" &&
    (entity.error === null || typeof entity.error === "string") &&
    (typeof entity.lastConnected === "string" ||
      entity.lastConnected instanceof Date) &&
    Array.isArray(entity.tools)
  );
}

export async function getServerEntityById(id: string) {
  const serverEntity = await entityModel.getById("server", id);
  if (!serverEntity) {
    throw new Error(`Server with ID ${id} not found`);
  }
  if (!isServerEntity(serverEntity)) {
    throw new Error(`Invalid server entity with ID: ${id}`);
  }
  return serverEntity;
}
