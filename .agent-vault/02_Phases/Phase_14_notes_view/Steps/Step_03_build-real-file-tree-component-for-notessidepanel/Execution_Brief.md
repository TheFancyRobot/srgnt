# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

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

## Execution Prompt

1. Replace placeholder `NotesSidePanel.tsx` with real implementation:
   - Use IPC to load directory structure from `{workspaceRoot}/notes/`
   - Render folder/file tree with expand/collapse state
   - Add context menu or buttons for: new note, new folder, rename, delete
   - Handle selection - clicking a note opens it in NotesView
2. Handle empty state: show "Create your first note" prompt if notes dir is empty
3. Add confirmation dialogs for delete/rename operations

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_03_build-real-file-tree-component-for-notessidepanel|STEP-14-03 Build Notes tree and shared renderer selection state]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
