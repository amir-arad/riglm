import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { expect } from "chai";
import sinon from "sinon";
import { Backend } from "../src/backend.service";
import { Services } from "../src/etc/service";
import {
  HostsService,
  makeHostsServiceFactory,
} from "../src/host-gateway/hosts.service";

function fakeTransport(sessionId: string = "test") {
  return {
    sessionId,
    close: async () => {},
    start: async () => {},
  } as any;
}

describe("HostsService Filter Logic", () => {
  let hostsService: null | Services<HostsService> = null;
  let fakeBackends: null | Services<Backend> = null;
  beforeEach(() => {
    // Setup base mock config
    const mockConfig = {
      servers: {
        unfiltered: {
          url: "http://localhost:3001",
          description: "Test Server 1",
        },
        filtered: {
          url: "http://localhost:3002",
          description: "Test Server 2",
          filters: ["local_*"], // Server-specific filter to remove all tools from this server
        },
      },
      contexts: {
        ctx1: {
          servers: ["unfiltered", "filtered"],
          description: "Test Context",
        },
      },
      endpoints: {
        endpoint1: {
          contexts: ["ctx1"],
          description: "Test Endpoint",
        },
      },
      filters: ["*-global_*", "filtered-normal_*"], // Global filters
    };
    const inputSchema = {
      type: "object" as const,
      properties: {},
      required: [],
    };

    fakeBackends = {
      get: async (serverName: string) => ({
        serverName,
        serverConfig: mockConfig.servers[serverName],
        tools: [
          { name: "normal_tool", inputSchema },
          { name: "local_tool", inputSchema },
          { name: "global_tool", inputSchema },
        ],
        client: {
          callTool: sinon.stub(),
        } as unknown as Client,
        close: async () => {},
      }),
      close: async () => [],
    };

    hostsService = makeHostsServiceFactory(
      () => {
        if (!fakeBackends) throw new Error("fakeBackends is not initialized");
        return fakeBackends;
      },
      {
        get: () => mockConfig,
      }
    );
  });

  afterEach(async () => {
    await hostsService?.close();
    hostsService = null;
    fakeBackends = null;
  });

  it("should apply global filters when server has no specific filters", async () => {
    if (!hostsService) {
      throw new Error("hostsService is not initialized");
    }

    const service = await hostsService.get("endpoint1");

    const sessionId = await service.createSession(fakeTransport());
    const appSession = await service.hostSessions.get(sessionId);

    const toolNames = appSession.tools.map((t: any) => t.name).sort();

    // Should filter out global_* tools but keep others for server1
    expect(toolNames).to.deep.equal(
      ["unfiltered-normal_tool", "unfiltered-local_tool"].sort()
    );
  });
  it("should pass client tool name validation", async () => {
    // Documentation: This test documents a known limitation where our namespaced tool names
    // fail client-side validation due to forward slash usage in tool names
    // Error: "tools.0.FrontendRemoteMcpToolDefinition.name: String should match pattern '^[a-zA-Z0-9_-]*[]{,64}$'"

    if (!hostsService) {
      throw new Error("hostsService is not initialized");
    }

    const service = await hostsService.get("endpoint1");
    const sessionId = await service.createSession(fakeTransport());
    const appSession = await service.hostSessions.get(sessionId);

    // Get the generated tool names from our current implementation
    const toolNames = appSession.tools.map((t: any) => t.name);

    // Client-side validation pattern that tools must match
    const clientValidationPattern = /^[a-zA-Z0-9_-]*[]{0,64}$/;

    for (const toolName of toolNames) {
      expect(toolName).to.match(clientValidationPattern);
    }
  });
  it("should call serversConnections.close() when host session closes", async () => {
    // Documentation: This test ensures that the serversConnections.close() method is called
    // when the host session is closed. This is important for cleaning up resources,
    // such as docker containers, and preventing memory leaks.

    if (!hostsService || !fakeBackends) {
      throw new Error("test is not initialized");
    }

    const service = await hostsService.get("endpoint1");

    const mockTransport = {
      sessionId: "test-session-id",
      close: sinon.stub().resolves(),
      start: sinon.stub().resolves(),
      send: sinon.stub(),
    };
    const closeMethodSpy = sinon.spy(fakeBackends, "close");
    const sessionId = await service.createSession(mockTransport);
    const hostSession = await service.hostSessions.get(sessionId);
    await hostSession.close();

    expect(closeMethodSpy.calledOnce).to.be.true;
  });
});
