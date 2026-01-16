/**
 * Settings E2E Tests
 *
 * Tests the Settings view functionality:
 * - Global filters display and edit
 * - Config reload
 * - About section with uptime
 */

import { test, expect, waitForView } from "./fixtures";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await waitForView(page, "settings");
  });

  test.describe("Global Filters", () => {
    test("displays global filters card", async ({ page }) => {
      await expect(page.locator(".card-title").first()).toHaveText("Global Filters");
      await expect(page.locator("p").first()).toContainText("filter patterns apply to ALL servers");
    });

    test("shows existing filters from config", async ({ page }) => {
      // Should show the filters from test-config.json5
      await expect(page.locator('input[name="filters"]')).toHaveValue("*_internal");
    });

    test("saves updated filters successfully", async ({ page }) => {
      await page.fill('input[name="filters"]', "*_debug, *_test, *_internal");
      await page.click('button[type="submit"]');

      await expect(page.locator(".alert-success")).toHaveText("Settings saved successfully");

      // Verify the filters were saved
      await page.reload();
      await waitForView(page, "settings");
      await expect(page.locator('input[name="filters"]')).toHaveValue("*_debug, *_test, *_internal");
    });

    test("clears filters when empty", async ({ page }) => {
      await page.fill('input[name="filters"]', "");
      await page.click('button[type="submit"]');

      await expect(page.locator(".alert-success")).toHaveText("Settings saved successfully");

      await page.reload();
      await waitForView(page, "settings");
      await expect(page.locator('input[name="filters"]')).toHaveValue("");
    });
  });

  test.describe("Configuration File", () => {
    test("displays config reload card", async ({ page }) => {
      await expect(page.locator(".card-title").nth(1)).toHaveText("Configuration File");
      await expect(page.locator('button:has-text("Reload Configuration")')).toBeVisible();
    });

    test("reloads configuration successfully", async ({ page }) => {
      await page.click('button:has-text("Reload Configuration")');

      await expect(page.locator(".alert-success")).toHaveText("Configuration reloaded successfully");
    });
  });

  test.describe("About Section", () => {
    test("displays about card", async ({ page }) => {
      await expect(page.locator(".card-title").nth(2)).toHaveText("About");
      await expect(page.locator(".card").nth(2)).toContainText("ABC Extension Manager");
    });

    test("shows uptime when navigating directly to settings", async ({ page }) => {
      // This tests the bug: uptime should show even when directly navigating to settings
      // First, go to settings directly (not via dashboard)
      await page.goto("/#/settings");
      await page.waitForSelector("main", { state: "visible" });

      // Wait for status to be fetched
      await page.waitForTimeout(500);

      // Should show uptime
      await expect(page.locator(".card").nth(2)).toContainText("Uptime:");
    });

    test("shows uptime after visiting dashboard first", async ({ page }) => {
      // First visit dashboard to populate State.status
      await waitForView(page, "dashboard");
      await waitForView(page, "settings");

      // Should show uptime
      await expect(page.locator(".card").nth(2)).toContainText("Uptime:");
    });
  });
});
