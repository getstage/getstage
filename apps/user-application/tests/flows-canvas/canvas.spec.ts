import { expect, test, type Page } from "@playwright/test";

const node = (page: Page, label: string) => page.locator(".react-flow__node-step").filter({ hasText: new RegExp(`^${label}$`) });
async function connect(page: Page, source: string, target: string) {
  await page.getByRole("button", { name: "Connect nodes", exact: true }).click();
  await node(page, source).click();
  await node(page, target).click();
  await expect(page.getByRole("button", { name: "Connect nodes", exact: true })).toBeEnabled();
}

let errors: string[];
test.beforeEach(async ({ page, context }) => {
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  context.on("page", (other) => other.on("pageerror", (error) => errors.push(error.message)));
  await page.goto("/");
  await expect(page.locator(".react-flow__node-step")).toHaveCount(4);
});

test.afterEach(() => expect(errors).toEqual([]));

test("canvas fills its workspace and keeps the approved controls visible with desktop styles", async ({ page }, testInfo) => {
  const canvas = page.getByLabel("Sitemap canvas", { exact: true });
  await expect(page.locator(".flows-canvas-board-label")).toHaveText("SITEMAP");
  await expect(page.getByRole("toolbar", { name: "Diagram tools" }).getByRole("button")).toHaveCount(3);
  await expect(page.getByRole("group", { name: "Zoom and chat" }).getByRole("button")).toHaveCount(3);
  const bounds = await canvas.boundingBox();
  const workspace = await page.locator(".flows-canvas-workspace").boundingBox();
  if (!bounds || !workspace) throw new Error("Missing workspace");
  expect(Math.abs(bounds.height - workspace.height)).toBeLessThan(1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(1000);
  for (const selector of [".flows-canvas-toolbar", ".flows-canvas-controls"]) {
    const controls = await page.locator(selector).boundingBox();
    if (!controls) throw new Error("Missing canvas controls");
    expect(controls.y).toBeGreaterThan(bounds.y);
    expect(controls.y + controls.height).toBeLessThan(bounds.y + bounds.height);
  }
  await expect(page.locator(".flows-canvas-toolbar .is-active")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".react-flow__edge-path").first()).toHaveCSS("stroke", "rgb(97, 85, 255)");
  await page.screenshot({ path: testInfo.outputPath("canvas-desktop.png") });
});

test("category mapping, click-to-connect, deduplication, removal and reload", async ({ page }) => {
  await expect(page.getByLabel("Sitemap canvas")).toBeVisible();
  await connect(page, "Features", "Pricing");
  await expect(page.locator(".react-flow__edge")).toHaveCount(3);
  await connect(page, "Features", "Pricing");
  await expect(page.locator(".react-flow__edge")).toHaveCount(3);
  await page.reload();
  await expect(page.locator(".react-flow__edge")).toHaveCount(3);
  const point = await page.locator(".react-flow__edge-interaction").last().evaluate((element) => {
    const path = element as SVGPathElement;
    const matrix = path.getScreenCTM();
    if (!matrix) throw new Error("Missing path transform");
    const point = path.getPointAtLength(path.getTotalLength() / 2).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  });
  await page.mouse.click(point.x, point.y);
  await page.getByRole("button", { name: "Remove selected connection" }).click();
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
  await page.getByRole("button", { name: "Switch category" }).click();
  await expect(page.getByLabel("Flows canvas")).toBeVisible();
});

test("drag and keyboard moves save only committed positions", async ({ page }) => {
  const home = node(page, "Home");
  const box = await home.boundingBox();
  if (!box) throw new Error("Home not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 35, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.__canvasEdits.length)).toBe(1);
  const first = await page.evaluate(() => window.__canvasEdits[0]);
  expect(first.type).toBe("move");
  await home.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => page.evaluate(() => window.__canvasEdits.length)).toBe(2);
});

