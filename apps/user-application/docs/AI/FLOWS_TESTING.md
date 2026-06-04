# Flows Testing

Related: [`FLOWS_DEV_STATUS.md`](./FLOWS_DEV_STATUS.md) · [`FLOWS_CHANGE_AUDIT.md`](./FLOWS_CHANGE_AUDIT.md)

---

## Before testing

```bash
cd packages/data-ops && npx convex dev
cd apps/user-application && pnpm dev
```

After Rust changes:

```bash
kill $(lsof -t -i:48221)
```

Then restart `pnpm dev`.

## Static gates

```bash
cargo check
pnpm --dir packages/data-ops exec convex codegen
pnpm --dir packages/data-ops run convex:typecheck
pnpm run desktop:typecheck
```

## Smoke test

1. Open a project with Research, Strategy, and Moodboard artifacts.
2. Open the Flows tab.
3. Click **Generate Flows**.
4. Select Claude or Codex and choose mode in the run settings.
5. Confirm generation.

Expected terminal signals:

```txt
[stage-engine] flows workflow started
tool_call_started Load Stage flows input
starting flows provider run
run_completed finalText="Flows artifact saved."
```

Expected UI:

- 5 generated flows by default.
- All generated flows start as `Draft`.
- First flow is expanded.
- Steps are visible.
- Screens tab shows reusable screens.

## Persistence checks

| Scenario | Expected |
|---|---|
| Edit steps and save | Reload keeps edited steps |
| Add manual flow | Reload keeps manual flow |
| Change status to Approved | Progress count updates and persists |
| Edit screen elements | Reload keeps edited key elements |
| Regenerate screen | Latest artifact updates after run completion |
| Regenerate flow | Target flow updates after run completion |

## FigJam check

1. Connect Figma in Settings.
2. Click **Send to FigJam**.

Expected V1 result:

- Stage creates a Figma artifact destination request.
- UI shows the current limitation: creating FigJam canvas content needs a Figma Plugin/Widget export path.

If Figma is not connected, expect a clear connect-Figma error.

