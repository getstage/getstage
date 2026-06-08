# !!! 2026-06-08 — Project operating plan

> **Priority:** !!! **VERY IMPORTANT**  
> **Scope:** How we work professionally — docs, Notion, Greptile, git, testing, exports, energy fix  
> **Living status:** `PROJECT_STATUS.md` (repo root)

---

## 1. The problem (honest)

We have **too many sources of truth**:

| Source | Good for | Bad for |
|--------|----------|---------|
| **320+ `.md` files** | Deep specs, history | Daily status |
| **Notion boards** | Tasks, bugs, client portal | Technical runbooks |
| **Datafa.st** | User analytics in production | Dev workflow |
| **Greptile** | PR review comments | Pre-PR quality, local dev |
| **Code** | What actually runs | Planning |

**Fix:** Not more tools — **clear jobs per tool** + **3 living repo docs**.

---

## 2. Tool roles (final)

| Tool | Owns | Does NOT own |
|------|------|----------------|
| **Notion** | Tasks, bugs, client portal, design links | Architecture, release runbooks |
| **`PROJECT_STATUS.md`** | Current version, blockers, this week | Long specs |
| **`ARCHITECTURE.md`** | System map, branches | Task tracking |
| **`.md` archive / feature plans** | How to build X (linked from Notion) | “What’s live today” |
| **Datafa.st** | Production goals / visitors | Testing |
| **Greptile** | Automated PR review on `getstage/getstage` | Local pre-push checks |
| **Terminal + DMG** | Desktop idle energy gate | Web E2E |
| **GitHub Actions** (to add) | Lint, typecheck, smoke tests on PR | 30 min energy soak |

**Linear:** skip for now — Notion task + bug boards are enough.

---

## 3. What we did 2026-06-07 (yesterday)

### Product / partner incident

- Diagnosed Adrien **“Stage not responding”** + system lag (CleanShot, Cursor MCP)
- Activity Monitor: Stage **5636** (12 hr power) vs Arc **314**; **18 GB swap** on 24 GB RAM
- Conclusion: Stage too heavy idle + RAM pressure — not “Cursor broken by Stage” directly

### Docs / process

- Created `2026-06-07!!!-DESKTOP_IDLE_ENERGY_PLAN.md` (terminal tests, P0 fixes)
- Updated `DESKTOP_PERFORMANCE.md` + desktop `README.md`
- Agreed: **Notion for tasks**, **3 living repo docs**, **archive** the rest

### Code merged into the integration branch

- Stage chat persistence (`stageChats`, chat model)
- Global shortcuts (voice + open chat), Settings → Shortcuts panel
- Companion: shortcuts target main window; overlay cleanup in `windows.ts`
- Voice pipeline tweaks (`openrouter`, `route`, errors)
- Monorepo export work: Code, Paper, Figma, FigJam, Assets, and Notion integration paths

### Still not done

- Merge the integration branch back into the final target branch
- Energy P0 code (engine idle stop, lazy companion)
- `desktop-idle-benchmark.sh` script
- Generated TanStack route-tree regeneration when the generator is available

---

## 4. Export features — status check

**Current integration branch status (2026-06-08):**

| Feature | Status | Notes |
|---------|--------|-------|
| Notion OAuth | Implemented | Testing connection verified; production callback requires deployment |
| Research → Notion | Implemented | Requires authenticated live write |
| Strategy → Notion | Implemented | Requires authenticated live write |
| Figma OAuth | Implemented | Used to identity-bind export jobs |
| Figma wireframe export | Implemented locally | Requires Convex deploy, plugin distribution, and production E2E |
| FigJam flows export | Implemented locally | Requires Convex deploy, plugin distribution, and production E2E |
| Code wireframe export | Implemented locally | Requires packaged desktop smoke test |
| Paper wireframe export | Implemented locally | Requires Paper Desktop live write |
| Assets wireframe delivery | Implemented locally | Uses the latest generated wireframe artifact |
| Moodboard export | Not implemented | Not part of the current delivery-export scope |

**Rule:** “Implemented locally” is not “shipped.” Mark work shipped only after deployment, destination E2E, and packaged desktop verification.

### Still requires live testing / deploy

- [ ] `npx convex deploy` (or dev) for Notion export mutations
- [ ] Live Research + Strategy → Notion E2E
- [ ] Live Paper Desktop export (if implemented locally)
- [ ] Figma exporter plugin publish + pairing E2E
- [ ] FigJam production E2E
- [ ] Moodboard → any export (not in scope yet)

