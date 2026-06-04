# 04-06-2026 — DESKTOP: KANBAN, TAAKDETAIL, PROJECT AFRONDEN

**Scope:** alleen `apps/user-application` + `packages/data-ops` (Convex). Geen web-app.

---

## WAT “FASE BIJ AANMAKEN” BETEKENT (GEEN JARGON)

Een **project** bestaat uit meerdere **fases** (Discovery, Strategy, Design, …). Elke taak hoort bij **één fase**.

In het create-modal staat een dropdown **fase** (naast project en priority). Daarmee kies je: *in welke projectfase komt deze taak?*

Dat is **niet** hetzelfde als de kanban-kolom (Backlog / To-do / In-progress / Done):

| Concept | Voorbeeld | Waar zichtbaar |
|--------|-----------|----------------|
| **Fase** | Discovery, Launch | Dropdown bij “Create Task” |
| **Kanban-kolom** | To-do, In-progress | Kolom op het projectbord (+ bij + in die kolom |

Voorheen: nieuwe taak ging altijd naar de “actieve” fase en landde visueel vaak in In-progress. Nu: gekozen **fase** + gekozen **kolom** worden opgeslagen.

---

## WAT IS GEDAAN

### A — KANBAN-KOLOM OPSLAAN

- Nieuw veld `boardStatus` op Convex-tabel `tasks`.
- Mutatie `desktop.setTaskKanbanColumn` + drag in `useKanbanBoard` roept server aan (niet alleen lokaal scherm).
- `getTaskStatus()` leest eerst `boardStatus`, daarna pas fallback.
- Aanmaken via `+` in een kolom: `initialBoardStatus` = die kolom.

### B — FASE BIJ AANMAKEN

- `desktop.createTask` accepteert optioneel `phaseId`.
- `CreateTaskDialog` toont fase-dropdown als `phaseOptions` meegegeven (projectpagina).
- `KanbanBoard` geeft `live.phases` door.

### C — PROJECT AFRONDEN

- Menu: **Complete Project** (bevestigingsmodal).
- Zet `projects.status` op `completed` via bestaande `projects.update`.
- Auto-complete bij alle taken af blijft via `recomputeProjectState`.

### D — TAAKDETAIL (DESKTOP)

- `TaskDetailsView` mock verwijderd → live `api.tasks.getDetail`.
- **Description**-label direct onder de meta-regel (assignee · datum · status), zoals gevraagd.
- Bewerkbare titel + beschrijving (debounced save).
- **Attach File** → R2 `task-attachment` + `tasks.saveAttachment` / delete.
- Upload vereist `projectId` (uit URL of task-detail).

### E — BETROUWBAARHEID (TOYOTA)

- Geen dubbele save tijdens pending upload.
- Attach-knop disabled tijdens upload.
- Kanban-drag: optimistic UI + rollback bij API-fout.
- Create-task: disabled tijdens `isPending`.

---

## AUDIT-TABEL

| # | Onderdeel | Was | Nu | Status |
|---|-----------|-----|-----|--------|
| 1 | Project blijft Active na afronden | Alleen auto bij 100% taken | + knop **Complete Project** | Gedaan |
| 2 | Drag naar andere kolom | Alleen lokaal / Done toggled | `boardStatus` + `setTaskKanbanColumn` | Gedaan |
| 3 | Taak in To-do → In-progress | Geen kolom in DB | `boardStatus` bij create + drag | Gedaan |
| 4 | Fase-dropdown backend | Frontend klaar, geen `phaseId` | `createTask(phaseId)` | Gedaan |
| 5 | Taakpagina inhoud | Hardcoded `TASK_SECTIONS` | Live content + edit | Gedaan |
| 6 | Attach file | Geen handler | R2 upload + attachments | Gedaan |
| 7 | Description-plaatsing | In mock-secties | Label onder meta (header) | Gedaan |
| 8 | Web-app | — | Bewust niet gewijzigd | N.v.t. |

---

## BESTANDEN (KERN)

**Data-ops**

- `packages/data-ops/convex/schema.ts` — `tasks.boardStatus`
- `packages/data-ops/convex/desktop.ts` — `createTask`, `setTaskKanbanColumn`
- `packages/data-ops/convex/domain/projects/service.ts` — `setTaskKanbanColumnForUser`, toggle patch
- `packages/data-ops/src/contracts/desktop-api/task.ts` — `taskBoardStatusSchema`

**Desktop**

- `hooks/project/useKanbanBoard.ts`
- `components/tasks/CreateTaskDialog.tsx`
- `components/tasks/TaskDetailsView.tsx`
- `components/project/header/ProjectActionsMenu.tsx` + modals + `useProjectHeaderActions.ts`

---

## TESTEN (HANDMATIG)

1. Project openen → taak in **To-do** slepen → refresh → blijft To-do.
2. `+` in **Backlog** → nieuwe taak in Backlog.
3. Create modal → fase **Discovery** → taak in die fase / juiste kolom.
4. Taak openen → tekst wijzigen → “Saved” → refresh → tekst blijft.
5. Attach file (vanuit project-flow met `projectId` in URL).
6. ⋮ project → **Complete Project** → status Completed.

---

## DEPLOY

Na schema-wijziging: `npx convex dev` / deploy in de juiste Convex-omgeving zodat `boardStatus` op bestaande tasks `optional` blijft (geen migratie nodig voor oude rijen).