test("Escape cancels connection; failed saves recover without phantom edges", async ({ page }) => {
  await page.getByRole("button", { name: "Connect nodes", exact: true }).click();
  await node(page, "Home").click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Select nodes", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Toggle failed saves" }).click();
  await connect(page, "Features", "Pricing");
  await expect(page.getByRole("alert")).toHaveText("Simulated save failure");
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
  await page.getByRole("button", { name: "Toggle failed saves" }).click();
  await connect(page, "Features", "Pricing");
  await expect(page.locator(".react-flow__edge")).toHaveCount(3);
});

test("keyboard connect supports Enter without pointer clicks", async ({ page }) => {
  await page.getByRole("button", { name: "Connect nodes", exact: true }).click();
  await node(page, "Home").focus();
  await page.keyboard.press("Enter");
  await node(page, "Pricing").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".react-flow__edge")).toHaveCount(3);
});

test("keyboard edge selection enables connection removal without pointer gestures", async ({ page }) => {
  const edge = page.locator(".react-flow__edge").first();
  await edge.focus();
  await page.keyboard.press("Enter");
  const remove = page.getByRole("button", { name: "Remove selected connection" });
  await expect(remove).toBeVisible();
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});

test("conflicting remote movement restores the saved position rather than overwriting it", async ({ page }) => {
  const home = node(page, "Home");
  const box = await home.boundingBox();
  if (!box) throw new Error("Home not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 35, { steps: 8 });
  await page.getByRole("button", { name: "Simulate remote move" }).evaluate((button: HTMLButtonElement) => button.click());
  await page.mouse.up();
  await expect(page.getByRole("alert")).toContainText("Someone moved this node");
  await expect(home).toHaveAttribute("style", /translate\(415px, 145px\)/);
  expect(await page.evaluate(() => window.__canvasEdits.length)).toBe(0);
});

test("zoom, chat request and add entry work; narrow-screen controls do not overlap", async ({ page }) => {
  const viewport = page.locator(".react-flow__viewport");
  const before = await viewport.getAttribute("style");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(viewport).not.toHaveAttribute("style", before ?? "");
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await page.getByRole("button", { name: "Open Stage chat" }).click();
  await expect.poll(() => page.evaluate(() => window.__chatRequests)).toBe(1);
  await page.getByRole("button", { name: "Add diagram" }).click();
  await expect(page.getByText("Add diagram requested")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 850 });
  const toolbar = await page.locator(".flows-canvas-toolbar").boundingBox();
  const controls = await page.locator(".flows-canvas-controls").boundingBox();
  if (!toolbar || !controls) throw new Error("Missing controls");
  expect(toolbar.x + toolbar.width).toBeLessThanOrEqual(controls.x);
  for (const label of ["Select nodes", "Connect nodes", "Add diagram", "Zoom in", "Zoom out", "Open Stage chat"]) {
    const bounds = await page.getByRole("button", { name: label, exact: true }).boundingBox();
    if (!bounds) throw new Error(`Missing ${label}`);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  }
});

