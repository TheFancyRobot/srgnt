# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- Users need to find notes by content, not just filename
- Search UI should appear in side panel, showing results as user types
- Results should show note name and matching content snippet

## Prerequisites

- STEP-14-02 must be complete (can read files)
- STEP-14-03 helpful (file tree exists for UI placement)

## Relevant Code Paths

- `packages/desktop/src/renderer/components/sidepanels/NotesSidePanel.tsx` - Add search input
- `packages/desktop/src/main/notes.ts` - Search implementation

## Execution Prompt

1. Add search input to NotesSidePanel (at top, similar to Today view)
2. Implement search in main process: read all .md files in notes/, filter by query match
3. Show results in side panel below search input (filename + snippet with match highlighted)
4. Click result to open that note in editor
5. Handle empty results gracefully

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_07_add-basic-full-text-search-across-notes|STEP-14-07 Add whole-workspace markdown search with bounded indexing]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
