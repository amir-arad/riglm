import * as entityModel from "./entity.model";

export type EndpointEntity = entityModel.IEntity & {
  name: string;
  description: string;
  contextIds: string[];
  status: "active" | "draft" | "deprecated";
  url: string;
  apiKey: string;
  usage: { connections: number; requests: number };
};

export function isEndpointEntity(
  entity: entityModel.IEntity
): entity is EndpointEntity {
  return (
    typeof entity.name === "string" &&
    typeof entity.description === "string" &&
    Array.isArray(entity.contextIds) &&
    typeof entity.status === "string" &&
    typeof entity.url === "string" &&
    typeof entity.apiKey === "string" &&
    typeof entity.usage === "object"
  );
}

export async function getEndpointEntityByName(name: string) {
  const [endpointEntity] = await entityModel.filter("endpoint", { name });
  if (!endpointEntity) {
    throw new Error(`Endpoint with name ${name} not found`);
  }
  if (!isEndpointEntity(endpointEntity)) {
    throw new Error(`Invalid endpoint entity: ${name}`);
  }
  return endpointEntity;
}
