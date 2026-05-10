# `packages/data-ops` Build Pattern - Explainer + Migration Plan

Date: 2026-05-10
Status: Decision document. No code change yet. Waiting for Werner.

## What this is about (in plain words)

`packages/data-ops` is the shared TypeScript package that holds the
contracts (Zod schemas + types) used by the desktop app, the web
app, and eventually the Rust sidecar.

Right now, when the desktop imports from `@stage/data-ops`, it
imports straight from the `.ts` source files of the package.

In your other project (the one whose `package.json` you pasted),
`data-ops` was first compiled to a `dist/` folder, and consumers
imported the compiled `.js` and `.d.ts` files from `dist/`.

Both work. They have very different friction profiles. This doc
explains the difference and what I recommend.

## Today: "point to source" pattern

Stage's current `packages/data-ops/package.json`:

```json
{
  "name": "@stage/data-ops",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./contracts": { "...": "./src/contracts/index.ts" },
    "./domain":    { "...": "./src/domain/index.ts" }
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

Notice:

- No `build` script.
- `main` and `exports` point at `.ts` files.
- The desktop app imports the package and TypeScript reads the source
  directly. There is no compiled artifact.

Pros:

- Zero build step. Edit a contract, save, the consumer picks it up.
- Type info comes straight from source - no `.d.ts` drift.

Cons (these are the real reason we are talking):

- VS Code's TypeScript Server caches the contents of any imported
  package. When you edit a workspace package's source, the cache
  sometimes does NOT refresh until you "Restart TS Server" or reload
  the window. We have hit this twice already in this branch.
- The package is not really a published package. There is no
  boundary between "internal" and "external" - consumers see the
  raw source tree.
- It does not match how the Rust sidecar will work. Rust compiles
  to an artifact and consumers see the artifact, never the source.
  When the desktop talks to the sidecar through `data-ops` schemas,
  having ONE half of the contract live as raw source and the OTHER
  half live as a compiled artifact is asymmetric and confusing.

## Your other project: "build to dist" pattern

```json
{
  "main": "./dist/src/index.js",
  "types": "./dist/src/index.d.ts",
  "exports": {
    "./database":   { "types": "./dist/src/db/database.d.ts",   "default": "./dist/src/db/database.js" },
    "./queries":    { "types": "./dist/src/queries/index.d.ts", "default": "./dist/src/queries/index.js" },
    "./zod-schema": { "types": "./dist/src/zod/index.d.ts",     "default": "./dist/src/zod/index.js" }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json --outDir ./dist && tsc-alias"
  }
}
```

How this works:

- Author edits `src/...ts`.
- Author runs `pnpm run build` (or a watch task).
- `tsc` emits `.js` + `.d.ts` into `dist/`.
- `tsc-alias` rewrites any `@/...` path aliases to relative paths so
  the compiled output is portable.
- Consumers import from `@stage/data-ops` -> resolved to `dist/...js`.

Pros:

- Editor only sees `dist/`. `dist/` only changes when you explicitly
  build. No more "TS Server thinks the export does not exist" because
  the artifact is stable until build runs.
- The boundary is real. You can never accidentally import a
  package-internal helper because it is not in `exports`.
- It matches the Rust pattern (`cargo build` -> artifact ->
  consumed). When the sidecar starts emitting `EngineEvent`s through
  `data-ops` schemas, both sides of the contract behave the same
  way: edit -> build -> consumed.
- Publishable to npm later if you ever want to share `data-ops`
  outside the monorepo (e.g. with a Stage CLI or with an integration
  partner).

Cons:

- One extra step: you must run `pnpm run build` after editing a
  contract before consumers see the change.
- During development, easy to forget the build step. Mitigation:
  `pnpm run dev` in the package that runs `tsc --watch`, or add
  `build` as a `predev` hook in the consumers.
- CI must build packages in dependency order (`data-ops` first,
  then everything that depends on it).
- Source maps required for nice debugging stack traces.

## Recommendation

Migrate, before launch. The friction we keep hitting is real and
will only get worse once Rust starts emitting events through these
same schemas. 30 minutes of work today removes a recurring footgun
and makes the contract layer behave the same way Rust will.

The win that matters most: when something breaks at runtime between
desktop and Rust, you want the contract to be a single buildable
artifact you can inspect, not a sometimes-stale snapshot of source
files.

## Migration plan (when you give the go)

This is the exact change. Nothing surprising.

### Step 1: add build scripts to `packages/data-ops/package.json`

```diff
{
  "name": "@stage/data-ops",
  "private": true,
  "version": "0.1.0",
  "type": "module",
- "main": "./src/index.ts",
- "types": "./src/index.ts",
+ "main": "./dist/index.js",
+ "types": "./dist/index.d.ts",
+ "files": ["dist"],
  "exports": {
    ".": {
-     "types": "./src/index.ts",
-     "default": "./src/index.ts"
+     "types": "./dist/index.d.ts",
+     "default": "./dist/index.js"
    },
    "./contracts": {
-     "types": "./src/contracts/index.ts",
-     "default": "./src/contracts/index.ts"
+     "types": "./dist/contracts/index.d.ts",
+     "default": "./dist/contracts/index.js"
    },
    "./domain": {
-     "types": "./src/domain/index.ts",
-     "default": "./src/domain/index.ts"
+     "types": "./dist/domain/index.d.ts",
+     "default": "./dist/domain/index.js"
    },
    "./contracts/*": {
-     "types": "./src/contracts/*.ts",
-     "default": "./src/contracts/*.ts"
+     "types": "./dist/contracts/*.d.ts",
+     "default": "./dist/contracts/*.js"
    },
    "./domain/*": {
-     "types": "./src/domain/*.ts",
-     "default": "./src/domain/*.ts"
+     "types": "./dist/domain/*.d.ts",
+     "default": "./dist/domain/*.js"
    }
  },
  "scripts": {
-   "typecheck": "tsc --noEmit"
+   "build":     "tsc -p tsconfig.json",
+   "dev":       "tsc -p tsconfig.json --watch",
+   "typecheck": "tsc --noEmit",
+   "clean":     "rm -rf dist"
  },
  "dependencies": { "zod": "^4.3.6" },
  "devDependencies": { "typescript": "^5.7.0" }
}
```

### Step 2: update `packages/data-ops/tsconfig.json`

Make sure it emits `.js` + `.d.ts` to `dist/`:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

If you currently use `@/...` path aliases inside `data-ops`, add
`tsc-alias` (`pnpm add -D tsc-alias`) and chain it after `tsc`. The
current package does not seem to use path aliases, so probably not
needed.

### Step 3: add `data-ops` build to consumer package scripts

So nobody forgets the build step:

```diff
// apps/user-application/package.json
{
  "scripts": {
+   "predev":   "pnpm --filter @stage/data-ops run build",
+   "prebuild": "pnpm --filter @stage/data-ops run build",
    "dev":      "env -u ELECTRON_RUN_AS_NODE electron-vite dev",
    "build":    "tsc --noEmit && electron-vite build"
  }
}
```

Same for `apps/web-application/package.json` if needed.

### Step 4: build, install, verify

```bash
cd packages/data-ops && pnpm run build
cd ../../apps/user-application && pnpm install && pnpm run typecheck && pnpm run build
cd ../web-application && pnpm install && pnpm run typecheck && pnpm run build:testing
```

### Step 5: add `dist/` to `.gitignore`

```diff
+ packages/data-ops/dist/
```

### Step 6: update CI / pre-commit

Make sure CI runs `pnpm --filter @stage/data-ops run build` before
the consumer typechecks.

### Total work

```txt
- ~10 minutes of file edits
- ~5 minutes verification
- ~5 minutes updating CI
- ~10 minutes for any debugging if a path alias surfaces
About 30 minutes total. No behaviour change. No new dependencies
unless tsc-alias is needed.
```

### What can go wrong

```txt
- If a consumer imports from a deep path (e.g. "@stage/data-ops/src/...")
  it will break because src/ is no longer the public surface.
  Mitigation: grep for "@stage/data-ops" first; we use the barrel
  exports everywhere I have seen.
- If the package depends on Node-only APIs, the emitted JS may not
  run in the renderer. data-ops is pure Zod + TS types, no runtime
  Node, so this is not a concern.
- Rust side does not consume data-ops directly today (it mirrors the
  contracts manually with serde). If we ever auto-generate Rust from
  these schemas, the build artifact gives us a single input file
  to point the generator at.
```

## What if we DO NOT migrate

Acceptable, but with these caveats:

```txt
- Document that any time you add a new export to data-ops you must
  reload the VS Code window, not just save. Adds friction.
- The "no boundary" issue stays. If someone imports a private
  helper from data-ops/src by accident, nothing prevents it.
- Future Rust + TS contract auto-generation work needs an extra
  step (compile data-ops first to have a single artifact).
```

## Decision

Tick one when you decide:

- [ ] Migrate now. Follow Steps 1-6 above. I will execute and update
      this doc with an "Implementation log" section.
- [ ] Skip for launch. Add a clear comment in `data-ops/package.json`
      explaining the cache footgun and the workaround
      ("Restart TS Server" / "Reload Window" after editing the
      package).
