import assert from "node:assert/strict";
import test from "node:test";
import {
  buildResultCards,
  hasRenderableWireframeOutput,
  type WireframeResultCard,
} from "@/lib/project/mapWireframesArtifactToTabData";
import type { ScreenItem, WireframeGeneratedScreen } from "@/types/project/wireframesTab";
import { hasLofiPreview } from "./ResultsGrid";

type Blocks = NonNullable<WireframeResultCard["sections"]>[number]["blocks"];

const card = (blocks: Blocks = []) =>
  ({ sections: [{ blocks }] }) as WireframeResultCard;

test("keeps Lo-Fi available when Hi-Fi HTML is missing but blocks remain", () => {
  assert.equal(
    hasLofiPreview([
      card([
        {
          id: "hero-1",
          kind: "hero",
          intent: "Introduce the product",
          emphasis: "primary",
        },
      ]),
    ]),
    true,
  );
  assert.equal(hasLofiPreview([card()]), false);
});

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
  const ready = generatedScreen("ready", { html: "<main>Ready</main>" });

  assert.equal(hasRenderableWireframeOutput(empty), false);
  assert.equal(hasRenderableWireframeOutput(ready), true);
  assert.deepEqual(
    buildResultCards(
      [configuredScreen("empty"), configuredScreen("ready")],
      "now",
      1,
      [empty, ready],
    ).map((screen) => screen.id),
    ["ready"],
  );
});
