---
note_type: step
template_version: 2
contract_version: 1
title: Build Notes tree and shared renderer selection state
step_id: STEP-14-03
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: done
owner: ''
created: '2026-03-31'
updated: '2026-04-01'
depends_on:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations|STEP-14-02]]'
related_sessions:
  - '[[05_Sessions/2026-04-01-042638-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-042638 OpenCode session for Build Notes tree and shared renderer selection state]]'
  - '[[05_Sessions/2026-04-01-191930-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-191930 OpenCode session for Build Notes tree and shared renderer selection state]]'
  - '[[05_Sessions/2026-04-01-192158-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-192158 OpenCode session for Build Notes tree and shared renderer selection state]]'
  - '[[05_Sessions/2026-04-01-192403-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-192403 OpenCode session for Build Notes tree and shared renderer selection state]]'
  - '[[05_Sessions/2026-04-01-192803-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-192803 OpenCode session for Build Notes tree and shared renderer selection state]]'
related_bugs:
  - '[[03_Bugs/BUG-0004_notes-tree-add-item-input-has-white-on-white-text-a11y-aaa-fail|BUG-0004 Notes tree add-item input has white-on-white text (a11y AAA fail)]]'
tags:
  - agent-vault
  - step
---

# Step 03 - Build Notes tree and shared renderer selection state

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Build real file tree component for NotesSidePanel.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

## Why This Step Exists

- Phase 13 has a placeholder tree; this replaces it with a real file tree backed by the notes directory
- Needs to load directory structure from IPC, handle expand/collapse, support creating/renaming/deleting
- Must match the visual style of other side panels (see existing `NotesSidePanel.tsx`)

## Prerequisites

- STEP-14-02 must be complete (file service with IPC exists)
- Understand existing placeholder in `packages/desktop/src/renderer/components/sidepanels/NotesSidePanel.tsx`

## Relevant Code Paths

- `packages/desktop/src/renderer/components/sidepanels/NotesSidePanel.tsx` - Replace this
- `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.tsx` - Similar pattern
- `packages/desktop/src/preload/index.ts` - Exposed IPC methods

## Required Reading

- [[01_Architecture/System_Overview|System Overview]] - Desktop app architecture
- `packages/desktop/src/renderer/components/sidepanels/NotesSidePanel.tsx` - Current placeholder
- `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.tsx` - Reference implementation

## Execution Prompt

1. Replace placeholder `NotesSidePanel.tsx` with real implementation:
   - Use IPC to load directory structure from `{workspaceRoot}/notes/`
   - Render folder/file tree with expand/collapse state
   - Add context menu or buttons for: new note, new folder, rename, delete
   - Handle selection - clicking a note opens it in NotesView
2. Handle empty state: show "Create your first note" prompt if notes dir is empty
3. Add confirmation dialogs for delete/rename operations

## Validation Commands

- Manual: Open Notes panel, create folder, create note inside, verify file appears in filesystem

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-31
- Next action: Start STEP-14-03.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
### Refinement (readiness checklist pass)

This section supersedes the vaguer template text above when they conflict.

**Exact outcome and success condition**
- Outcome: the left panel renders the live `${workspaceRoot}/Notes/` tree, and renderer-side Notes state exists so the selected file, expansion state, and refresh state are shared between side panel and main content.
- Success condition: selecting a note in the tree reliably updates the main Notes view without prop-drilling through unrelated layout shells or ad hoc global events.

**Why this step matters to the phase**
- `NotesSidePanel` and `NotesView` are sibling surfaces today. Without explicit shared Notes state, later editor work becomes brittle immediately.

**Prerequisites, setup state, and dependencies**
- Step 02 must already provide working list/read/create/rename/delete APIs.
- Read `packages/desktop/src/renderer/main.tsx` before deciding where Notes state should live.

**Concrete starting files, directories, packages, commands, and tests**
- `packages/desktop/src/renderer/main.tsx`
- `packages/desktop/src/renderer/components/NotesView.tsx`
- `packages/desktop/src/renderer/components/sidepanels/NotesSidePanel.tsx`
- `packages/desktop/src/renderer/components/notes/NotesContext.tsx`
- Renderer Vitest files under `packages/desktop/src/renderer/components/`
- Commands: `pnpm run test`, `pnpm run typecheck`

**Required reading completeness**
- The phase note, DEC-0014, `main.tsx`, the Notes placeholders, and one existing side-panel implementation are enough.

**Implementation constraints and non-goals**
- The tree browses `Notes/` only.
- Do not start the live-preview editor in this step.
- Keep notes-specific state local to the Notes feature, not in the generic layout context.
- Confirmations for destructive actions can be simple; this step is not the slash-command or command-palette step.

**Validation commands, manual checks, and acceptance criteria mapping**
- Run renderer tests for the new Notes state/container logic.
- Manual: create nested folders, create/select notes, collapse/expand folders, rename/delete, and verify the side panel stays in sync with the filesystem and the main view.
- This step supports the phase acceptance items for the functional tree and three-panel integration.

**Edge cases, failure modes, and recovery expectations**
- Empty `Notes/` should show a first-note prompt rather than blank UI.
- Selection should survive refresh when the active path still exists.
- If the selected file is renamed or deleted, shared state must clear or update predictably.

**Security considerations**
- Keep relative identifiers in renderer state. Do not expose raw absolute filesystem paths in UI state or visible labels.

**Performance considerations**
- Full virtualization is not required, but the tree should avoid needless full refresh loops on every small UI interaction.

**Integration touchpoints and downstream effects**
- Step 04 consumes selected-file state.
- Step 07 reuses the side panel for search.
- Step 08 depends on the same Notes state for save/error/conflict banners.

**Blockers, unresolved decisions, and handoff expectations**
- No blockers remain.
- Handoff to Step 04 should include the selected-file descriptor shape and where save state belongs.

**Junior-developer readiness verdict**
- PASS

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-01 - [[05_Sessions/2026-04-01-042638-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-042638 OpenCode session for Build Notes tree and shared renderer selection state]] - Session created.
- 2026-04-01 - [[05_Sessions/2026-04-01-191930-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-191930 OpenCode session for Build Notes tree and shared renderer selection state]] - Session created.
- 2026-04-01 - [[05_Sessions/2026-04-01-192158-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-192158 OpenCode session for Build Notes tree and shared renderer selection state]] - Session created.
- 2026-04-01 - [[05_Sessions/2026-04-01-192403-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-192403 OpenCode session for Build Notes tree and shared renderer selection state]] - Session created.
- 2026-04-01 - [[05_Sessions/2026-04-01-192803-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-192803 OpenCode session for Build Notes tree and shared renderer selection state]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
