# Agent notes

## Cursor Cloud specific instructions

- **Where to work:** The runnable app lives under `app/` (not the repo root). See `app/SETUP.md` for the full stack and env var list; scripts are in `app/package.json`.

- **Convex + Vite:** For full stack development, run `npx convex dev` from `app/` (links/syncs your Convex deployment) and `pnpm run dev` for the Vite dev server (default port **3000**). The client requires `VITE_CONVEX_URL` in `.env` or `.env.local` (both gitignored unless you add a committed `.env.example`).

- **Checks:** There is no ESLint npm script; `pnpm run typecheck` is the main static check. There is no Vitest/Playwright-style test script in `package.json`—verify with `typecheck` and `pnpm run build` as needed.

- **Localhost vs 127.0.0.1:** Vite may listen on IPv6 loopback only (`::1`). If `curl http://127.0.0.1:3000` fails while the server is running, use `http://localhost:3000` instead.

- **pnpm lifecycle scripts:** `pnpm install` may warn that some dependencies’ build scripts were skipped (`esbuild`, `workerd`, etc.). If `pnpm run dev` or `pnpm run build` still works, no action is needed; if a future pnpm version blocks installs, configure the project’s non-interactive allowlist per pnpm docs rather than using interactive `pnpm approve-builds` in automation.
