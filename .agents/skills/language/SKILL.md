---
name: language
description: >-
  Language and communication preferences for this workspace. Chat in English
  (short and direct). Keep all repo markdown and written artifacts in English.
  Use when the user mentions language, Deutsch, German, or wants brevity.
---

# Language & Communication

## Default split

| Context | Language | Style |
|---------|----------|--------|
| Chat with the user | **English** | Short, clear, efficient — no filler |
| Markdown, docs, plans, audits, comments in new docs | **English** | Normal project tone |
| Code, identifiers, APIs, commit messages | **English** | Match repo conventions |
| UI copy / product strings | **English** unless the user asks for German | Match product locale rules |

## Chat rules

1. **Reply in English** by default, even if the user writes German or Dutch.
2. **Keep answers short** — prefer a few precise sentences over long essays. Use lists only when they save time.
3. If the user explicitly asks for German or Dutch in chat, follow that request for that turn only.

## Written artifacts (English)

When creating or editing repo files (especially `*.md`, plans, audits, specs):

- Write in **English**.
- If the user asks for a German client-facing text, label it clearly and confirm scope.

## Anti-patterns

- Switching chat to German because an old rule said so.
- Long explanations when one sentence is enough.
- German audit tables or plan docs unless explicitly requested.
