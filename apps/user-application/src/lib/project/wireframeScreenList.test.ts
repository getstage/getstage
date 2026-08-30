import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  applyScreenDraft,
  buildWireframeRunSource,
  createScreenItem,
  mapFlowScreensToScreenItems,
  resolveRunScreenIds,
  screenIdFromTitle,
  screenIdsFromRunSource,
} from "./wireframeScreenList";
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

describe("run scoping", () => {
  test("a run covers only the ticked screens", () => {
    const screens = [
      screen("home", true),
      screen("pricing", false),
      screen("dashboard", true),
      screen("settings", false),
    ];

    const screenIds = resolveRunScreenIds(screens);

    assert.deepEqual(screenIds, ["home", "dashboard"]);
    assert.equal(
      buildWireframeRunSource("hifi", "style-guide", "dir-1", screenIds),
      "kind:hifi,brand:style-guide,style-direction:dir-1,screens:home;dashboard",
    );
  });

  test("an explicit id list wins over the ticks", () => {
    const screens = [screen("home", true), screen("pricing", true)];

    assert.deepEqual(resolveRunScreenIds(screens, ["pricing"]), ["pricing"]);
  });

  test("nothing ticked yields no ids, so the caller can refuse the run", () => {
    assert.deepEqual(resolveRunScreenIds([screen("home", false)]), []);
    assert.equal(buildWireframeRunSource("lofi", null, null, []), "kind:lofi");
  });

  test("the screens token round-trips", () => {
    const source = buildWireframeRunSource("hifi", "brand-kit", null, ["home", "dashboard"]);

    assert.deepEqual(screenIdsFromRunSource(source), ["home", "dashboard"]);
    assert.equal(screenIdsFromRunSource("kind:lofi"), null);
    assert.equal(screenIdsFromRunSource(null), null);
  });

  test("Nebius is a wireframes-only source token", () => {
    assert.equal(
      buildWireframeRunSource("hifi", "style-guide", "dir-1", ["home"], true),
      "kind:hifi,brand:style-guide,style-direction:dir-1,gen:nebius,screens:home",
    );
  });
});

describe("screen ids", () => {
  test("a title becomes a slug", () => {
    assert.equal(screenIdFromTitle("Team Settings & Billing", []), "team-settings-billing");
  });

  test("a title without slug characters still yields an id", () => {
    assert.equal(screenIdFromTitle("!!!", []), "screen");
    assert.equal(screenIdFromTitle("!!!", ["screen"]), "screen-2");
  });

  test("a colliding title gets the next free suffix", () => {
    assert.equal(screenIdFromTitle("Home", ["home"]), "home-2");
    assert.equal(screenIdFromTitle("Home", ["home", "home-2", "home-3"]), "home-4");
  });

  test("added screens never collide with the existing list", () => {
    const existing = [screen("home", true)];
    const added = createScreenItem(
      { title: "Home", description: "Second home variant", kind: "Section" },
      existing.map((item) => item.id),
    );

    assert.equal(added.id, "home-2");
    assert.equal(added.kind, "Section");
    assert.equal(added.selected, true);
    assert.equal(added.required, false);
    assert.equal(new Set([...existing, added].map((item) => item.id)).size, 2);
  });

  test("adding twice in a row keeps both ids distinct", () => {
    let screens = [screen("home", true)];
    const first = createScreenItem(
      { title: "Home", description: "Variant one", kind: "Page" },
      screens.map((item) => item.id),
    );
    screens = [...screens, first];
    const second = createScreenItem(
      { title: "Home", description: "Variant two", kind: "Page" },
      screens.map((item) => item.id),
    );

    assert.deepEqual([first.id, second.id], ["home-2", "home-3"]);
  });

  test("editing keeps the id so the generated screen stays addressable", () => {
    const screens = [screen("home", true), screen("pricing", true)];
    const edited = applyScreenDraft(screens, "home", {
      title: "  Landing  ",
      description: "  Hero plus proof  ",
      kind: "Section",
    });

    assert.deepEqual(edited[0], {
      id: "home",
      title: "Landing",
      description: "Hero plus proof",
      kind: "Section",
      priority: "P1",
      required: false,
      selected: true,
    });
    assert.deepEqual(edited[1], screens[1]);
  });
});

describe("flows-derived screens", () => {
  test("flows screens become a selected, priority-ranked list", () => {
    const items = mapFlowScreensToScreenItems([
      { id: "home", title: "Home", description: "Entry point", flowCount: 4, keyElements: [] },
      { id: "cart", title: "Cart", description: "Review order", flowCount: 2, keyElements: [] },
      { id: "help", title: "Help", description: "Support", flowCount: 1, keyElements: [] },
    ]);

    assert.deepEqual(
      items.map((item) => [item.id, item.priority, item.kind, item.selected, item.required]),
      [
        ["home", "P0", "Page", true, false],
        ["cart", "P1", "Page", true, false],
        ["help", "P2", "Page", true, false],
      ],
    );
  });

  test("a screen without a description still gets one the artifact can store", () => {
    const [item] = mapFlowScreensToScreenItems([
      { id: "home", title: "Home", description: "   ", flowCount: 3, keyElements: [] },
    ]);

    assert.equal(item.description, "Screen identified in Flows · appears in 3 flows");
  });
});
