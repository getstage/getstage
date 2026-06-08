# !!! 2026-06-07 — Desktop idle energy & lightweight plan

> **Priority:** !!! **VERY IMPORTANT** — P0 for desktop quality  
> **Status:** active plan (2026-06-07)  
> **Scope:** `apps/user-application` (Electron main, renderer, sidecar, companion)  
> **Trigger:** Partner Mac showed Stage **5636** (12 hr power) vs Arc **314**; **18 GB swap** on 24 GB RAM; system-wide lag (Cursor, CleanShot)  
> **Related:** [`DESKTOP_PERFORMANCE.md`](./DESKTOP_PERFORMANCE.md), [`DESKTOP_RELEASE_AND_TESTING_PLAN.md`](./DESKTOP_RELEASE_AND_TESTING_PLAN.md)

---

## !!! Why this plan exists

Same app version (**0.1.53**) can feel fine on one Mac and destroy another. Adrien’s Activity Monitor data proved:

| Signal | Value | Meaning |
|--------|-------|---------|
| Stage 12 hr power | **5636** | ~18× Arc (314), ~30× Cursor (186) |
| Swap used | **18.24 GB** | Severe memory pressure — everything slows down |
| `stage-engine` (snapshot) | 2.3 MB | Engine process is not the main RAM hog |
| Stage CPU (snapshot) | ~0% | Idle *moment* ≠ low energy over 12 hours |

**Conclusion:** Stage is too heavy in **background / idle**. Fixing this is **our job** — not something we outsource to beta users.

---

## Goals

### User-facing

1. Stage must not be the top “Using Significant Energy” app when idle.
2. Closing the main window should not leave a heavy background footprint (or we make quit behavior obvious).
3. Cursor, CleanShot, and other apps must not degrade just because Stage is installed and was used earlier.

### Engineering budgets (DMG, Apple Silicon, idle 30 min — no AI used)

| Metric | v0.1.53 (observed / inferred) | **Target v0.1.54+** |
|--------|-------------------------------|----------------------|
| Total RAM (Stage + all Helpers) | unknown high under pressure | **< 800 MB** idle |
| Average CPU (idle 30 min) | spikes + background work | **< 1%** |
| `stage-engine` running | may stay up after AI | **not running** unless AI active |
| 12 hr power (2 h session + idle) | 5636 (partner) | **< 500** (order-of-magnitude drop) |
| Swap growth attributable to Stage | contributed to 18 GB | **no steady climb** over 30 min idle |

---

## Terminal testing — copy & paste !!!

> **Prerequisite:** packaged **DMG** installed at `/Applications/Stage.app` — not `pnpm dev`.  
> **During idle tests:** do not touch Stage (no mouse, no chat, no voice).

### 0. Setup (run once per test session)

```bash
# Kill any stuck processes
pkill -9 Stage; pkill -9 stage-engine

# Confirm clean
pgrep -lf 'Stage|stage-engine' || echo "OK — nothing running"

# Optional: baseline memory before test
memory_pressure
vm_stat | head -8
```

---

### 1. Repeatable idle test (most important — 30 minutes)

Launches Stage from Terminal (logs visible) and samples CPU/RAM every 30s for 30 min.

```bash
pkill -9 Stage; pkill -9 stage-engine

/Applications/Stage.app/Contents/MacOS/Stage &
STAGE_PID=$!

echo "Stage PID=$STAGE_PID started $(date '+%H:%M:%S')"
echo "DO NOT touch Stage for 30 minutes."

for i in $(seq 1 60); do
  date '+%H:%M:%S'
  ps -o pid,ppid,%cpu,rss,comm -p $STAGE_PID 2>/dev/null
  pgrep -lf 'Stage Helper|stage-engine' || true
  sleep 30
done

echo "done $(date '+%H:%M:%S')"
```

**Alternative** (if you already opened Stage via Dock):

```bash
STAGE_PID=$(pgrep -x Stage | head -1)
echo "pid=$STAGE_PID"

for i in $(seq 1 60); do
  echo "--- $(date '+%H:%M:%S') sample $i/60 ---"
  ps -o pid,%cpu,rss,comm -p "$STAGE_PID" 2>/dev/null || echo "Stage main gone"
  pgrep -lf 'Stage Helper|stage-engine' || echo "(no helpers/engine)"
  sleep 30
done
```

---

### 2. Pass criteria (draft budgets)

| Metric | Pass |
|--------|------|
| **Idle CPU** (30 min avg, main + all Helpers) | **< 1%** |
| **Total RAM** (all Stage processes) | **< 800 MB** |
| **`stage-engine`** | **not running** if you did not use AI |
| **Energy** (after 30 min) | Activity Monitor → Energy → Stage **not** top of list |

`rss` in `ps` is in **KB** — 800 MB ≈ 819200 KB total across all Stage lines.

