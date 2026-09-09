# Pipeline refocus — September 2026

**Positioning:** Stage does the thinking. Your AI does the building.

Stage does not output Stage hi-fi. The user leaves with a spec (Markdown + `AGENTS.md`) and opens it in Cursor / Claude Code / Codex. Stage still produces research, strategy, moodboard, style guide, flows, and Lo-Fi wireframes. The coding agent builds the hi-fi.

**Branch:** `codex/sta-33-lofi-desktop` · desktop `0.2.27` testing  
**Linear:** `STA-33`
**File:** `docs/NEW_VERSION_START_SEPTEMBER_2026.md`

Stay on this branch. Do not create `contact/sta-33-pipeline-refocus`.

Uncheck anything you do not want.

---

## Today — full list (2026-09-09)

This is Werner’s list. Skills & components stay in the **export dialog**. They do **not** belong in the header Export dropdown.

**Now shipping: sections 1–4.** Sections 5–8 (Details.so during research testing, style guide, MCP, categories) come after this lands.

### Status — 2026-09-09 evening

**Done on this branch:** sections **1–4**. Header **Export** opens the dialog. Destinations (**Export only** + Open in installed IDEs) live in the **dialog footer** on both steps. Skills stay in the dialog. GitHub **Import** is on Installed Skills and Component Libraries (Werner’s GitHub SVG). **Lo-Fi wireframes are done:** desktop UI is Lo-Fi only; Werner verified a live Codex generate (`Report preview` results card). Existing **Lo-Fi** artifacts still open as results. Existing **Hi-Fi** artifacts are hidden; those users land on Configure and generate Lo-Fi. Engine still contains Hi-Fi. Lo-Fi runs drop `html`. Provider JSON dumps are not shown as Codex usage-limit errors.

**Not shipped yet**

- Schema for `users.importedSkillHubItems` is in the repo; **not pushed** to testing Convex (`reliable-bullfrog-917`). Import UI exists; persist needs that deploy.
- skills.sh paste: skipped (Werner said never mind).
- Sections **5–8** not started.

### 1. Docs

- [x] Living docs match this list (`docs/NEW_VERSION_START_SEPTEMBER_2026.md`, `PROJECT_STATUS.md`, desktop README)

### 2. Export (STA-D)

What we have: header **Export** (opens dialog) + **Export project** dialog with destinations in the footer.

**Header (opens dialog; not a destination menu)**

- [x] Header **Export** next to Share opens the export dialog
- [x] **Take “Add skills & components” out of the header.** Adrien: it is not an export destination
- [x] Destinations live in the **dialog**: **Export only** + **Open in {installed}** (Claude Code, Codex, Cursor, VS Code, Zed, Antigravity, Windsurf)
- [x] Never launch Cursor via PATH `cursor` (agent shim). GUI IDEs use `open -a` / Launch Services

**Dialog (keep this, including skills)**

- [x] Keep the **two-step Export project dialog**. This is the right UI.
- [x] **Step 1 — Include in export:** checklist of stages (Research, Strategy, Moodboard, Style guide, Flows, Wireframes, Assets). Pre-checked when they exist, individually uncheckable. Type stays **13px / 12px** (do not enlarge). Slightly taller row padding only.
- [x] **Step 2 — Skills & components stays here.** Attach skills and libraries for the coding agent. Step 1 has a **Skills & components** control to reach this step. Do not move it to the header.
- [x] Stronger exported `AGENTS.md`: folder purpose, project category, reading order, carry moodboard + style guide, use `skills.md` (do not hand-roll a different kit).

### 3. GitHub Import — Skills **and** Components

Same pattern on both Integrations pages.

- [x] **Installed Skills:** **Import** top-right (GitHub SVG). Paste a public GitHub URL → name + `sourceUrl`. Skills use the same mesh banners as the catalog (warm / cool / green), not a GitHub logo on the card.
- [x] **Component Libraries:** same **Import**. Libraries use the generic pack mark until Werner drops library SVGs.
- [x] Imported items show at the top of the pickers (export dialog step 2, Wireframes prefs) and in exported `skills.md`.
- [x] Reuse `parseGithubSourceUrl` / `canonicalGithubRepoUrl` / Convex `githubImport.ts`. Do not invent a second parser. Do not scrape aura.build.
- [ ] Push `importedSkillHubItems` schema to **testing Convex** (then prod later, when Werner asks)

### 4. Wireframes (STA-A)

Stage is not outputting Stage hi-fi anymore. Hide generation. Do not delete the engine.

