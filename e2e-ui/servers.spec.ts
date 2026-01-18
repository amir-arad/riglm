/**
 * Servers CRUD E2E Tests
 *
 * Tests the Servers view functionality:
 * - List servers
 * - Create local server
 * - Create remote server
 * - Edit server
 * - Delete server
 * - Validation errors
 */

import { test, expect, waitForView, fillServerForm, confirmDelete, navigateToServerForm } from "./fixtures";

test.describe("Servers", () => {
  test.beforeEach(async ({ page }) => {
    await waitForView(page, "servers");
  });

  test.describe("List", () => {
    test("displays servers table", async ({ page }) => {
      await expect(page.locator(".card-title")).toHaveText("Servers");

      // Should have Add Server button
      await expect(page.locator(".btn-primary")).toHaveText("+ Add Server");

      // Should have table headers
      const headers = page.locator("th");
      await expect(headers.nth(0)).toHaveText("ID");
      await expect(headers.nth(1)).toHaveText("Type");
      await expect(headers.nth(2)).toHaveText("Description");
      await expect(headers.nth(3)).toHaveText("Actions");
    });

    test("shows existing servers from config", async ({ page }) => {
      // Should show test_server from fixture config
      await expect(page.locator("tbody tr")).toHaveCount(2); // test_server and remote_test

      // Check local server row
      await expect(page.locator("tbody tr").first()).toContainText("test_server");
      await expect(page.locator(".badge-local").first()).toHaveText("local");
    });

    test("shows empty state when no servers", async ({ page, request }) => {
      // Delete all servers first
      await request.delete("/api/servers/test_server");
      await request.delete("/api/servers/remote_test");

      await page.reload();
      await waitForView(page, "servers");

      await expect(page.locator(".empty-state")).toHaveText("No servers configured");
    });
  });

  test.describe("Create Local Server", () => {
    test("navigates to create form", async ({ page }) => {
      await page.click(".btn-primary"); // Add Server button

      await expect(page).toHaveURL(/#\/servers\/new/);
      await expect(page.locator(".card-title")).toHaveText("Add Server");
    });

    test("creates local server successfully", async ({ page }) => {
      await navigateToServerForm(page, "new");

      await fillServerForm(page, {
        id: "new_local_server",
        type: "local",
        command: "node",
        args: "server.js, --port, 3000",
        description: "New local server",
      });

      await page.click('button[type="submit"]');

      // Should redirect to servers list
      await expect(page).toHaveURL(/#\/servers/);

      // Should show success message
      await expect(page.locator(".alert-success")).toHaveText("Server created successfully");

      // Should show new server in list
      await expect(page.locator("tbody")).toContainText("new_local_server");
    });

    test("shows validation error for duplicate ID", async ({ page }) => {
      await navigateToServerForm(page, "new");

      await fillServerForm(page, {
        id: "test_server", // Already exists
        type: "local",
        command: "echo",
      });

      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator(".alert-error")).toContainText("already exists");
    });

    test("shows validation error for invalid ID pattern", async ({ page }) => {
      await navigateToServerForm(page, "new");

      await fillServerForm(page, {
        id: "123-invalid",
        type: "local",
        command: "echo",
      });

      await page.click('button[type="submit"]');

      // HTML5 pattern validation should mark input as invalid (browser native validation)
      const idInput = page.locator('input[name="id"]');
      await expect(idInput).toHaveAttribute("pattern", "^[a-zA-Z_][a-zA-Z0-9_]*$");

      // Check that form was not submitted (still on form page)
      await expect(page).toHaveURL(/#\/servers\/new/);
    });

    test("cancel returns to list", async ({ page }) => {
      await navigateToServerForm(page, "new");
      await page.click(".btn-secondary"); // Cancel button

      await expect(page).toHaveURL(/#\/servers/);
    });
  });

  test.describe("Create Remote Server", () => {
    test("toggles to remote server fields", async ({ page }) => {
      await navigateToServerForm(page, "new");

      // Should show local fields by default
      await expect(page.locator("#local-fields")).not.toHaveClass(/hidden/);
      await expect(page.locator("#remote-fields")).toHaveClass(/hidden/);

      // Toggle to remote
      await page.click('input[name="type"][value="remote"]');

      // Should show remote fields
      await expect(page.locator("#local-fields")).toHaveClass(/hidden/);
      await expect(page.locator("#remote-fields")).not.toHaveClass(/hidden/);
    });

    test("creates remote server successfully", async ({ page }) => {
      await navigateToServerForm(page, "new");

      await fillServerForm(page, {
        id: "new_remote_server",
        type: "remote",
        url: "http://example.com/sse",
        description: "New remote server",
      });

      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/#\/servers/);
      await expect(page.locator(".alert-success")).toHaveText("Server created successfully");
      await expect(page.locator("tbody")).toContainText("new_remote_server");
    });
  });

  test.describe("Edit Server", () => {
    test("navigates to edit form", async ({ page }) => {
      await navigateToServerForm(page, "edit", "test_server");

      await expect(page).toHaveURL(/#\/servers\/edit\/test_server/);
      await expect(page.locator(".card-title")).toHaveText("Edit Server");
    });

    test("shows existing server data", async ({ page }) => {
      await navigateToServerForm(page, "edit", "test_server");

      // ID should be readonly
      await expect(page.locator('input[name="id"]')).toHaveAttribute("readonly");
      await expect(page.locator('input[name="id"]')).toHaveValue("test_server");

      // Should show existing command
      await expect(page.locator('input[name="command"]')).toHaveValue("echo");
    });

    test("updates server successfully", async ({ page }) => {
      await navigateToServerForm(page, "edit", "test_server");

      await page.fill('input[name="description"]', "Updated description");
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/#\/servers/);
      await expect(page.locator(".alert-success")).toHaveText("Server updated successfully");
    });
  });

  test.describe("Delete Server", () => {
    test("shows delete confirmation modal", async ({ page }) => {
      await page.click('button:has-text("Delete")');

      await expect(page.locator(".modal")).toBeVisible();
      await expect(page.locator(".modal-title")).toHaveText("Delete Server");
    });

    test("cancels delete", async ({ page }) => {
      await page.click('button:has-text("Delete")');
      await page.click(".modal .btn-secondary"); // Cancel

      await expect(page.locator(".modal")).not.toBeVisible();
      // Server should still exist
      await expect(page.locator("tbody")).toContainText("test_server");
    });

    test("deletes server with warning when used by endpoint", async ({ page }) => {
      await page.click('button:has-text("Delete")');
      await confirmDelete(page);

      // Should show warning about endpoint
      await expect(page.locator(".alert-warning")).toContainText("endpoint(s)");
    });

    test("deletes unused server without warning", async ({ page, request }) => {
      // First create a server not used by any endpoint
      await request.post("/api/servers", {
        data: { id: "unused_server", type: "local", command: "echo" },
      });

      await page.reload();
      await waitForView(page, "servers");

      // Find and click delete for unused_server
      const row = page.locator("tr", { hasText: "unused_server" });
      await row.locator('button:has-text("Delete")').click();
      await confirmDelete(page);

      await expect(page.locator(".alert-success")).toHaveText("Server deleted successfully");
    });
  });
});