---

### 3. Quick memory / swap check

Run **before** and **after** the 30 min idle test:

```bash
memory_pressure
vm_stat | head -8
```

Watch **Swap used** — should not climb steadily while Stage sits idle.

---

### 4. “Adrien scenario” test (2 hours — manual + Activity Monitor)

Terminal gets you started; the **12 hr Power** number is read in Activity Monitor.

```bash
pkill -9 Stage; pkill -9 stage-engine
open -a Stage
```

Then **by hand**:

1. Use Stage chat **once** (starts `stage-engine`).
2. Close the chat panel.
3. Leave Stage running **2 hours** — window may be closed, **do not Cmd+Q**.
4. Open **Activity Monitor → Energy** → find **Stage → 12 hr Power**.

**Pass:** nowhere near **5000+** (Adrien had **5636** on v0.1.53). Target **< 500**.

After 2 h, in Terminal:

```bash
pgrep -lf 'Stage|stage-engine'
memory_pressure
vm_stat | head -8
```

---

### 5. Helper audit (quick — anytime)

```bash
pgrep -lf 'Stage|stage-engine'
ps aux | grep -E 'Stage|stage-engine' | grep -v grep
```

**Pass after idle:** `Stage` + `Stage Helper` only — **no** `stage-engine` unless AI was used recently.

---

### 6. Engine port check

```bash
lsof -i :48221
curl -s http://127.0.0.1:48221/v1/readiness
```

**Pass when idle (no AI):** `lsof` empty / connection refused.

**Kill stuck engine:**

```bash
kill $(lsof -t -i:48221) 2>/dev/null; pkill -9 stage-engine
```

---

### 7. Energy sample (optional, precise — needs sudo)

Run while Stage is **idle** for 1 minute. Compare before vs after code fixes.

```bash
sudo powermetrics --samplers cpu_power,gpu_power -i 5000 -n 12 --show-process-energy
```

---

### 8. Quit test (zombie check)

```bash
# Quit Stage with Cmd+Q in the app, then:
sleep 10
pgrep -lf 'Stage|stage-engine' || echo "PASS — all gone"
```

**Pass:** no output (all PIDs gone within 10 s).

---

### 9. Cold launch smoke test

```bash
pkill -9 Stage; pkill -9 stage-engine
echo "START $(date '+%H:%M:%S')"
open -a Stage
# Window should appear in < 2 s; then:
sleep 5
pgrep -lf 'stage-engine' || echo "PASS — no engine at launch"
```

---

## Testing overview — what needs to happen

> **!!! No desktop release without passing Procedure A on a local DMG build.**

### Golden rules

| Rule | Why |
|------|-----|
| Test the **packaged DMG** installed in `/Applications` | Matches what Adrien runs — not `pnpm dev` |
| Test on **your Mac** (arm64) | Same binary as partner; no beta user required |
| **Do not touch Stage** during idle runs | Mouse/keyboard invalidates CPU/energy numbers |
| Record results in the **Results log** (bottom of this doc) | Compare 0.1.53 baseline vs each fix |

### When to run tests

| Moment | What to run |
|--------|-------------|
| **Before every desktop release** | A + regression checklist |
| **After any P0 code change** | A (30 min) |
| **Before calling energy “fixed”** | A + B (2 h soak) |
| **Optional deep dive** | C (`powermetrics`) |
| **Quick sanity anytime** | D (helper audit) |

### The four procedures (in order)

```txt
┌─────────────────────────────────────────────────────────────┐
│  SETUP (every run)                                          │
│  1. Build DMG → install to /Applications                    │
│  2. pkill -9 Stage; pkill -9 stage-engine                   │
│  3. Open Stage once → confirm it works → leave it idle      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  A — 30 min idle benchmark          [REQUIRED — release gate] │
│  • Run benchmark script OR manual ps sampling (30 min)      │
│  • Don't touch Stage                                        │
│  • PASS: CPU < 1%, RAM < 800 MB, no stage-engine            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  B — 2 h soak ("Adrien scenario")   [REQUIRED before ship]  │
│  • Use chat once → close panel → don't Cmd+Q for 2 hours    │
│  • Activity Monitor → Energy → Stage 12 hr power            │
│  • PASS: not top of list; 12 hr power < 500 (target)        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│  C — powermetrics        │    │  D — helper audit (quick)    │
│  [optional, precise]     │    │  pgrep Stage / stage-engine  │
│  sudo powermetrics …     │    │  after idle: engine must be  │
│  compare before/after    │    │  gone                        │
└──────────────────────────┘    └──────────────────────────────┘
```

### Pass / fail (release gate)