- [x] Hi-fi generation gone from the UI. No disabled button, no “coming soon”, no greyed-out entry.
- [x] Lo-fi wireframe generation stays. Runs are forced to `kind:lofi`; provider `html` is stripped.
- [x] Existing production Lo-Fi artifacts still show block results. Existing Hi-Fi artifacts are not shown; Configure keeps the screen list so the user generates Lo-Fi again.
- [x] Cancel stops the provider run and marks the matching Convex run `cancelled`; engine UUIDs and Convex document IDs are never mixed.
- [x] Hi-fi remains an engine capability; the desktop wireframes UI has no Hi-fi path.
- [x] No user-facing copy that promises Stage hi-fi / high-fidelity generation (including leftover phase tasks like “Design high-fidelity screens”).
- [x] Skills/libraries are **export agent prefs**, not Stage hi-fi knobs.
- [x] Lo-Fi generate verified on desktop (2026-09-09): Codex `kind:lofi` for `screen-report-preview` saved and showed the results grid. No hi-fi path in the UI.

### 5. Details.so research routing (STA-C) — after sections 1–4

Refero stays for apps. It stops serving marketing websites.

Details.so MCP is **not** a silent background job. It is triggered **while testing / running Research** on a Websites project (explicit user action in that flow).

- [ ] Project category **Websites** → Details.so MCP. Research returns Details references (curated marketing-site screens, not Refero app UI).
- [ ] Project category **Web apps** → Refero, unchanged.
- [ ] Project category **iOS apps** → Refero, unchanged.
- [ ] Screenshots shown once in the UI, then analysed and incorporated by the AI.
- [ ] Triggered during research testing / run (a button in Research), not fired silently on every other step.
- [ ] Credits stay bundled in Stage’s price. Never expose a Details credit meter to the end user.

### 6. Style guide (STA-E) — today

- [ ] Style guide is aware of project category (Websites / Web apps / iOS apps) and applies matching conventions.
- [ ] Style guide is grounded in the **actual research references**, not generated in isolation.
- [ ] **Critical:** the moodboard must survive. Test with a moodboard far from model-default. If output drifts back to beige/brown + default type + default grid, it has failed.
- [ ] Style guide in the export is usable by a coding agent with no manual rewrite.

### 7. MCP — today

- [ ] Details MCP wired for Websites research (same as STA-C). Explicit button.
- [ ] Do not build a second silent MCP fire-on-every-step.
- [ ] Kevin is available this week. Little custom connector if Stage needs one to render results.

### 8. Categories (STA-B) — today, because C and E read from them

Categories already exist. This is wording + lock + routing key.

- [ ] Exactly three options at create: **Websites**, **Web apps**, **iOS apps**. Replace “app design” with **iOS apps**.
- [ ] Required at creation. No default, no skip.
- [ ] Immutable after create. Not editable in settings.
- [ ] Shown on the project so the user always sees what they picked.
- [ ] Persisted on the project record. Research, style guide, and export all read it.

---

## Already done (do not redo)

- [x] Get Stage CTA off skill detail; Marketplace **Uninstall**; Share copies GitHub URL; URL allowlist — 2026-09-08
- [x] Skills / Components Marketplace pickers (added on top, catalog below); export dropdown of installed IDEs — 2026-09-08
- [x] Export dialog step 2 already exists as the skills/components picker. **Keep it.**

---

## Out of scope (do not do)

- Public `stage.ai` skill page + Get Stage CTA on the web app
- Crawl / add aura.build into the catalog
- **Delete** Rust/engine hi-fi code (hide only)
- Lo-Fi **quality / RAG** work (`docs/WIREFRAMES_QUALITY_PLAN.md`) — generation itself is shipped
- Trae / VSCodium until Werner sends SVGs
- Adrien’s landing-page rebuild (not this branch)
- Exposing Details credits to the end user

---

## STA-33 map

| ID | Today |
|---|---|
| **STA-A** | Hide hi-fi UI. Lo-fi stays. Engine stays. |
| **STA-B** | Websites / Web apps / iOS apps, locked at create. Needed so C and E know what the project is. |
| **STA-C** | Websites → Details.so MCP; web/iOS apps → Refero. |
| **STA-D** | Export headline. Header opens dialog. Destinations in dialog footer. Dialog keeps skills step. Stronger `AGENTS.md`. |
| **STA-E** | Style guide from references + moodboard. No beige/brown fallback. |
| **MCP** | Details MCP on an explicit button for Websites. |
