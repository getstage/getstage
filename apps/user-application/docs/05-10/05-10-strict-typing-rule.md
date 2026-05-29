# Stage Strict Typing Rule

Date: May 10, 2026
Status: Active rule for the whole monorepo. Apply on every new file
and every touched file.
Skill: `.claude/skills/strict-typing/SKILL.md` (mirrors this doc for
agents).

## Why this exists

Stage's backend is moving to a Rust sidecar (`apps/stage-engine`).
TypeScript-side `any`, `as` casts, and hand-rolled narrowing all
become silent contract drift the moment Rust starts emitting events
through the same `packages/data-ops` schemas:

```txt
- Rust will compile fine.
- TypeScript will compile fine.
- The desktop will fail at runtime when serde refuses the payload,
  or when Zod refuses a payload Rust thought was valid.
- A future dev will "fix" the TS type by adding another cast,
  silently breaking the Rust side again.
```

Once Rust ships, the only way to keep the two ends in sync is to
make sure every cross-boundary value is parsed by Zod on the TS
side, and serde on the Rust side, against the SAME schema source.

## The rule (short version)

```txt
If a value crosses a process boundary (IPC, HTTP, child process,
disk, deep link) it MUST be Zod-parsed at the receiving side.

There MUST NOT be:
  - `as SomeType` on data from a boundary
  - `: any` anywhere
  - `Record<string, unknown>` for a known shape (use Partial<Doc<...>>
    or a real type)
  - hand-rolled `typeof / "k" in x` narrowing when a Zod schema fits
  - `// @ts-ignore` / `// @ts-expect-error` on data shapes
```

## What broke this rule on 2026-05-10 (and how it was fixed)

Honest log of the four sloppy patterns I shipped during the tasks-
mutation pass and what changed:

| Where | What was wrong | Replaced with |
|---|---|---|
| `electron/ipc.ts` desktopApiCreateTask handler | `args as CreateTaskArgs` | Handler passes `unknown` to `createTask`; `createTask` Zod-parses internally |
| `electron/ipc.ts` desktopApiSetTaskPriority handler | `args as SetTaskPriorityArgs` | Same pattern |
| `electron/ipc.ts` desktopApiListUserTasks handler | hand-rolled `args && typeof args === "object" && "limit" in args && typeof (args as { limit: unknown }).limit === "number"` | Handler passes `unknown` to `listUserTasks`; `userTasksQuerySchema.parse` runs internally |
| `convex/domain/projects/service.ts` setTaskPriorityForUser | `const patch: Record<string, unknown>` | `Partial<Doc<"tasks">>` with `priority: args.priority ?? undefined` |
| `src/tasks/components/TasksPageView.tsx` `for (const columnKey in next) { const key = columnKey as TaskPriority }` | iterates a known Record but `for...in` types the key as `string`, then casts | iterate `for (const { key } of PRIORITY_COLUMNS)` so `key` is already `TaskPriority` |
| `src/tasks/components/TasksPageView.tsx` getColumnFromPoint | `priority as TaskPriority` after a string check | `PRIORITY_COLUMNS.find((column) => column.key === candidate)?.key ?? null` — preserves the literal type without a cast |

All six fixes are in the codebase as of pass 4 of `05-10`. Both
`apps/user-application` and `apps/web-application` typecheck and
build green.

## Pattern (canonical examples)

### Receiving from an IPC channel

```ts
// electron/desktop-api/tasks.ts
const createTaskArgsSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1),
  priority: taskPrioritySchema.optional(),
  content: z.string().optional(),
});
export type CreateTaskArgs = z.infer<typeof createTaskArgsSchema>;

// Inputs declared as `unknown`. Parsed inside. No casts at any caller.
export async function createTask(
  authController: DesktopAuthController,
  rawArgs: unknown,
): Promise<TaskSummary> {
  const body = createTaskArgsSchema.parse(rawArgs);
  // ...rest uses `body` which is fully typed.
}

// electron/ipc.ts
ipcMain.handle(IPC_CHANNELS.desktopApiCreateTask, async (_event, args: unknown) => {
  return createTask(authController, args);  // no cast
});
```

### Receiving from the network

```ts
// electron/desktop-api/projects.ts
const projectsResponseSchema = z.object({ projects: z.array(projectSummarySchema) });