| Check | Pass | Fail → don't ship |
|-------|------|-------------------|
| Cold launch | Window < 2 s | Slow or hang |
| Engine at launch | No `stage-engine` in Activity Monitor | Engine spawns at open |
| First AI chat | Engine starts, reply works | Engine error / timeout |
| **Procedure A (30 min idle)** | CPU < 1%, RAM < 800 MB, no engine | High CPU/RAM or engine stuck |
| **Procedure B (2 h soak)** | 12 hr power < 500, not #1 in Energy tab | Values like 0.1.53 (5636) |
| Cmd+Q quit | All Stage PIDs gone in 10 s | Zombie processes remain |
| Swap (optional) | No steady climb over 30 min | RAM pressure keeps growing |

### What you need

| Item | Required? |
|------|-----------|
| Your Mac (Apple Silicon) | Yes |
| DMG in `/Applications` | Yes |
| Activity Monitor | Yes (for B + manual A) |
| Terminal | Yes |
| `desktop-idle-benchmark.sh` | Later — use **Terminal testing** §1–9 above until then |
| Adrien / other beta user | **No** — only optional confirmation after you PASS |
| GitHub Actions | Smoke only — not a substitute for §1 or §4 |

> **All copy-paste commands:** see **Terminal testing — copy & paste** at the top of this doc.

---

## Root causes (codebase)

| # | Area | Problem | Files |
|---|------|---------|-------|
| 1 | macOS lifecycle | `window-all-closed` does **not** quit on darwin — full Electron stack stays alive | `electron/main.ts` |
| 2 | Bundle | ~3 MB JS loaded at once; no full route splitting | `electron.vite.config.ts`, `src/routes/*` |
| 3 | Companion UI | `CritiquePanel`, `VoiceControlBar`, `CompanionOrb` always mounted in main shell | `src/components/app/DesktopShell.tsx` |
| 4 | Legacy overlay | Full-screen `alwaysOnTop` companion `BrowserWindow` + `pointermove` on every mouse move still in tree | `electron/windows.ts`, `DesktopShell.tsx` |
| 5 | Sidecar | `stage-engine` starts on first AI IPC; may **not** stop when idle | `electron/sidecar.ts`, `electron/ipc.ts` |
| 6 | Background services | Auth callback server, tray, global shortcuts, auto-update — always on at launch | `electron/main.ts`, `electron/helpers/auto-update.ts` |
| 7 | Dashboard | Duplicate Convex queries (P2 in performance doc) | `DashboardContextView.tsx`, workspace hooks |
| 8 | Observability | No self-service logs or idle metrics for users/devs | missing |

---

## Action plan

### P0 — Idle energy (ship in **v0.1.54**) !!!

| # | Action | Acceptance criteria | Files |
|---|--------|---------------------|-------|
| 0.1 | **Idle benchmark script** in repo | Script runs 30 min, logs CPU/RAM/helpers, exits non-zero on budget breach | `scripts/desktop-idle-benchmark.sh` (new) |
| 0.2 | **Stop `stage-engine` when idle** | 5–10 min after last engine IPC, supervisor stops child; port free (`lsof -i :48221` empty) | `electron/sidecar.ts`, `electron/ipc.ts` |
| 0.3 | **Renderer background throttling** | `backgroundThrottling: true` on all `BrowserWindow` webPreferences | `electron/windows.ts` |
| 0.4 | **Remove fullscreen companion overlay path** | No `createCompanionWindow` in production shortcuts; delete or gate dead overlay code; tray/shortcuts use main window only | `electron/windows.ts`, `electron/ipc.ts` |
| 0.5 | **Lazy-mount companion UI** | Chat/voice chrome not in DOM until user opens companion | `DesktopShell.tsx`, companion components |
| 0.6 | **Pause work when app hidden** | No polling / reduced Convex refetch when `document.hidden` or main window not visible | renderer hooks, `useEngineStatus.ts` |
| 0.7 | **Document quit vs close** | In-app or release note: use **Cmd+Q** to fully quit; red X leaves Stage in background (until we change behavior) | copy / settings (optional) |

### P1 — Startup & memory (continue from performance doc)

| # | Action | Files |
|---|--------|-------|
| 1.1 | Sidecar only on first `engine:*` IPC (verify shipped in DMG) | `electron/main.ts`, `electron/ipc.ts` |
| 1.2 | Lazy routes + `manualChunks` | `src/routes/*`, `electron.vite.config.ts` |
| 1.3 | Dashboard query dedup (no 4× `listProjects`) | `DashboardContextView.tsx`, shared context |
| 1.4 | Lazy project tabs | `ProjectDetailView.tsx` |

### P2 — Observability (v0.1.54 or v0.1.55)

| # | Action | Files |
|---|--------|-------|
| 2.1 | Help → **Show Logs** (main + sidecar path) | `electron/main.ts` |
| 2.2 | `[stage-desktop:perf]` idle log line every N min (RSS, helper count, engine up/down) | `electron/main.ts` or helper |
| 2.3 | Link this plan + budgets in `DESKTOP_PERFORMANCE.md` | docs |

