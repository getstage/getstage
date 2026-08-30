import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "node_modules/tsx/dist/cli.mjs");

function execute(tsx, catalog = undefined) {
  return executeScreens([{ id: "test-screen", tsx }], catalog);
}

function executeScreens(screens, catalog = undefined) {
  return spawnSync(
    process.execPath,
    [cli, "--tsconfig", path.join(root, "tsconfig.json"), path.join(root, "src/cli.ts")],
    {
      cwd: root,
      encoding: "utf8",
      input: JSON.stringify({
        version: 2,
        screens,
        ...(catalog ? { catalog } : {}),
      }),
      timeout: 30_000,
    },
  );
}

test("renders a self-contained RAG-adapted screen", () => {
  const result = execute(`
    import { CheckCircle2 } from "lucide-react";
    export default function Screen() {
      return <main className="p-8"><CheckCircle2 /><button>Continue</button></main>;
    }
  `);
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const output = JSON.parse(result.stdout);
  assert.equal(output.version, 2);
  assert.ok(output.css.length > 0);
  assert.match(output.screens[0].html, /Continue/);
});

test("rejects the removed legacy component aliases", () => {
  const result = execute(`
    import { Button } from "@stage/base";
    export default function Screen() { return <Button>Old path</Button>; }
  `);
  const output = JSON.parse(result.stdout);
  assert.match(output.screens[0].error, /Import "@stage\/base" is not allowed/);
});

test("one invalid screen does not block valid siblings", () => {
  const result = executeScreens([
    {
      id: "legacy",
      tsx: `import { Button } from "@stage/base";
export default function Screen() { return <Button>Old path</Button>; }`,
    },
    {
      id: "valid",
      tsx: `export default function Screen() { return <main>New screen</main>; }`,
    },
  ]);
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const output = JSON.parse(result.stdout);
  assert.match(output.screens.find((screen) => screen.id === "legacy").error, /not allowed/);
  assert.match(output.screens.find((screen) => screen.id === "valid").html, /New screen/);
});

test("rejects invented Lucide icons", () => {
  const result = execute(`
    import { NotARealIcon } from "lucide-react";
    export default function Screen() { return <NotARealIcon />; }
  `);
  assert.match(result.stdout + result.stderr, /lucide-react does not export NotARealIcon/);
});

test("renders a catalog @/ import when the file is supplied", () => {
  const result = execute(
    `
    import Features from "@/components/features-section-demo-2";
    export default function Screen() {
      return <main className="p-8"><Features /></main>;
    }
  `,
    [
      {
        path: "components/features-section-demo-2.tsx",
        content: `export default function Features() { return <section>Features</section>; }`,
      },
    ],
  );
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const output = JSON.parse(result.stdout);
  assert.match(output.screens[0].html, /Features/);
  assert.equal(output.screens[0].error, undefined);
});

test("stubs a missing safe catalog import instead of blocking the screen", () => {
  const result = execute(`
    import { Button } from "@/registry/default/ui/button";
    export default function Screen() {
      return <main className="p-8"><Button>Continue</Button></main>;
    }
  `);
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const output = JSON.parse(result.stdout);
  assert.match(output.screens[0].html, /Continue/);
  assert.equal(output.screens[0].error, undefined);
});

test("rewrites next/link from a catalog module to an anchor", () => {
  const result = execute(
    `
    import Palette from "@/registry/default/particles/p-command-2";
    export default function Screen() {
      return <main className="p-8"><Palette /></main>;
    }
  `,
    [
      {
        path: "registry/default/particles/p-command-2.tsx",
        content: `import Link from "next/link";
export default function Palette() {
  return <Link href="/docs">Open command</Link>;
}
`,
      },
    ],
  );
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const output = JSON.parse(result.stdout);
  assert.match(output.screens[0].html, /Open command/);
  assert.match(output.screens[0].html, /<a/);
});

test("stubs unknown catalog npm and missing relative imports", () => {
  const result = execute(
    `
    import Demo from "@/components/cards-demo-3";
    export default function Screen() {
      return <main className="p-8"><Demo /></main>;
    }
  `,
    [
      {
        path: "components/cards-demo-3.tsx",
        content: `import { GoArrowUp } from "react-icons/go";
import { format } from "./chart-formatters";
import { cn } from "@/registry/default/lib/utils";
export default function Demo() {
  return <section className={cn("p-4")}>Cards <GoArrowUp />{format}</section>;
}
`,
      },
    ],
  );
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const output = JSON.parse(result.stdout);
  assert.match(output.screens[0].html, /Cards/);
  assert.equal(output.screens[0].error, undefined);
});