---

## 5. Git workflow — `work` is the target branch

**Rule:** **`work` = primary target.** PRs merge into `work`. `monorepo` is also fine for iMac integration when needed.

```txt
feature/xyz  →  PR  →  work (target)
                ↓ optional
              monorepo (iMac / backup integration)
```

```txt
LAPTOP                           iMAC (optional)
────────                         ──────────────
1. Branch from work
2. Commit + push feature branch
3. PR → work                     OR merge work locally on iMac
4. Greptile reviews PR
5. Merge to work
6. git pull origin work on all machines
```

### Laptop — now (copy-paste)

```bash
cd /path/to/stage_mvp
git checkout work
git status

# Stage everything for yesterday's work (review diff first)
git add -A
git status

git commit -m "$(cat <<'EOF'
Add desktop chat shortcuts, energy plan, and companion refactor.

EOF
)"

git push -u origin work
```

### iMac — after push

```bash
git fetch origin
git checkout work
git pull origin work
# optional: git checkout monorepo && git merge origin/work && git push origin monorepo
pnpm install
cd apps/user-application && pnpm build
```

### After merge / pull on iMac

1. Build + install DMG  
2. Run **terminal idle test** (energy plan §1)  
3. Start **P0 energy fixes** on branch `fix/desktop-idle-energy` → PR → **`work`**

---

## 6. Greptile only reviews PRs — what else?

Greptile is **one layer**. Add these **before** PR:

| Layer | Tool | When |
|-------|------|------|
| Local | `pnpm typecheck`, `cargo check` | Every commit |
| Pre-push | `scripts/desktop-idle-benchmark.sh` (to build) | Before desktop release |
| PR | **Greptile** | Automatic on PR |
| PR | GitHub Actions: lint + test | On every PR (to add) |
| Post-merge | Datafa.st | Production usage |
| Manual | Notion “TESTING VERY IMPORTANT” card | Release checklist |
| Partner | Adrien smoke test | Optional after you PASS locally |

**Custom Context in Greptile:** point it at `PROJECT_STATUS.md`, `ARCHITECTURE.md`, and `AGENTS.md` so PR reviews align with your architecture.

---

## 7. Markdown files — what we do

### Keep alive (update in place)

- `PROJECT_STATUS.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- `apps/user-application/docs/AI/desktop/README.md`
- Active !!! plans (energy, this operating plan)

### Notion “Stage — Start here” page (create once)

Link to:

- GitHub `PROJECT_STATUS.md`
- Bug board + Task board
- Current desktop version
- Top 3 blockers (copy from status weekly)

### Old `.md` plans

Add at top:

```markdown
> **Status:** archived — see PROJECT_STATUS.md
```

Do **not** bulk-delete. Do **not** copy into Notion.

---

## 8. Work order (next 7 days)

| Day | Laptop / iMac | Output |
|-----|---------------|--------|
| **1** | Laptop: commit + push `work` | Remote `work` up to date |
| **1** | iMac: merge `work` → `monorepo` | Single integration branch |
| **2** | iMac: baseline DMG idle test (terminal §1) | Numbers in results log |
| **2–4** | P0 energy: engine idle stop, lazy companion, backgroundThrottling | PR to `monorepo` |
| **3** | Greptile PR + fix review comments | Merge |
| **4** | Convex deploy + Notion export live test | Notion card → Done with proof |
| **5** | Re-run idle test → ship **v0.1.56** if PASS | Adrien optional retest |

---

## 9. Notion board sync (suggested)

| Notion card | Repo truth |
|-------------|------------|
| Bug: not responding macOS | Energy plan P0 |
| TESTING VERY IMPORTANT | Terminal §1 + future Playwright |
| CI/CD for desktop builds | GitHub Actions (not started) |
| ChatBot redesign | Uncommitted chat work → commit on `work` |
| Export tasks | Verify §4 table before marking Done |

---

## 10. What now? (one screen)

1. **Commit and merge the integration branch into the final target branch**
2. **Build and install a packaged DMG**
3. **Run the 30 min idle baseline**
4. **Implement energy P0: engine idle stop, lazy companion, hidden-work pause**
5. **Deploy Convex and run destination E2E for Notion, Figma, and FigJam**
6. **Update `PROJECT_STATUS.md` after each proven result**

**!!! Do not start new `.md` plans — update status + Notion instead.**
