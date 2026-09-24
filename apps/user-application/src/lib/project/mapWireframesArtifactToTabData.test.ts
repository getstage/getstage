import assert from "node:assert/strict";
import test from "node:test";
import type { WireframesArtifact } from "@stage/data-ops/contracts";
import {
  hasDisplayableWireframeResults,
  hasLofiBlocks,
  mapWireframesArtifactToTabData,
} from "./mapWireframesArtifactToTabData";
import type { WireframeGeneratedScreen, WireframesTabData } from "../../types/project/wireframesTab";

const blocks: NonNullable<WireframeGeneratedScreen["sections"]> = [
  {
    id: "hero",
    title: "Hero",
    blocks: [
      {
        id: "hero-1",
        kind: "hero" as const,
        intent: "Introduce the product",
        emphasis: "primary" as const,
      },
    ],
  },
];

function screen(
  id: string,
  output: Pick<WireframeGeneratedScreen, "html" | "sections">,
): WireframeGeneratedScreen {
  return {
    id,
    title: id,
    priority: "P0",
    generatedAtLabel: "now",
    ...output,
  };
}

function tabData(
  kind: WireframesTabData["wireframeKind"],
  generatedScreens: WireframeGeneratedScreen[],
): WireframesTabData {
  return {
    wireframeKind: kind,
    brandSource: kind === "hifi" ? "style-guide" : null,
    styleDirectionId: kind === "hifi" ? "dir-1" : null,
    configureScreens: [],
    stats: {
      flowsScreenCount: 0,
      moodboardPatternCount: 0,
      totalConfigureScreenCount: 0,
    },
    brandKit: null,
    generatedAt: 1,
    generatedAtLabel: "now",
    figmaSymbolUrl: "https://figma.com/",
    generatedScreens,
  };
}

test("hasLofiBlocks ignores html", () => {
  assert.equal(hasLofiBlocks(screen("html-only", { html: "<main>Ready</main>" })), false);
  assert.equal(hasLofiBlocks(screen("blocks", { sections: blocks })), true);
});

test("hasDisplayableWireframeResults keeps production Lo-Fi and hides Hi-Fi", () => {
  assert.equal(
    hasDisplayableWireframeResults(tabData("lofi", [screen("home", { sections: blocks })])),
    true,
  );
  assert.equal(
    hasDisplayableWireframeResults(
      tabData("hifi", [screen("home", { html: "<main>Painted</main>", sections: blocks })]),
    ),
    false,
  );
  assert.equal(
    hasDisplayableWireframeResults(tabData("lofi", [screen("home", { html: "<main>Only</main>" })])),
    false,
  );
  assert.equal(hasDisplayableWireframeResults(undefined), false);
});

test("mapWireframesArtifactToTabData omits html", () => {
  const artifact = {
    apiVersion: "v1",
    artifactKind: "wireframesArtifact",
    projectId: "project-1",
    title: "Product Wireframes",
    wireframeKind: "lofi",
    stats: { flowsScreenCount: 0, moodboardPatternCount: 0, totalConfigureScreenCount: 1 },
    configureScreens: [],
    generatedScreens: [
      {
        id: "home",
        title: "Home",
        priority: "P0",
        generatedAtLabel: "now",
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
        html: "<main>Should not reach the UI</main>",
      },
    ],
    generatedAt: 1,
    generatedAtLabel: "now",
    figmaSymbolUrl: "https://figma.com/",
  } satisfies WireframesArtifact;

  const mapped = mapWireframesArtifactToTabData(artifact);
  assert.equal(mapped.generatedScreens[0]?.html, undefined);
  assert.equal(hasLofiBlocks(mapped.generatedScreens[0]!), true);
});
