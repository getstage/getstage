import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { WireframesArtifact } from "@stage/data-ops/contracts";
import { buildResultCards, withConfigureScreens } from "./mapWireframesArtifactToTabData";
import { createScreenItem } from "./wireframeScreenList";
import type { ScreenItem } from "@/types/project/wireframesTab";

function screen(id: string, selected: boolean): ScreenItem {
  return {
    id,
    title: id,
    description: `${id} description`,
    kind: "Page",
    priority: "P1",
    required: false,
    selected,
  };
}

function artifact(screens: ScreenItem[]): WireframesArtifact {
  return {
    apiVersion: "v1",
    artifactKind: "wireframesArtifact",
    projectId: "project-1",
    title: "Wireframes",
    wireframeKind: "hifi",
    viewport: "desktop",
    frameWidth: 1440,
    stats: { flowsScreenCount: 2, moodboardPatternCount: 0, totalConfigureScreenCount: 2 },
    configureScreens: screens,
    generatedScreens: [
      {
        id: "home",
        title: "home",
        priority: "P1",
        generatedAtLabel: "6th April, 2025",
        sections: [],
        renderMode: "html-fallback",
      },
    ],
    generatedAt: 1_744_000_000_000,
    generatedAtLabel: "6th April, 2025",
    figmaSymbolUrl: "https://www.figma.com/api/mcp/asset/abc",
  };
}

describe("withConfigureScreens", () => {
  test("writes the curated list back and leaves generated screens alone", () => {
    const current = artifact([screen("home", true), screen("pricing", true)]);
    const added = createScreenItem(
      { title: "Team Settings", description: "Manage members", kind: "Section" },
      current.configureScreens.map((item) => item.id),
    );

    const next = withConfigureScreens(current, [...current.configureScreens, added]);

    assert.deepEqual(
      next.configureScreens.map((item) => item.id),
      ["home", "pricing", "team-settings"],
    );
    assert.equal(next.stats.totalConfigureScreenCount, 3);
    assert.deepEqual(next.generatedScreens, current.generatedScreens);
  });

  test("a deleted screen disappears from the persisted list", () => {
    const current = artifact([screen("home", true), screen("pricing", true)]);

    const next = withConfigureScreens(current, [current.configureScreens[0]]);

    assert.deepEqual(
      next.configureScreens.map((item) => item.id),
      ["home"],
    );
    assert.equal(next.stats.totalConfigureScreenCount, 1);
  });

  test("an incomplete screen is refused instead of corrupting the artifact", () => {
    const current = artifact([screen("home", true)]);

    assert.throws(() =>
      withConfigureScreens(current, [{ ...screen("blank", true), description: "" }]),
    );
  });
});

describe("buildResultCards", () => {
  test("the grid shows generated screens, not the next run's selection", () => {
    const screens = [screen("home", false), screen("pricing", true)];

    const cards = buildResultCards(screens, "label", artifact(screens).generatedScreens, 1);

    assert.deepEqual(
      cards.map((card) => card.id),
      ["home"],
    );
  });

  test("before the first run the grid previews the selection", () => {
    const screens = [screen("home", false), screen("pricing", true)];

    const cards = buildResultCards(screens, "label", [], undefined);

    assert.deepEqual(
      cards.map((card) => card.id),
      ["pricing"],
    );
  });

  test("every generated screen appears — there is no 6-card cutoff", () => {
    const screens = Array.from({ length: 17 }, (_, index) =>
      screen(`screen-${index + 1}`, true),
    );
    const generated = screens.map((item) => ({
      id: item.id,
      title: item.title,
      priority: item.priority,
      generatedAtLabel: "now",
      sections: [],
      renderMode: "react" as const,
    }));

    const cards = buildResultCards(screens, "label", generated, 1);

    assert.equal(cards.length, 17);
    assert.deepEqual(
      cards.map((card) => card.id),
      screens.map((item) => item.id),
    );
  });
});