test("double-click opens the linked screen card without zooming or saving", async ({ page }, testInfo) => {
  const viewport = await page.locator(".react-flow__viewport").getAttribute("style");
  await node(page, "Features").dblclick();
  const dialog = page.getByRole("dialog", { name: "Feature overview", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Appears in 1 flow", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("listitem")).toHaveText(["Filterable feature list", "Feature comparison"]);
  await expect(page.locator(".flows-screen-overlay")).toHaveCSS("backdrop-filter", "blur(4px)");
  await expect(dialog).toHaveCSS("max-width", "512px");
  const bounds = await dialog.boundingBox();
  const size = page.viewportSize();
  if (!bounds || !size) throw new Error("Missing dialog geometry");
  expect(Math.abs(bounds.x + bounds.width / 2 - size.width / 2)).toBeLessThan(1);
  expect(Math.abs(bounds.y + bounds.height / 2 - size.height / 2)).toBeLessThan(1);
  await expect(page.locator(".react-flow__viewport")).toHaveAttribute("style", viewport ?? "");
  expect(await page.evaluate(() => [window.__screenSaves, window.__canvasEdits.length])).toEqual([0, 0]);
  await page.screenshot({ path: testInfo.outputPath("screen-details-read.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(node(page, "Features")).toBeFocused();
});

test("screen editing cancels locally, saves once and persists without altering the graph", async ({ page }, testInfo) => {
  await node(page, "Home").focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Homepage", exact: true });
  await dialog.getByRole("button", { name: "Edit screen elements" }).click();
  await dialog.getByRole("textbox", { name: "Key element 1", exact: true }).fill("Cancelled draft");
  await expect(dialog.getByRole("button", { name: "Save Changes" })).toHaveCSS("color", "rgb(255, 255, 255)");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog.getByRole("listitem").first()).toHaveText("Sticky header with Primary CTA");
  expect(await page.evaluate(() => window.__screenSaves)).toBe(0);
  await dialog.getByRole("button", { name: "Edit screen elements" }).click();
  await dialog.getByRole("textbox", { name: "Key element 1", exact: true }).fill("Saved primary navigation");
  await page.screenshot({ path: testInfo.outputPath("screen-details-edit.png") });
  await dialog.getByRole("button", { name: "Save Changes" }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(dialog.getByRole("listitem").first()).toHaveText("Saved primary navigation");
  expect(await page.evaluate(() => window.__screenSaves)).toBe(1);
  expect(await page.evaluate(() => window.__canvasEdits.length)).toBe(0);
  await page.keyboard.press("Escape");
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
  await page.reload();
  await node(page, "Home").dblclick();
  await expect(page.getByRole("dialog").getByRole("listitem").first()).toHaveText("Saved primary navigation");
  const stored = await page.evaluate(() => {
    const json = localStorage.getItem("sta56.test.canvas");
    if (!json) throw new Error("Missing saved fixture");
    return JSON.parse(json).artifact;
  });
  expect(stored.flows[0].steps.map((step: { id: string }) => step.id)).toEqual(["home", "about", "features", "pricing"]);
  expect(stored.flows[0].steps[0].screenId).toBe("screen-home");
  expect(stored.canvas.boards[0].positions[0]).toEqual({ stepId: "home", x: 350, y: 80 });
  expect(stored.screens[1].keyElements).toEqual(["Filterable feature list", "Feature comparison"]);
});

test("unlinked and missing screens show an honest empty card, never fabricated elements", async ({ page }) => {
  for (const label of ["About", "Pricing"]) {
    await node(page, label).dblclick();
    const dialog = page.getByRole("dialog", { name: label, exact: true });
    await expect(dialog.getByText("No saved screen is linked to this node.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Edit screen elements" })).toHaveCount(0);
    await expect(dialog.getByRole("listitem")).toHaveCount(0);
    await page.mouse.click(12, 12);
    await expect(dialog).toHaveCount(0);
  }
  expect(await page.evaluate(() => [window.__screenSaves, window.__canvasEdits.length])).toEqual([0, 0]);
});

test("failed screen saves retain the draft and show an error without changing saved elements", async ({ page }) => {
  await page.getByRole("button", { name: "Toggle failed saves" }).click();
  await node(page, "Home").dblclick();
  const dialog = page.getByRole("dialog", { name: "Homepage", exact: true });
  await dialog.getByRole("button", { name: "Edit screen elements" }).click();
  await dialog.getByRole("textbox", { name: "Key element 1", exact: true }).fill("Recoverable draft");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Simulated screen save failure");
  await expect(dialog.getByRole("textbox", { name: "Key element 1", exact: true })).toHaveValue("Recoverable draft");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog.getByRole("listitem").first()).toHaveText("Sticky header with Primary CTA");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Toggle failed saves" }).click();
  await node(page, "Home").dblclick();
  await dialog.getByRole("button", { name: "Edit screen elements" }).click();
  await dialog.getByRole("textbox", { name: "Key element 1", exact: true }).fill("Recovered save");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog.getByRole("listitem").first()).toHaveText("Recovered save");
});

test("remote movement preserves the screen draft; same-screen edits reject stale saves", async ({ page, context }) => {
  const second = await context.newPage();
  await second.goto("/");
  await node(page, "Home").dblclick();
  const dialog = page.getByRole("dialog", { name: "Homepage", exact: true });
  await dialog.getByRole("button", { name: "Edit screen elements" }).click();
  const input = dialog.getByRole("textbox", { name: "Key element 1", exact: true });
  await input.fill("Local unsaved draft");
  await second.getByRole("button", { name: "Simulate remote move" }).click();
  await expect(node(page, "Home")).toHaveAttribute("style", /translate\(415px, 145px\)/);
  await expect(input).toHaveValue("Local unsaved draft");
  await node(second, "Home").dblclick();
  await second.getByRole("button", { name: "Edit screen elements" }).click();
  await second.getByRole("textbox", { name: "Key element 1", exact: true }).fill("Remote saved element");
  await second.getByRole("button", { name: "Save Changes" }).click();
  await expect(second.getByRole("dialog").getByRole("listitem").first()).toHaveText("Remote saved element");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Screen elements changed elsewhere");
  await expect(input).toHaveValue("Local unsaved draft");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog.getByRole("listitem").first()).toHaveText("Remote saved element");
  await second.close();
});

test("saving one screen preserves another client's screen edit and diagram movement", async ({ page, context }) => {
  const second = await context.newPage();
  await second.goto("/");
  await node(page, "Home").dblclick();
  await page.getByRole("button", { name: "Edit screen elements" }).click();
  await page.getByRole("textbox", { name: "Key element 1", exact: true }).fill("Local home element");
  await second.getByRole("button", { name: "Simulate remote move" }).click();
  await node(second, "Features").dblclick();
  await second.getByRole("button", { name: "Edit screen elements" }).click();
  await second.getByRole("textbox", { name: "Key element 1", exact: true }).fill("Remote feature element");
  await second.getByRole("button", { name: "Save Changes" }).click();
  await expect(second.getByRole("dialog").getByRole("listitem").first()).toHaveText("Remote feature element");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("dialog").getByRole("listitem").first()).toHaveText("Local home element");
  await second.keyboard.press("Escape");
  await node(second, "Home").dblclick();
  await expect(second.getByRole("dialog").getByRole("listitem").first()).toHaveText("Local home element");
  await page.keyboard.press("Escape");
  await expect(node(page, "Home")).toHaveAttribute("style", /translate\(415px, 145px\)/);
  await node(page, "Features").dblclick();
  await expect(page.getByRole("dialog").getByRole("listitem").first()).toHaveText("Remote feature element");
  await second.close();
});

