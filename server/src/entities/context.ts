import * as entityModel from "./entity.model";

export type ContextEntity = entityModel.IEntity & {
  name: string;
  description: string;
  version: string;
  status: "active" | "draft" | "deprecated";
  guidelines: string;
  tools: Array<{
    serverId: string;
    originalName: string;
    exposedName: string;
    description: string;
    inputSchema: Record<string, any>;
    configuration: Record<string, any>;
  }>;
};

export function isContextEntity(
  entity: entityModel.IEntity
): entity is ContextEntity {
  return (
    typeof entity.name === "string" &&
    typeof entity.description === "string" &&
    typeof entity.version === "string" &&
    typeof entity.status === "string" &&
    typeof entity.guidelines === "string" &&
    Array.isArray(entity.tools) &&
    entity.tools.every(
      (tool) =>
        typeof tool.serverId === "string" &&
        typeof tool.originalName === "string" &&
        typeof tool.exposedName === "string" &&
        typeof tool.description === "string" &&
        typeof tool.inputSchema === "object" &&
        typeof tool.configuration === "object"
    )
  );
}

export async function getContextEntityById(id: string) {
  const contextEntity = await entityModel.getById("context", id);
  if (!contextEntity) {
    throw new Error(`Context with ID ${id} not found`);
  }
  if (!isContextEntity(contextEntity)) {
    throw new Error(`Invalid context entity with ID: ${id}`);
  }
  return contextEntity;
}
