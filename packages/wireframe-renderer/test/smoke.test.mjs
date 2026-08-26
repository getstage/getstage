import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "node_modules/tsx/dist/cli.mjs");

function render(baseLibraryId, sectionsLibraryId, tsx, chartsLibraryId = null) {
  const result = spawnSync(
    process.execPath,
    [cli, "--tsconfig", path.join(root, "tsconfig.json"), path.join(root, "src/cli.ts")],
    {
      cwd: root,
      encoding: "utf8",
      input: JSON.stringify({
        version: 1,
        libraries: {
          "@stage/base": baseLibraryId,
          ...(sectionsLibraryId ? { "@stage/sections": sectionsLibraryId } : {}),
          ...(chartsLibraryId ? { "@stage/charts": chartsLibraryId } : {}),
        },
        screens: [{ id: "test-screen", tsx }],
      }),
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const output = JSON.parse(result.stdout);
  // The compiled stylesheet ships once per batch, not per screen; fragments are bare HTML.
  assert.ok(typeof output.css === "string" && output.css.length > 0);
  const screen = output.screens[0];
  assert.equal(screen.error, undefined);
  return screen.html;
}

test("renders shadcn base with Magic UI sections", () => {
  const html = render(
    "shadcn-ui",
    "magic-ui",
    `import { Button } from "@stage/base";
     import { BentoGrid } from "@stage/sections";
     export default function Screen() {
       return <BentoGrid><Button>shadcn + Magic</Button></BentoGrid>;
     }`,
  );
  assert.match(html, /shadcn \+ Magic/);
});

test("renders Kokonut base with Aceternity sections", () => {
  const html = render(
    "kokonut-ui",
    "aceternity-ui",
    `import { GradientButton } from "@stage/base";
     import { BentoGrid, BentoGridItem } from "@stage/sections";
     export default function Screen() {
       return <BentoGrid><BentoGridItem title="Aceternity" description="Real section" header={<GradientButton label="Kokonut" />} /></BentoGrid>;
     }`,
  );
  assert.match(html, /Kokonut/);
  assert.match(html, /Aceternity/);
});

test("renders Origin UI base without sections", () => {
  const html = render(
    "origin-ui",
    null,
    `import { Button, Input } from "@stage/base";
     export default function Screen() {
       return <main><Input aria-label="Name" /><Button>Origin UI</Button></main>;
     }`,
  );
  assert.match(html, /Origin UI/);
});

test("renders Mantine base with its SSR provider and styles", () => {
  const html = render(
    "mantine",
    null,
    `import { Button, Card, Text } from "@stage/base";
     export default function Screen() {
       return <Card><Text>Mantine</Text><Button>Continue</Button></Card>;
     }`,
  );
  assert.match(html, /Mantine/);
  assert.match(html, /mantine-Button-root/);
});


test("renders structured chart legend items", () => {
  const html = render(
    "shadcn-ui",
    null,
    `import { ChartLegend } from "@stage/charts";
     export default function Screen() {
       return <ChartLegend items={[{ label: "Opened", color: "#b87214" }, { label: "Resolved", color: "#2d8a58" }]} />;
     }`,
    "bklit-ui",
  );
  assert.match(html, /Opened/);
  assert.match(html, /Resolved/);
  assert.doesNotMatch(html, /Objects are not valid as a React child/);
});

// Regression (2026-08-11): the lucide gate read only `declare const` names and rejected
// real alias exports (Globe2, CheckCircle2, AlertTriangle) — killing healthy runs.
test("accepts lucide icons that only exist as aliased re-exports", () => {
  const html = render(
    "origin-ui",
    null,
    `import { Globe2, CheckCircle2, AlertTriangle } from "lucide-react";
     import { Button } from "@stage/base";
     export default function Screen() {
       return <main><Globe2 /><CheckCircle2 /><AlertTriangle /><Button>Icons</Button></main>;
     }`,
  );
  assert.match(html, /Icons/);
});

test("rejects invented lucide icons with a clear message", () => {
  const result = spawnSync(
    process.execPath,
    [cli, "--tsconfig", path.join(root, "tsconfig.json"), path.join(root, "src/cli.ts")],
    {
      cwd: root,
      encoding: "utf8",
      input: JSON.stringify({
        version: 1,
        libraries: { "@stage/base": "origin-ui" },
        screens: [
          {
            id: "bad-icons",
            tsx: `import { Chrome, NotARealIcon } from "lucide-react";
                  export default function Screen() { return <main><Chrome /><NotARealIcon /></main>; }`,
          },
        ],
      }),
      timeout: 30_000,
    },
  );
  assert.match(result.stdout + result.stderr, /lucide-react does not export Chrome, NotARealIcon/);
});

test("rejects absolute positioning that overlaps copy", () => {
  const result = spawnSync(
    process.execPath,
    [cli, "--tsconfig", path.join(root, "tsconfig.json"), path.join(root, "src/cli.ts")],
    {
      cwd: root,
      encoding: "utf8",
      input: JSON.stringify({
        version: 1,
        libraries: { "@stage/base": "origin-ui" },
        screens: [
          {
            id: "overlap",
            tsx: `import { Button } from "@stage/base";
                  export default function Screen() {
                    return (
                      <main className="relative">
                        <h1 className="absolute top-10 left-10">Headline</h1>
                        <p className="-mt-8">Body that overlaps the headline</p>
                        <Button>Go</Button>
                      </main>
                    );
                  }`,
          },
        ],
      }),
      timeout: 30_000,
    },
  );
  assert.match(
    result.stdout + result.stderr,
    /must not position copy with absolute\/fixed or negative margins/,
  );
});
