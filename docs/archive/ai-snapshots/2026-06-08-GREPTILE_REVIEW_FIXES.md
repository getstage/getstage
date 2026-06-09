# Greptile Review Fixes

Last updated: 2026-06-08

## Purpose

This document tracks the review findings raised after merging the desktop shortcuts, main-window companion routing, and persistent chat-history work into the monorepo.

## Current Change

### Preserve chat history sort order

**Problem**

Opening an existing chat replaces the `messages` state. The chat persistence effect interpreted that state replacement as a content edit, assigned a new `updatedAt`, and promoted the opened chat to the top of history.

**Resolution**

- Mark the next `messages` update as non-persistent when switching chats.
- Keep the current chat in a ref so persistence can be calculated outside React state updater callbacks.
- Continue storing the selected active chat without modifying its existing `updatedAt`.
- Rely on the chat-store change event to refresh the history snapshot.

**Result**

Chat history remains sorted by last-modified time instead of last-opened time.

## Additional Review Findings

| Finding | Planned resolution | Status |
|---|---|---|
| Side effects inside the `setActiveChat` functional updater | Compute and persist the next chat outside the updater | Fixed |
| Duplicate list-item React keys | Include the list position in each key | Fixed |
| Synchronous localStorage writes during every streaming chunk | Persist only finalized or failed responses while keeping streaming state in memory | Fixed |
| `globalShortcut.unregisterAll()` removes unrelated shortcuts | Unregister only accelerators owned by the voice shortcut module | Fixed |
| Shortcut defaults duplicated between main and renderer | Move defaults into the shared desktop model module | Fixed |
| Windows/Linux Ctrl recording differs from the cross-platform default | Normalize Meta or Ctrl to `CommandOrControl` | Fixed |
| Orphan companion cleanup destroys every non-main window | Restrict cleanup to the known legacy companion URL or title | Fixed |
| Single-instance lock applies during development | Restore the development guard | Fixed |
| `navigator.platform` is deprecated | Use the renderer user-agent platform signal | Fixed |
| Generated route tree was edited manually | Regenerate when the TanStack Router generator is available | Pending |

## Verification

- [x] Run desktop TypeScript typecheck.
- [x] Run the desktop production build.
- [x] Run `git diff --check`.
- Manually open older chats and confirm their history order does not change.
- Send a new message and confirm only that modified chat moves to the top.
