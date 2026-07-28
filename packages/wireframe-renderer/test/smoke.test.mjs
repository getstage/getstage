import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "node_modules/tsx/dist/cli.mjs");

function render(baseLibraryId, sectionsLibraryId, tsx) {
  const result = spawnSync(
    process.execPath,
    [cli, "--tsconfig", path.join(root, "tsconfig.json"), path.join(root, "src/cli.ts")],
    {
      cwd: root,
      encoding: "utf8",
      input: JSON.stringify({
        version: 1,
        baseLibraryId,
        sectionsLibraryId,
        screens: [{ id: "test-screen", tsx }],
      }),
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const screen = JSON.parse(result.stdout).screens[0];
  assert.equal(screen.error, undefined);
  assert.match(screen.html, /data-stage-render/);
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
