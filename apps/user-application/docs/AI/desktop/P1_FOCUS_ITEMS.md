# P1 Focus Items

Source: [`DESKTOP_PERFORMANCE.md`](./DESKTOP_PERFORMANCE.md)

This file keeps only the P1 items the team wants to focus on next.

1. Open window immediately; no sidecar at launch
   - File: `electron/main.ts`
   - Goal: make the app feel visible and usable faster on cold start.

2. Sidecar only on first `engine:*` IPC
   - File: `electron/ipc.ts`
   - Goal: start the Rust engine only when the user actually needs AI.

4. Lazy routes + `manualChunks`
   - Files: `src/routes/*`, `electron.vite.config.ts`
   - Goal: reduce the amount of code loaded up front.

5. Lazy project tabs
   - File: `ProjectDetailView.tsx`
   - Goal: load heavy project sections only when they are opened.
