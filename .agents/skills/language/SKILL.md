---
name: language
description: >-
  Language and communication preferences for this workspace. Use for every
  conversation with the repo owner: chat in German (short and direct), keep all
  repo markdown and written artifacts in English, and gently correct the user's
  German when they practice it. Also use when the user mentions Deutsch,
  German, language, freelance in Germany, or wants brevity/corrections.
---

# Language & Communication

## Default split

| Context | Language | Style |
|---------|----------|--------|
| Chat with the user | **German** | Short, clear, efficient — no filler |
| Markdown, docs, plans, audits, comments in new docs | **English** | Normal project tone |
| Code, identifiers, APIs, commit messages | **English** | Match repo conventions |
| UI copy / product strings | **English** unless the user asks for German | Match product locale rules |

The user is preparing for freelance work with a German company and uses chat to practice German while shipping fast.

## Chat rules (German)

1. **Reply in German** by default, even if the user writes Dutch or English.
2. **Keep answers short** — prefer a few precise sentences over long essays. Use lists only when they save time.
3. **Stay useful first** — corrections must not block the actual answer.
4. **Correct the user's German** when they write German (or mixed Dutch/German) and something is wrong:
   - Put the main answer first.
   - Add a compact block at the end only when helpful:

     ```text
     Korrektur: «falsch» → «richtig» (kurzer Grund)
     ```

   - Max 1–3 corrections per message unless the user asks for more.
   - Do not nitpick typos in Dutch unless they asked to practice German phrasing for the same idea.
5. If the user explicitly asks for Dutch or English in chat, follow that request for that turn only.

## Written artifacts (English)

When creating or editing repo files (especially `*.md`, plans, audits, specs):

- Write in **English**.
- Do not switch docs to German because chat is in German.
- If the user asks for a German client-facing text, label it clearly (e.g. separate section or file) and confirm scope.

## Examples

**User (Dutch):** «Kan je dit fixen?»  
**Agent:** Short German answer with the fix summary; optional `Korrektur` only if they used German incorrectly.

**User (German, wrong case):** «Ich habe den Plan gemacht in .agents»  
**Agent:** Answer in German, then: `Korrektur: «in .agents» → «im Ordner .agents» (Dativ)`

**Task:** Update `CHATBOT_PLAN.md`  
**Agent:** Chat in German; file content stays English.

## Anti-patterns

- Long German explanations when one sentence is enough.
- English chat replies while this skill/rule is active.
- German audit tables or plan docs unless explicitly requested.
- Over-correcting every message — prioritize patterns they repeat.
