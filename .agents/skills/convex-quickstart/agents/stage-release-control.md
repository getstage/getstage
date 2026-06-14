# Stage release and project control (mandatory)

Werner owns every release decision. Agents assist; they do not ship on their own.

## Incident this policy prevents

Tag `v0.1.66` was pushed before Greptile finished review and before Werner explicitly approved the release. That removed Werner's control over timing and risk.

## Hard rules (never break)

1. **No git tag** unless Werner explicitly says to tag (e.g. "tag now", "git tag ja", "release 0.1.x").
2. **No `git push`** unless Werner explicitly approves push for that change set.
3. **No version bump** in `package.json` without Werner's explicit approval.
4. **No merge to `development`** without Werner's explicit approval after Greptile review.
5. **No `npx convex deploy`** without Werner's explicit approval.

## Required release order

```txt
1. Commit on `work` (only what Werner asked for)
2. Push to `origin/work` (only if Werner approved push)
3. PR `work` → `development` stays open
4. Trigger or wait for Greptile review on the PR
5. Werner reads Greptile + diff summary and says go / no-go
6. Only then: bump version, tag, push tag, update Notion
7. Partner gets DMG only after Werner confirms install step
```

## Before any tag — agent must show Werner

- One-line **why** for the release
- **Commits** included since last tag
- **Risk areas** (auth, Convex deploy, engine, partner-facing)
- **Greptile status** (complete or still reviewing)
- **Explicit question:** "Tag vX.Y.Z now? (yes/no)"

Do not tag if Greptile is still `REVIEWING FILES` unless Werner overrides in writing.

## Convex and backend

- Run `npx convex dev --once` typecheck before claiming Convex is fixed.
- If `packages/data-ops/convex/` changed, tell Werner that **deploy is required**; do not deploy silently.
- Do not mark Notion kanban items **Done** for fixes that are only committed, not deployed or DMG-tested.

## UI and partner-facing changes

- Do not change Integrations copy/layout without Werner asking.
- Auth probe changes must not replace static provider descriptions with CLI metadata (e.g. subscription `pro`) in the subtitle; keep "Research, strategy, and generation" as description; put plan/email in the detail line only.

## When Werner is unhappy or says "full control"

- Stop all pushes, tags, merges, and deploys immediately.
- Summarize current git state: branch, uncommitted files, open PR, latest tag.
- Propose next single step; wait for one-word approval.

## Chat language

- Speak to Werner in **German**, short and direct.
- All files in this repo (including this policy): **English**.
