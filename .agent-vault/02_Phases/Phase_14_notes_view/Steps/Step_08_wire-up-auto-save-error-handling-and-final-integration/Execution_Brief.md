# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- Final integration step: tie all components together, add auto-save, error handling
- Auto-save should debounce (save after user stops typing for ~1 second)
- Error handling: show toast/notification on save failure, allow retry

## Prerequisites

- Steps 01-07 must be complete (all components implemented)

## Relevant Code Paths

- All notes-related files in renderer and main process

## Execution Prompt

1. Harden auto-save in NotesView/TiptapEditor:
   - Debounced save: serialize Tiptap document to markdown 1 second after last edit, write via IPC
   - Save state indicator in the editor chrome: `saving...` → `saved ✓` → `error ✗`
   - On save failure: show inline error banner in the editor area with "Retry Save" button and "Copy to Clipboard" fallback. Content stays in the editor buffer — no data loss.
   - Auto-retry with exponential backoff (max 3 retries) before surfacing the banner
2. Handle active-file lifecycle events:
   - If active file is renamed via tree: update editor path reference without losing unsaved content
   - If active file is deleted via tree: show recovery banner ("File was deleted. Save as new note?")
   - If file is modified externally (outside the app): detect on re-focus/timer, show reload prompt or last-write-wins banner
3. Final integration validation:
   - Ensure full flow: side panel tree → file selection → editor load → edit → autosave → close app → reopen → content persists
   - Verify slash commands insert correctly and save produces valid markdown
   - Verify wikilink click → navigation → return works without state corruption
   - Verify search → result click → editor open works
4. Run full test suite: `pnpm run test` and `pnpm run typecheck`

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_08_wire-up-auto-save-error-handling-and-final-integration|STEP-14-08 Harden autosave, conflict recovery, and end-to-end Notes integration]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
