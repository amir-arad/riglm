/**
 * Dashboard E2E Tests
 *
 * Tests the Dashboard view functionality:
 * - Page load and navigation
 * - Status indicator
 * - Stats display
 * - Endpoints table
 */

import { test, expect, waitForView } from "./fixtures";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads dashboard by default", async ({ page }) => {
    // Should load dashboard content (URL may stay at / or redirect to /#/dashboard)
    await page.waitForSelector("main", { state: "visible" });

    // Dashboard nav should be active
    await expect(page.locator('nav a[data-route="dashboard"]')).toHaveClass(/active/);

    // Should show dashboard heading
    await expect(page.locator("h2")).toHaveText("Dashboard");
  });

  test("shows status indicator as online", async ({ page }) => {
    await waitForView(page, "dashboard");

    // Wait for status check to complete
    await page.waitForSelector(".status-dot.online", { timeout: 5000 });

    await expect(page.locator("#status-text")).toHaveText("Online");
  });

  test("displays stats cards", async ({ page }) => {
    await waitForView(page, "dashboard");

    // Should show stat cards
    const statCards = page.locator(".stat-card");
    await expect(statCards).toHaveCount(3);

    // Check labels
    await expect(page.locator(".stat-label").nth(0)).toHaveText("Servers");
    await expect(page.locator(".stat-label").nth(1)).toHaveText("Endpoints");
    await expect(page.locator(".stat-label").nth(2)).toHaveText("Sessions");
  });

  test("displays endpoints table", async ({ page }) => {
    await waitForView(page, "dashboard");

    // Should have endpoints section
    await expect(page.locator(".card-title").first()).toHaveText("Endpoints Status");

    // Should have table with headers
    const headers = page.locator("th");
    await expect(headers.nth(0)).toHaveText("Endpoint");
    await expect(headers.nth(1)).toHaveText("Status");
    await expect(headers.nth(2)).toHaveText("Sessions");
    await expect(headers.nth(3)).toHaveText("Servers");
  });

  test("shows uptime and memory info", async ({ page }) => {
    await waitForView(page, "dashboard");

    // Should show info section
    const infoSection = page.locator(".info-section");
    await expect(infoSection).toContainText("Uptime:");
    await expect(infoSection).toContainText("Memory:");
  });

  test("navigates to servers via nav", async ({ page }) => {
    await waitForView(page, "dashboard");

    await page.click('nav a[data-route="servers"]');

    await expect(page).toHaveURL(/#\/servers/);
    await expect(page.locator('nav a[data-route="servers"]')).toHaveClass(/active/);
  });

  test("navigates to endpoints via nav", async ({ page }) => {
    await waitForView(page, "dashboard");

    await page.click('nav a[data-route="endpoints"]');

    await expect(page).toHaveURL(/#\/endpoints/);
    await expect(page.locator('nav a[data-route="endpoints"]')).toHaveClass(/active/);
  });

  test("navigates to settings via nav", async ({ page }) => {
    await waitForView(page, "dashboard");

    await page.click('nav a[data-route="settings"]');

    await expect(page).toHaveURL(/#\/settings/);
    await expect(page.locator('nav a[data-route="settings"]')).toHaveClass(/active/);
  });
});
