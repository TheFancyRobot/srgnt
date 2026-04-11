---
note_type: step
template_version: 2
contract_version: 1
title: Harden autosave, conflict recovery, and end-to-end Notes integration
step_id: STEP-14-08
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: complete
owner: executor-1
created: '2026-03-31'
updated: '2026-03-31'
depends_on:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05]]'
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06]]'
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_07_add-basic-full-text-search-across-notes|STEP-14-07]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 08 - Harden autosave, conflict recovery, and end-to-end Notes integration

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Wire up auto-save, error handling, and final integration.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

## Why This Step Exists

- Final integration step: tie all components together, add auto-save, error handling
- Auto-save should debounce (save after user stops typing for ~1 second)
- Error handling: show toast/notification on save failure, allow retry

## Prerequisites

- Steps 01-07 must be complete (all components implemented)

## Relevant Code Paths

- All notes-related files in renderer and main process

## Required Reading

- [[01_Architecture/System_Overview|System Overview]] - Desktop app architecture
- Phase 13 layout context for how panels connect
- Existing error handling patterns in the app

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

## Validation Commands

- `pnpm run test` - All tests pass
- `pnpm run typecheck` - No type errors
- Manual E2E: Create note, edit, close app, reopen, verify content persists

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-31
- Next action: Start STEP-14-08.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
### Refinement (readiness checklist pass)

This section supersedes the vaguer template text above when they conflict.

**Exact outcome and success condition**
- Outcome: the full Notes surface is hardened for debounced autosave, save-state feedback, error handling, conflict/rename/delete recovery, and end-to-end validation across tree, editor, wikilinks, slash commands, and search.
- Success condition: the complete Notes flow survives common failure modes without data loss and is covered by automated checks plus a concrete manual validation script.

**Why this step matters to the phase**
- Earlier steps deliver capability. This step makes the feature safe to rely on in real use.
- It is where the phase proves the different Notes subfeatures actually work together as one product surface.

**Prerequisites, setup state, and dependencies**
- Steps 04-07 must be complete.
- Use a real temp workspace and at least one existing markdown file outside `Notes/` for integration validation.

**Concrete starting files, directories, packages, commands, and tests**
- All Notes-related files touched in Steps 03-07
- `packages/desktop/e2e/app.spec.ts`
- Renderer tests for save/error/conflict states
- Commands: `pnpm run typecheck`, `pnpm run test`, `pnpm run test:e2e`

**Required reading completeness**
- Read the refined notes from Steps 03-07 before changing integration behavior. No new design work should happen here unless a bug is discovered.

**Implementation constraints and non-goals**
- Keep atomic write semantics from Step 02 (write-to-temp, fsync, rename per DEC-0008).
- Surface save state in the Notes UI with at least `saving`, `saved`, and `error` states.
- On save failure: inline error banner in editor area with "Retry Save" + "Copy to Clipboard" buttons. Content stays in editor buffer.
- Handle open-file rename/delete and external modification predictably; do not silently clobber content.
- This step is not a sync/conflict-resolution phase for multi-device editing.

**Validation commands, manual checks, and acceptance criteria mapping**
- Run `pnpm run typecheck`, `pnpm run test`, and `pnpm run test:e2e`.
- Manual validation script:
  1. Create a note in `Notes/`.
  2. Edit it and confirm autosave/status feedback.
  3. Use a slash command and confirm insertion + save.
  4. Add a wikilink to another workspace markdown file and open it.
  5. Search for content across both files and open the result.
  6. Rename/delete from the tree and verify the editor recovers correctly.
  7. Restart the app and confirm persistence.
- This step closes the phase acceptance items for autosave, error handling, and end-to-end integration.

**Edge cases, failure modes, and recovery expectations**
- Save failure must surface an inline error banner with "Retry Save" button and "Copy to Clipboard" fallback. No data loss.
- If the active file is renamed or deleted, the editor should show a clear recovery state rather than silently editing a stale path.
- External file modification should trigger a reload prompt on the next focus/poll cycle. If unsaved editor changes exist, show a conflict banner offering "Keep mine" (overwrite disk) or "Reload from disk" (discard editor buffer).
- Auto-retry on transient write failures with exponential backoff (1s, 2s, 4s) before surfacing the persistent error banner.

**Security considerations**
- Verify that all final UI flows still respect the Step 02 path policy and the Step 05/07 workspace markdown exclusions.

**Performance considerations**
- Debounced autosave and search must coexist without causing obvious UI stalls or redundant whole-document recomputation.
- Re-run through a modestly populated workspace to confirm the final integrated surface stays responsive.

**Integration touchpoints and downstream effects**
- This is the convergence point for the tree, shared Notes state, live-preview editor, slash commands, wikilinks, and search.
- Final E2E coverage becomes the handoff artifact for future Notes work.

**Blockers, unresolved decisions, and handoff expectations**
- No blockers remain.
- If any unresolved edge case remains after this step, record it as a bug or decision instead of leaving it implicit.

**Junior-developer readiness verdict**
- PASS

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->
- 2026-04-09: STEP-14-08 complete (executor-1). Debounced autosave (1s), save failure retry with exponential backoff (3 retries + banner), file lifecycle events (rename/delete/external mod), conflict banner, E2E validation. Reviewer fixed writeActiveContent error propagation and deleted-file recovery content loss. Tester: 206/206 unit tests, 14/14 E2E, all clean.

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