test("paused editing remains readable and the popover fits a narrow viewport", async ({ page }) => {
  await page.getByRole("button", { name: "Toggle editing paused" }).click();
  await page.setViewportSize({ width: 390, height: 500 });
  await node(page, "Home").dblclick();
  const dialog = page.getByRole("dialog", { name: "Homepage", exact: true });
  await expect(dialog.getByRole("button", { name: "Edit screen elements" })).toBeDisabled();
  await expect(dialog.getByRole("listitem")).toHaveCount(8);
  const bounds = await dialog.boundingBox();
  if (!bounds) throw new Error("Missing dialog");
  expect(bounds.x).toBeGreaterThanOrEqual(16);
  expect(bounds.y).toBeGreaterThanOrEqual(16);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(374);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(484);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => [window.__screenSaves, window.__canvasEdits.length])).toEqual([0, 0]);
});

test("remote edits preserve viewport and reach a second client", async ({ page, context }) => {
  const second = await context.newPage();
  await second.goto("/");
  await expect(node(second, "Home")).toBeVisible();
  const viewport = await page.locator(".react-flow__viewport").getAttribute("style");
  await connect(second, "Features", "Pricing");
  await expect(page.locator(".react-flow__edge")).toHaveCount(3);
  await expect(page.locator(".react-flow__viewport")).toHaveAttribute("style", viewport ?? "");
  const original = await node(page, "Home").getAttribute("style");
  await page.getByRole("button", { name: "Simulate remote move" }).click();
  await expect(node(page, "Home")).not.toHaveAttribute("style", original ?? "");
  await expect.poll(() => node(second, "Home").getAttribute("style")).toBe(await node(page, "Home").getAttribute("style"));
  await second.close();
});
