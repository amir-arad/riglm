/**
 * Playwright Test Fixtures for Frontend E2E Tests
 */

import { test as base, expect, Page } from "@playwright/test";

/**
 * Initial test config - reset to this before each test
 */
const INITIAL_CONFIG = {
  servers: {
    test_server: {
      command: "echo",
      args: ["hello"],
      description: "Test server for E2E",
    },
    remote_test: {
      url: "http://localhost:9999/sse",
      description: "Remote test server",
    },
  },
  endpoints: {
    test_endpoint: {
      servers: ["test_server"],
      description: "Test endpoint",
    },
  },
  filters: ["*_internal"],
};

/**
 * Extended test fixtures for UI testing
 */
export const test = base.extend<{
  resetConfig: void;
}>({
  // Reset config before each test via API
  resetConfig: [
    async ({ request }, use) => {
      // First, delete all existing servers and endpoints to start fresh
      const { servers: existingServers } = await (
        await request.get("/api/servers")
      ).json();
      const { endpoints: existingEndpoints } = await (
        await request.get("/api/endpoints")
      ).json();

      // Delete all endpoints first (they reference servers)
      for (const ep of existingEndpoints as { id: string }[]) {
        await request.delete(`/api/endpoints/${ep.id}`);
      }

      // Delete all servers
      for (const srv of existingServers as { id: string }[]) {
        await request.delete(`/api/servers/${srv.id}`);
      }

      // Recreate initial config
      for (const [id, server] of Object.entries(INITIAL_CONFIG.servers)) {
        const isLocal = "command" in server;
        await request.post("/api/servers", {
          data: {
            id,
            type: isLocal ? "local" : "remote",
            ...server,
          },
        });
      }

      for (const [id, endpoint] of Object.entries(INITIAL_CONFIG.endpoints)) {
        await request.post("/api/endpoints", {
          data: { id, ...endpoint },
        });
      }

      // Update global filters
      await request.put("/api/settings", {
        data: { filters: INITIAL_CONFIG.filters },
      });

      await use();
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Helper to wait for navigation and content load
 */
export async function waitForView(page: Page, route: string): Promise<void> {
  await page.goto(`/#/${route}`);
  await page.waitForSelector("main", { state: "visible" });
  // Wait for any loading to complete
  await page.waitForTimeout(100);
}

/**
 * Helper to get alert message text
 */
export async function getAlertText(page: Page): Promise<string | null> {
  const alert = page.locator(".alert");
  if (await alert.isVisible()) {
    return alert.textContent();
  }
  return null;
}

/**
 * Helper to navigate to server form (new or edit)
 */
export async function navigateToServerForm(
  page: Page,
  type: "new" | "edit",
  serverId?: string
): Promise<void> {
  if (type === "new") {
    // Set hash directly to trigger router
    await page.evaluate(() => {
      window.location.hash = "/servers/new";
    });
  } else if (serverId) {
    await page.evaluate((id) => {
      window.location.hash = `/servers/edit/${id}`;
    }, serverId);
  }
  // Wait for form to appear
  await page.waitForSelector("#server-form", { state: "visible" });
}

/**
 * Helper to navigate to endpoint form (new or edit)
 */
export async function navigateToEndpointForm(
  page: Page,
  type: "new" | "edit",
  endpointId?: string
): Promise<void> {
  if (type === "new") {
    // Set hash directly to trigger router
    await page.evaluate(() => {
      window.location.hash = "/endpoints/new";
    });
  } else if (endpointId) {
    await page.evaluate((id) => {
      window.location.hash = `/endpoints/edit/${id}`;
    }, endpointId);
  }
  // Wait for form to appear
  await page.waitForSelector("#endpoint-form", { state: "visible" });
}

/**
 * Helper to fill server form
 */
export async function fillServerForm(
  page: Page,
  data: {
    id?: string;
    type?: "local" | "remote";
    command?: string;
    args?: string;
    url?: string;
    description?: string;
    filters?: string;
  }
): Promise<void> {
  if (data.id) {
    await page.fill('input[name="id"]', data.id);
  }
  if (data.type) {
    await page.click(`input[name="type"][value="${data.type}"]`);
  }
  if (data.command) {
    await page.fill('input[name="command"]', data.command);
  }
  if (data.args) {
    await page.fill('input[name="args"]', data.args);
  }
  if (data.url) {
    await page.fill('input[name="url"]', data.url);
  }
  if (data.description) {
    await page.fill('input[name="description"]', data.description);
  }
  if (data.filters) {
    await page.fill('input[name="filters"]', data.filters);
  }
}

/**
 * Helper to fill endpoint form
 */
export async function fillEndpointForm(
  page: Page,
  data: {
    id?: string;
    servers?: string[];
    description?: string;
    filters?: string;
  }
): Promise<void> {
  if (data.id) {
    await page.fill('input[name="id"]', data.id);
  }
  if (data.servers) {
    // Uncheck all first
    const checkboxes = page.locator('input[name="servers"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      if (await checkboxes.nth(i).isChecked()) {
        await checkboxes.nth(i).uncheck();
      }
    }
    // Check the specified servers
    for (const server of data.servers) {
      await page.check(`input[name="servers"][value="${server}"]`);
    }
  }
  if (data.description) {
    await page.fill('input[name="description"]', data.description);
  }
  if (data.filters) {
    await page.fill('input[name="filters"]', data.filters);
  }
}

/**
 * Helper to confirm and execute delete via modal
 */
export async function confirmDelete(page: Page): Promise<void> {
  await page.click(".modal .btn-danger");
  await page.waitForSelector(".modal", { state: "hidden" });
}

/**
 * Helper to cancel delete modal
 */
export async function cancelDelete(page: Page): Promise<void> {
  await page.click(".modal .btn-secondary");
  await page.waitForSelector(".modal", { state: "hidden" });
}