### P3 — Optional behavior change (decision needed)

| Option | Pros | Cons |
|--------|------|------|
| **A.** Keep macOS “close window ≠ quit” | Standard Mac app | Background energy (current pain) |
| **B.** Quit app when last window closes | Lightweight | Non-standard for Mac power users |
| **C.** “Minimize to tray” + explicit **Quit** in menu | Clear UX | Still need idle budget when “running” |

**Recommendation:** P0 fixes first; revisit **C** if idle budgets still fail after 0.2–0.6.

---

## Testing — detailed procedures

> See **Testing overview** above for the flow. **Rule:** always test the **packaged DMG**, not `pnpm dev`.

### Who can run tests

| Tester | Enough for idle energy? |
|--------|-------------------------|
| Werner’s Mac (arm64 DMG) | **Yes** — same build as partner |
| GitHub Actions `macos-latest` | Smoke launch/quit only — **not** 30 min energy |
| Adrien / others | Optional confirmation after we pass local budgets |

### Procedure A — 30 min idle benchmark (required before release)

```bash
# 1. Install DMG to /Applications
# 2. Clean slate
pkill -9 Stage; pkill -9 stage-engine

# 3. Run benchmark script (after 0.1 lands)
cd apps/user-application
./scripts/desktop-idle-benchmark.sh --minutes 30 --dmg

# 4. Manual check: Activity Monitor → Energy → Stage 12 hr power
```

**Do not touch Stage during the run.** No chat, no voice, no project navigation.

### Procedure B — “Adrien scenario” (2 h soak)

1. Open Stage, use chat once (starts engine), close chat panel.
2. Leave Stage running (window may be closed, **no Cmd+Q**) for **2 hours**.
3. Open Activity Monitor → Energy → note Stage **12 hr power**.
4. Run `memory_pressure` and `vm_stat | head -8`.

### Procedure C — Energy sample (optional, precise)

```bash
sudo powermetrics --samplers cpu_power,gpu_power -i 5000 -n 12 --show-process-energy
```

Run while Stage is idle. Compare before/after P0 patches.

### Procedure D — Helper audit

```bash
pgrep -lf 'Stage|stage-engine'
ps aux | grep -E 'Stage|stage-engine' | grep -v grep
```

Expect: main + Helpers only; **no** `stage-engine` after idle timeout.

### Regression checklist (every desktop release)

- [ ] Cold launch: window < 2 s
- [ ] No `stage-engine` at launch (Activity Monitor)
- [ ] First AI action: engine starts, chat works
- [ ] 30 min idle benchmark **PASS**
- [ ] 2 h soak: 12 hr power not top of list
- [ ] Quit (`Cmd+Q`): all Stage PIDs gone within 10 s

---

## Results log (fill in as we ship)

| Version | Date | Idle RAM | Idle CPU (30m) | engine after idle | 12 hr power (2h soak) | Benchmark script |
|---------|------|----------|----------------|-------------------|----------------------|------------------|
| 0.1.53 | 2026-06-07 | — | — | yes (partner) | **5636** (partner) | not run |
| 0.1.54 | TBD | < 800 MB | < 1% | no | < 500 | PASS |

---

## Implementation order

```txt
!!! Day 1   → 0.1 benchmark script + 0.3 backgroundThrottling + baseline numbers on 0.1.53 DMG
!!! Day 2–3 → 0.2 engine idle stop + 0.4 remove overlay + 0.5 lazy companion
     Day 4   → 0.6 hidden pause + P1 dashboard dedup
     Day 5   → 2.1 logs + re-run benchmark → ship 0.1.54 if PASS
```

---

## Partner comms (until fix ships)

Short message Adrien can use after **restart** (not a substitute for the fix):

1. **Restart Mac** (clears swap).
2. **Cmd+Q** Stage when not using it.
3. Close Stage chat overlay (**X**).
4. Avoid running Stage + Arc + Cursor + Claude all day without quitting.

---

## Files to touch (summary)

| Phase | Path |
|-------|------|
| P0 | `electron/sidecar.ts`, `electron/windows.ts`, `electron/main.ts`, `electron/ipc.ts`, `src/components/app/DesktopShell.tsx` |
| P0 | `scripts/desktop-idle-benchmark.sh` (new) |
| P1 | `electron.vite.config.ts`, `src/routes/*`, `DashboardContextView.tsx` |
| P2 | `electron/main.ts`, `docs/AI/desktop/DESKTOP_PERFORMANCE.md` |

---

**!!! This plan is VERY IMPORTANT.** Do not ship the next desktop release without Procedure A passing on a local DMG build.
