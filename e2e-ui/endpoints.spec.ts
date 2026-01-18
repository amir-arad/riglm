/**
 * Endpoints CRUD E2E Tests
 *
 * Tests the Endpoints view functionality:
 * - List endpoints
 * - Create endpoint
 * - Edit endpoint
 * - Delete endpoint
 * - Connection URLs
 * - Server selection
 */

import { test, expect, waitForView, fillEndpointForm, confirmDelete, navigateToEndpointForm } from "./fixtures";

test.describe("Endpoints", () => {
  test.beforeEach(async ({ page }) => {
    await waitForView(page, "endpoints");
  });

  test.describe("List", () => {
    test("displays endpoints table", async ({ page }) => {
      await expect(page.locator(".card-title")).toHaveText("Endpoints");

      // Should have Add Endpoint button
      await expect(page.locator(".btn-primary")).toHaveText("+ Add Endpoint");

      // Should have table headers
      const headers = page.locator("th");
      await expect(headers.nth(0)).toHaveText("ID");
      await expect(headers.nth(1)).toHaveText("Servers");
      await expect(headers.nth(2)).toHaveText("Sessions");
      await expect(headers.nth(3)).toHaveText("Actions");
    });

    test("shows existing endpoints from config", async ({ page }) => {
      // Should show test_endpoint from fixture config
      await expect(page.locator("tbody tr")).toHaveCount(1);
      await expect(page.locator("tbody")).toContainText("test_endpoint");
    });

    test("shows connection URLs section", async ({ page }) => {
      await expect(page.locator(".url-list")).toBeVisible();
      await expect(page.locator(".url-list")).toContainText("Connection URLs:");

      // Should show SSE URL for endpoint
      await expect(page.locator(".url-item code")).toContainText("/test_endpoint/sse");
    });

    test("copy URL button works", async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      await page.click('button:has-text("Copy")');

      // Should show success message
      await expect(page.locator(".alert-success")).toContainText("URL copied");
    });

    test("shows empty state when no endpoints", async ({ page, request }) => {
      // Delete endpoint
      await request.delete("/api/endpoints/test_endpoint");

      await page.reload();
      await waitForView(page, "endpoints");

      await expect(page.locator(".empty-state")).toHaveText("No endpoints configured");
    });
  });

  test.describe("Create Endpoint", () => {
    test("navigates to create form", async ({ page }) => {
      await navigateToEndpointForm(page, "new");

      await expect(page).toHaveURL(/#\/endpoints\/new/);
      await expect(page.locator(".card-title")).toHaveText("Add Endpoint");
    });

    test("shows available servers as checkboxes", async ({ page }) => {
      await navigateToEndpointForm(page, "new");

      // Should show server checkboxes
      const checkboxes = page.locator('input[name="servers"]');
      await expect(checkboxes).toHaveCount(2); // test_server and remote_test
    });

    test("creates endpoint successfully", async ({ page }) => {
      await navigateToEndpointForm(page, "new");

      await fillEndpointForm(page, {
        id: "new_endpoint",
        servers: ["test_server"],
        description: "New endpoint",
      });

      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/#\/endpoints/);
      await expect(page.locator(".alert-success")).toHaveText("Endpoint created successfully");
      await expect(page.locator("tbody")).toContainText("new_endpoint");
    });

    test("shows validation error for duplicate ID", async ({ page }) => {
      await navigateToEndpointForm(page, "new");

      await fillEndpointForm(page, {
        id: "test_endpoint", // Already exists
        servers: ["test_server"],
      });

      await page.click('button[type="submit"]');

      await expect(page.locator(".alert-error")).toContainText("already exists");
    });

    test("shows error when no servers selected", async ({ page }) => {
      await navigateToEndpointForm(page, "new");

      await page.fill('input[name="id"]', "no_servers_endpoint");
      // Don't select any servers

      await page.click('button[type="submit"]');

      await expect(page.locator(".alert-error")).toContainText("at least one server");
    });

    test("creates endpoint with filters", async ({ page }) => {
      await navigateToEndpointForm(page, "new");

      await fillEndpointForm(page, {
        id: "filtered_endpoint",
        servers: ["test_server"],
        filters: "*_debug, *_test",
      });

      await page.click('button[type="submit"]');

      await expect(page.locator(".alert-success")).toHaveText("Endpoint created successfully");
    });

    test("shows empty state when no servers available", async ({ page, request }) => {
      // Delete all servers
      await request.delete("/api/servers/test_server");
      await request.delete("/api/servers/remote_test");

      await page.reload();
      await waitForView(page, "endpoints");
      await navigateToEndpointForm(page, "new");

      await expect(page.locator(".empty-state")).toContainText("No servers available");
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });

    test("cancel returns to list", async ({ page }) => {
      await navigateToEndpointForm(page, "new");
      await page.click(".btn-secondary"); // Cancel

      await expect(page).toHaveURL(/#\/endpoints/);
    });
  });

  test.describe("Edit Endpoint", () => {
    test("navigates to edit form", async ({ page }) => {
      await navigateToEndpointForm(page, "edit", "test_endpoint");

      await expect(page).toHaveURL(/#\/endpoints\/edit\/test_endpoint/);
      await expect(page.locator(".card-title")).toHaveText("Edit Endpoint");
    });

    test("shows existing endpoint data", async ({ page }) => {
      await navigateToEndpointForm(page, "edit", "test_endpoint");

      // ID should be readonly
      await expect(page.locator('input[name="id"]')).toHaveAttribute("readonly");
      await expect(page.locator('input[name="id"]')).toHaveValue("test_endpoint");

      // Server should be checked
      await expect(page.locator('input[name="servers"][value="test_server"]')).toBeChecked();
    });

    test("updates endpoint successfully", async ({ page }) => {
      await navigateToEndpointForm(page, "edit", "test_endpoint");

      await page.fill('input[name="description"]', "Updated description");
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/#\/endpoints/);
      await expect(page.locator(".alert-success")).toHaveText("Endpoint updated successfully");
    });

    test("updates server selection", async ({ page }) => {
      await navigateToEndpointForm(page, "edit", "test_endpoint");

      // Add remote_test server
      await page.check('input[name="servers"][value="remote_test"]');
      await page.click('button[type="submit"]');

      await expect(page.locator(".alert-success")).toHaveText("Endpoint updated successfully");

      // Verify both servers are now listed
      await expect(page.locator("tbody")).toContainText("test_server, remote_test");
    });
  });

  test.describe("Delete Endpoint", () => {
    test("shows delete confirmation modal", async ({ page }) => {
      await page.click('button:has-text("Delete")');

      await expect(page.locator(".modal")).toBeVisible();
      await expect(page.locator(".modal-title")).toHaveText("Delete Endpoint");
    });

    test("cancels delete", async ({ page }) => {
      await page.click('button:has-text("Delete")');
      await page.click(".modal .btn-secondary");

      await expect(page.locator(".modal")).not.toBeVisible();
      await expect(page.locator("tbody")).toContainText("test_endpoint");
    });

    test("deletes endpoint successfully", async ({ page }) => {
      await page.click('button:has-text("Delete")');
      await confirmDelete(page);

      await expect(page.locator(".alert-success")).toHaveText("Endpoint deleted successfully");
      await expect(page.locator(".empty-state")).toHaveText("No endpoints configured");
    });
  });
});
