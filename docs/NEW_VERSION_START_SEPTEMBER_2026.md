# New version start — September 2026

**Status:** In progress — Parts 1–2 done. **Next: Lo-Fi-only Wireframes UI.**  
**Branch:** `codex/sta-33-local-project-export` · desktop `0.2.26` testing  
**File:** `docs/NEW_VERSION_START_SEPTEMBER_2026.md`

Uncheck anything you do not want.

---

## Do this

### Marketplace / skill page

- [x] Remove the **Get Stage** CTA from desktop skill detail  
      Path: Settings → Integrations → Marketplace → open a skill → scroll down  
      File: `SkillDetailPanel.tsx`
- [x] Change Marketplace **Added** → **Uninstall** (removes from `installedSkillIds`)
- [x] Fix **Share**: copy the skill GitHub `sourceUrl`, not `https://www.stage.ai/skill/…` (that URL has no page)

### Skills + Components pickers

Kill the five exclusive dropdowns (`Design skill` / `Motion skill` / `Base system` / `Page sections` / `Data visuals`). They confuse people and hide the Integrations model.

**Two groups, like Integrations:**

1. **Skills**
2. **Components**

**UI = Marketplace cards, not dropdowns.** Copy the Integrations → Marketplace grid (`SkillArtwork` + name + description + chips + action). Difference: **already-added items sit on top**, then the rest of the catalog underneath so the user can add more without leaving the flow.

- [x] Replace `SkillsComponentsPanel` (five `CategorySelect`s) with two Marketplace-style lists: Skills, Components
- [x] **Top of each list:** items the user has added (`installedSkillIds` / `enabledComponentPackIds`)
- [x] **Below:** catalog with **+ Add Skill** / **+ Add Library** (same actions as Marketplace)
- [x] Project selection is a multi-select from the added list → persist `skillIds[]` + `componentPackIds[]` (drop the five-axis exclusivity)
- [x] Same picker in: **export step 2**, **Wireframes run prefs**, create-project if we wire it
- [x] Files today: `SkillsComponentsSelect.tsx`, `ProjectExportDialog.tsx`, `WireframeRunSelection.tsx`

### Export → dropdown of installed IDEs

Header **Export** (and the Wireframes toolbar export icon) should open a **dropdown**, not a row of four huge buttons.

Dropdown items:

1. **Export only**
2. **Open in …** — only tools actually installed on this Mac
3. **Add skills & components** — opens the picker above (so export is also how you attach skills)

Rules:

- [x] Keep **Export only**
- [x] Show **Open in …** only for tools actually installed on the Mac
- [x] Never use PATH `cursor` (agent shim, not the IDE) — launch Cursor/VS Code/Zed/Antigravity/Windsurf via `open -a` / Launch Services
- [x] Collapse the current Claude / Codex / Cursor / VS Code button row into that dropdown
- [x] One more dropdown item: **Add skills & components**

**Icons we already have:** Claude Code, Codex, Cursor, VS Code, Zed, Antigravity, Windsurf  

**Waiting on Werner SVGs** (then we detect + show if installed):

- [x] Zed
- [x] Antigravity
- [x] Windsurf
- [ ] Trae
- [ ] VSCodium (optional)
- [ ] Other: ________

### Wireframes = Lo-Fi only (after pickers)

- [ ] Remove the Lo-Fi / Hi-Fi chooser; always start Lo-Fi
- [ ] Remove Hi-Fi generate / upgrade actions from the Wireframes UI
- [ ] Keep skills/libraries as **export agent prefs**, not Stage Hi-Fi generation
- [ ] **Keep** all Rust / engine Hi-Fi code (UI never starts it)

### Export agent instructions

- [ ] Tighten exported `AGENTS.md`: must use `skills.md` libraries, do not hand-roll them
- [ ] `skills.md` stays public GitHub/docs URLs only (no R2)

### GitHub Import (after Uninstall)

Skills have **no small logo** (mesh on the detail page only). Import is name + URL.

- [ ] Replace the copy icon on Installed Skills with **Import**
- [ ] Paste GitHub URL → store name + `sourceUrl`; **no skill icon required**
- [ ] Same **Import** on Component Libraries (libraries *do* use a logo → generic pack mark until Werner drops an SVG)
- [ ] Imported items show at the **top** of the two pickers and in exported `skills.md`
- [ ] Reuse `parseGithubSourceUrl` / `parsePublicHttpsUrl` (Part 1). Do not invent a second URL parser.

