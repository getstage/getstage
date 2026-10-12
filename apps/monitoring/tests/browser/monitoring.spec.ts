import { expect, test } from "@playwright/test";
import rollout from "../../src/data/rollout.json" with { type: "json" };

test("overview is honest, responsive and error-free", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const remoteRequests: string[] = [];
  page.on("request", request => {
    if (!request.url().startsWith("http://127.0.0.1:4310") && !request.url().startsWith("data:")) remoteRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Know before your users do." })).toBeVisible();
  await expect(page.getByRole("img", { name: "Stage", exact: true })).toBeVisible();
  const activeNavigation = page.getByRole("link", { name: "Overview", exact: true });
  expect(await activeNavigation.evaluate(element => getComputedStyle(element).backgroundImage)).toContain("rgb(64, 64, 64)");
  await expect(page.getByText("Waiting for the first real run")).toBeVisible();
  await expect(page.getByText("0 / 7 accepted")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("overview.png"), fullPage: true });
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test("audit filters, expansion, empty state and CSV download work", async ({ page }) => {
  await page.goto("/#audit");
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page).toHaveURL(/#audit$/);
  await page.getByRole("button", { name: /^Blocked/ }).click();
  await expect(page.locator("tbody tr")).toHaveCount(rollout.audit.filter(item => item.status === "blocked").length);
  await page.getByRole("button", { name: /^Blocked/ }).click(); // Clear status before searching a now-verified finding.
  await page.getByLabel("Search audit").fill("MON-001");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: /MON-001/ }).click();
  await expect(page.getByText(rollout.audit[0].evidence, { exact: false })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toBe("stage-monitoring-audit.csv");
  await page.getByLabel("Search audit").fill("this-is-not-an-audit-finding");
  await expect(page.getByRole("heading", { name: "No matching findings" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(rollout.audit.length);
});

test("invalid rollout data fails closed instead of showing a dashboard", async ({ page }) => {
  await page.route(/\/src\/data\/rollout\.json/, route => route.fulfill({
    status: 200, contentType: "application/javascript", body: 'export default { invalid: true };',
  }));
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Monitoring configuration is invalid");
  await expect(page.getByText("Waiting for the first real run")).toHaveCount(0);
});

test("plan includes source spec, setup and browser history navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Build plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Observability stack", exact: true })).toBeVisible();
  await page.getByText("Open the complete STA-31 specification", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "STA-31 monitoring: build spec (Grafana, Prometheus, Loki on Railway)" })).toBeVisible();
  await page.getByRole("link", { name: "the last section", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Build plan", exact: true })).toBeAttached();
  await expect(page.getByRole("heading", { name: "Agent prompt", exact: true })).toBeInViewport();
  await page.getByRole("link", { name: "Your setup", exact: true }).click();
  await expect(page.getByRole("heading", { name: rollout.setup[0].title, exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Build plan", exact: true })).toBeVisible();
});