export async function listProjects(authController: DesktopAuthController) {
  const data = await fetchDesktopApiJson<unknown>({ authController, path: "/projects" });
  return projectsResponseSchema.parse(data).projects;
}
```

The renderer hooks then re-parse with the same Zod schema. Belt and
braces — we validate at every boundary the value crosses, both
sides catch drift.

### Patching a Convex doc

```ts
// Bad - allows typos, allows wrong types.
const patch: Record<string, unknown> = { ... };
await ctx.db.patch(id, patch);

// Good - typed against the actual document schema.
const patch: Partial<Doc<"tasks">> = {
  updatedAt: now(),
  priority: args.priority ?? undefined,
};
await ctx.db.patch(id, patch);
```

### Iterating a typed Record without a cast

```ts
// Bad - for...in gives `string`, force-cast back.
for (const columnKey in columns) {
  const key = columnKey as TaskPriority;
  ...
}

// Good - iterate the typed array of keys you defined.
for (const { key } of PRIORITY_COLUMNS) {
  ...
}
```

### DOM dataset narrowing

```ts
// Bad - cast a string from the DOM into a literal union.
const priority = element.dataset.taskPriorityColumn;
return PRIORITY_COLUMNS.some((c) => c.key === priority) ? priority as TaskPriority : null;

// Good - look up in the typed array; the result already has the literal type.
const candidate = element.dataset.taskPriorityColumn;
const match = PRIORITY_COLUMNS.find((c) => c.key === candidate);
return match?.key ?? null;
```

## What to enforce in CI

Recommended. Not yet wired up.

```jsonc
// .eslintrc additions for apps/user-application
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      { "assertionStyle": "never" }
    ],
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-ignore": true,
        "ts-expect-error": "allow-with-description",
        "ts-nocheck": true
      }
    ]
  }
}
```

The `consistent-type-assertions: "never"` rule is intentionally
strict. It bans `value as Foo` and `<Foo>value` outright. Exceptions
(`as const`, `as unknown as Foo` for tests) need to be opt-in per
file with a justified `eslint-disable-next-line`. Better to push
authors toward Zod or proper typing.

## Pre-commit hook (suggested)

A 3-line grep ban that catches the common offenders before they
reach typecheck:

```bash
#!/usr/bin/env bash
# .git/hooks/pre-commit (or husky equivalent)
set -e

# Block `as Capital` casts and `: any` in staged TS/TSX files.
if git diff --cached --name-only --diff-filter=ACM | \
   grep -E '\.(ts|tsx)$' | \
   xargs --no-run-if-empty grep -nE ' as [A-Z][A-Za-z0-9_]+| : any\b|<any>' ; then
  echo
  echo "Strict-typing rule violated. See:"
  echo "  apps/user-application/docs/05-10/05-10-strict-typing-rule.md"
  exit 1
fi
```

## What to do when you actually need to coerce

There are a handful of legitimate cases:

```txt
- `as const`                         - narrowing a literal, fine.
- `satisfies T`                      - PREFERRED over a cast when you
                                       want to check shape but keep
                                       the inferred narrow type.
- `value as unknown as Foo` in tests - allowed, test code is its own
                                       trust boundary.
```

If you genuinely need a cast in product code, write a one-line
comment justifying why and what invariant guarantees it. If you
can't write that comment, you don't need the cast — you need a
Zod schema.

## Owner / review

```txt
Anyone who edits a file under one of these globs MUST follow this
rule:
  apps/user-application/electron/**
  apps/user-application/shared/**
  apps/user-application/src/hooks/desktop-api/**
  apps/user-application/src/types/**
  packages/data-ops/**
  apps/web-application/convex/**

Reviewer (or `/ultrareview`) should fail any PR that adds new
violations to these files.
```

## What still has known violations (followups)

```txt
src/tasks/components/TasksPageView.tsx
  Pre-pass legacy mock state (assignees, projects pickers) is still
  partially mock-driven. The mock TASK_ASSIGNEES / TASK_PROJECTS
  arrays exist but are no longer used by the live kanban. They will
  be deleted when the assignee mutation lands.

src/project/components/KanbanBoard.tsx
  Project-detail kanban still uses local mock state for create
  task. Will be migrated when persisting project-detail kanban
  edits is in scope.

apps/user-application/src/project/data/projectSnapshot.ts
apps/user-application/src/project/data/projectOverviewSnapshot.ts
  Mock project data files. Not imported anywhere live; safe to
  delete in a cleanup pass.
```