---

## Not this cut

- [ ] Public web skill page + Get Stage CTA (`apps/web-application`)
- [ ] Crawl / add aura.build skills catalog
- [ ] Delete Rust/engine Hi-Fi code
- [ ] Change Lo-Fi generation, RAG, or provider pipelines

---

## Build order

1. Get Stage CTA + Uninstall + Share URL — **done 2026-09-08**
2. **Skills / Components Marketplace pickers + export dropdown** — **done 2026-09-08**
3. Lo-Fi-only Wireframes UI (engine Hi-Fi stays) ← next
4. Stronger `AGENTS.md`
5. GitHub Import (skills = no icon; libraries = generic mark)
6. Extra IDEs after Werner sends SVGs

---

## Progress

### Part 1 — Marketplace hygiene + URL allowlist (2026-09-08)

**What changed**

- Removed the purple **Get Stage** marketing block from skill detail. Users are already inside Stage.
- Marketplace **Added** is now **Uninstall**. That removes the skill from `installedSkillIds` and `enabledSkillIds`. Same action on the skill detail header/sidebar.
- **Share** copies the curated GitHub `sourceUrl` (owner/repo), not `https://www.stage.ai/skill/{id}` (that route does not exist).

**Why the security layer landed now**

Import (part 5) will let users paste a GitHub URL. If we only validate later, Share / open-external / Convex prefs stay as string holes. Part 1 puts the same typed allowlist in TypeScript and Electron so Import reuses it instead of inventing a second parser.

**Type-safe checks (TypeScript + Electron; Rust untouched)**

| Layer | File | Rule |
|---|---|---|
| Shared Zod/parsers | `apps/user-application/shared/models/safeHttpsUrl.ts` | HTTPS only, no credentials, no localhost/private IPs, no `token=` in query/hash. GitHub source URLs must be `github.com/{owner}/{repo}` (not `/login`, `/settings`, or lookalike hosts). Skill/pack ids are lowercase kebab-case, max 64. |
| Renderer | `openExternalLink.ts`, Share dialog | Parse before `window.open` / clipboard. Share copies only a parsed GitHub URL. |
| Electron main | `electron/ipc.ts` `shell:open-external` | Same `parsePublicHttpsUrl` — renderer cannot skip the check via IPC. |
| Convex | `updateSkillHubPrefsHandler` | Rejects ids that are not kebab-case (same regex as TS). Empty uninstall lists are allowed. |
| Catalog test | `skillsCatalog.test.ts` | Every curated skill `sourceUrl` must already pass the GitHub parser. |

**What we did not do**

- No GitHub fetch / Import UI yet (part 5).
- No Rust/engine change. Import v1 does not go through `stage-engine`. If we later fetch `SKILL.md` in Rust, the same rules belong there: `https` only, `github.com` host, no credentials, owner/repo path. Hi-Fi engine code stays.
- No extra IDE icons (waiting on SVGs).

### Part 2 — Skills/Components picker + export dropdown (2026-09-08)

**Why**

The five exclusive dropdowns did not match Integrations. Users pick from what they already added, with Marketplace cards, and can add more in the same flow. Export is a dropdown of apps actually on this Mac — not four huge buttons.

**What changed**

- `SkillsComponentsPanel` is two Marketplace-style lists (Skills / Components). Added items on top; catalog with **+ Add Skill** / **+ Add Library** below.
- Selecting an added card attaches it to the project (`skillIds[]` / `componentPackIds[]`). No more Design/Motion/Base/Sections/Charts axes.
- Same picker: export step 2, Wireframes run prefs, create-project.
- Header **Export** is a dropdown: Export only · Open in {installed} · Add skills & components.
- Export dialog footer is the same destination menu (no button row). GUI IDEs (Cursor, VS Code, Zed, Antigravity, Windsurf) launch via Launch Services (`open -a`), never PATH shims.
- Ids still go through `skillHubIdSchema`. Convex `normalizeCatalogIds` now drops non-kebab strings.

**What we did not do**

- Lo-Fi-only Wireframes UI (part 3).
- Stronger `AGENTS.md` (part 4).
- GitHub Import UI (part 5).
- Trae / VSCodium (no SVGs yet).
