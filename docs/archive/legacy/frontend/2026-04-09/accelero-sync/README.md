# Accelero Frontend Sync Handoff

Date: 2026-04-09
Scope: Frontend only
Status: Planning

This folder is the single handoff folder for the Accelero HTML-to-React sync work.

Use these files in this order:

1. `html-inventory.md`
   - every HTML handoff file
   - whether it is in scope now
   - whether it should be updated later
   - whether it should not be touched in this pass

2. `react-file-map.md`
   - exact React routes/components that map to each HTML file
   - what should be changed
   - what should not be changed

3. `integration-notes.md`
   - frontend notes for research rendering, Stitch, Figma, Notion, cloud/automation, and MCP
   - what can be designed now without blocking on backend decisions

4. `execution-order.md`
   - recommended implementation order for the frontend pass
   - start with core app shell pages first

## Core Decision

This pass is for visual/frontend alignment only.

The main job is:

- translate the Accelero HTML references into the real app
- keep the real product routes and logic intact
- avoid rebuilding backend behavior inside the frontend

## Update Now

- Dashboard
- Project Detail
- Settings
- Client Portal
- Generate / Stitch page

## Plan Now, Build Later

- Research
- Strategy
- Assets
- project-level Integrations

## Do Not Update In This Pass

- Landing
- Auth
- Task Detail
- Project Creation Modal
