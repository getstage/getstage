import assert from "node:assert/strict";
import test from "node:test";
import {
  buildResultCards,
} from "@/lib/project/mapWireframesArtifactToTabData";
import type { ScreenItem, WireframeGeneratedScreen } from "@/types/project/wireframesTab";

const configuredScreen = (id: string): ScreenItem => ({
  id,
  title: id,
  description: "",
  kind: "Page",
  priority: "P0",
  required: true,
  selected: true,
});

const generatedScreen = (
  id: string,
  output: Pick<WireframeGeneratedScreen, "html" | "sections">,
): WireframeGeneratedScreen => ({
  id,
  title: id,
  priority: "P0",
  generatedAtLabel: "now",
  ...output,
});

test("does not present empty generated records as wireframe results", () => {
  const empty = generatedScreen("empty", {});
  const htmlOnly = generatedScreen("html-only", { html: "<main>Ready</main>" });
  const withBlocks = generatedScreen("ready", {
    sections: [
      {
        id: "hero",
        title: "Hero",
        blocks: [
          {
            id: "hero-1",
            kind: "hero",
            intent: "Introduce the product",
            emphasis: "primary",
          },
        ],
      },
    ],
  });

  assert.deepEqual(
    buildResultCards(
      [configuredScreen("empty"), configuredScreen("html-only"), configuredScreen("ready")],
      "now",
      3,
      [empty, htmlOnly, withBlocks],
    ).map((screen) => screen.id),
    ["ready"],
  );
});

test("shows generated Lo-Fi screens even when they are missing from configure state", () => {
  const withBlocks = generatedScreen("checkout", {
    sections: [
      {
        id: "hero",
        title: "Hero",
        blocks: [
          {
            id: "hero-1",
            kind: "hero",
            intent: "Introduce checkout",
            emphasis: "primary",
          },
        ],
      },
    ],
  });

  assert.deepEqual(
    buildResultCards([], "now", 6, [withBlocks]).map((screen) => screen.id),
    ["checkout"],
  );
});
