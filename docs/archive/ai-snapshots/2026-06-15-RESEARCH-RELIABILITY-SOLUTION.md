# Research Reliability Solution — 15 June 2026

**Goal:** Make Claude and Codex Research faster, evidence-based, type-safe, and predictable.

## Proposed Workflow

1. **Provider preflight**
   - Run a tiny real Claude/Codex request before Refero or crawling.
   - Provider failure must use **0 Refero calls**.

2. **Collect evidence**
   - Load project brief, website, target users, notes, and competitor URLs from Convex.
   - Crawl a fixed set of relevant competitor pages with strict limits, timeouts, and caching.
   - Run five Refero category searches and one flow search.
   - Use Refero CDN previews first; fetch at most one full image per category.

3. **Generate factual Research**
   - Claude/Codex receives only the collected evidence.
   - Generate the company snapshot, competitor findings, matrix, target users, and source references.
   - Every competitive claim must include supporting evidence and a source URL.

4. **Validate and repair**
   - Validate each section against the Rust and Zod Research contracts.
   - Keep valid sections and omit invalid unsupported fields.
   - Run at most one targeted repair request for missing required data.
   - One missing matrix cell must never fail the complete Research run.

5. **Generate Opportunities separately**
   - Run Claude/Codex again using the validated Research report.
   - Opportunities must connect competitor gaps, target-user needs, and project goals.
   - Each opportunity must explain why it matters and reference supporting Research findings.

6. **Save**
   - Save only type-safe, evidence-backed output to Convex.

## Non-Negotiable Rules

- Never invent facts, competitors, evidence, matrix dimensions, or scores.
- Never create placeholder `OK` or `N/A` values.
- Omit unsupported findings instead of fabricating them.
- Use bounded calls, retries, crawl pages, and timeouts.
- Cache competitor evidence and Refero results for repeated runs.

## Success Criteria

- Failed provider preflight: **0 Refero calls**
- Default Research: **6–11 Refero calls**
- No `Dimension N`, fake `OK`, or `N/A`
- One malformed field cannot fail the complete run
- Opportunities are generated after validated Research
- Claude and Codex produce the same required typed structure

## Implementation Status

- Implemented: real provider preflight before Refero, bounded Refero calls, CDN-first images, web research tools for factual Research, unsupported output omission, one targeted competitive repair, separate Opportunities pass, and typed Rust/Zod validation.
- Live provider check: Claude web search works with restricted `WebSearch`/`WebFetch`; Codex currently returns `401 Unauthorized` and must be re-authenticated before testing.
- Still requires live testing: repeated Claude and Codex Research runs with real competitor websites.
- Remaining limitation: the provider controls its web-search tool-call count; the four-page limit is instructed but not hard-enforced by Stage.
