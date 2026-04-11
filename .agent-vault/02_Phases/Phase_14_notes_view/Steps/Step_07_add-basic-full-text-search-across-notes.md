---
note_type: step
template_version: 2
contract_version: 1
title: Add whole-workspace markdown search with bounded indexing
step_id: STEP-14-07
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: complete
owner: executor-1
created: '2026-03-31'
updated: '2026-03-31'
depends_on:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations|STEP-14-02]]'
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_03_build-real-file-tree-component-for-notessidepanel|STEP-14-03]]'
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05]]'
related_sessions: []
related_bugs: []
related_decisions:
  - '[[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Define notes workspace boundary and cross-workspace navigation rules]]'
tags:
  - agent-vault
  - step
---

# Step 07 - Add whole-workspace markdown search with bounded indexing

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add basic full-text search across notes.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

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

## Required Reading

- [[01_Architecture/System_Overview|System Overview]] - Desktop app architecture
- Consider: Simple client-side search (read all files, filter by content) is sufficient for v1

## Execution Prompt

1. Add search input to NotesSidePanel (at top, similar to Today view)
2. Implement search in main process: read all .md files in notes/, filter by query match
3. Show results in side panel below search input (filename + snippet with match highlighted)
4. Click result to open that note in editor
5. Handle empty results gracefully

## Validation Commands

- Manual: Create notes with unique content, search for that content - should find matching notes

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-31
- Next action: Start STEP-14-07.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
### Refinement (readiness checklist pass)

This section supersedes the vaguer template text above when they conflict.

**Exact outcome and success condition**
- Outcome: the Notes side panel offers debounced whole-workspace markdown search with bounded indexing, stable result ordering, and result-click navigation into the editor.
- Success condition: search returns only user-facing markdown matches, excludes internal/unsafe paths, and opens the selected file correctly whether it lives in `Notes/` or elsewhere in the workspace.

**Why this step matters to the phase**
- The user explicitly chose whole-workspace search, so the plan can no longer rely on a notes-only filename filter.
- Search and wikilinks must agree on what counts as an in-scope workspace markdown file.

**Prerequisites, setup state, and dependencies**
- Step 03 must already provide side-panel state.
- Step 05 must already define the shared workspace markdown inclusion rules and resolver/index policy.
- Do not assume `SimpleQueryEngine` solves raw markdown search; it does not index note bodies.

**Concrete starting files, directories, packages, commands, and tests**
- `packages/desktop/src/main/notes.ts` or a companion `workspace-markdown-search.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/components/sidepanels/NotesSidePanel.tsx`
- Commands: `pnpm run test`, `pnpm run typecheck`

**Required reading completeness**
- Read DEC-0011, DEC-0014, and the refined Step 05 note before building search.

**Implementation constraints and non-goals**
- Search scope: user-facing workspace markdown only.
- Exclude `.command-center/`, hidden directories, symlinks, non-markdown files, and oversized files.
- Return bounded results only; do not build an unbounded whole-workspace crawl in the renderer.
- Ranking can stay simple for v1: exact path/title hits before body hits, then deterministic path ordering.

**Validation commands, manual checks, and acceptance criteria mapping**
- Add tests for result filtering, snippet extraction, scope exclusion, and deterministic ordering.
- Manual: create unique content in both `Notes/` and another workspace markdown directory, search for it, and verify the correct result opens.
- Manual: confirm `.command-center/` content and symlinked markdown never appear in results.
- This step supports the phase acceptance item for whole-workspace search with bounded scope.

**Edge cases, failure modes, and recovery expectations**
- Duplicate filenames should show enough path context in results to disambiguate them.
- Snippet extraction must escape/format result text safely.
- Search should degrade gracefully on large workspaces via result caps and file-size limits rather than hanging the UI.

**Security considerations**
- Search must respect the same trusted path policy as Step 05. It must never become a backdoor to `.command-center/` or escaped paths.

**Performance considerations**
- Use a cached workspace markdown index or mtime-based memoization in the main process.
- Debounce renderer queries and cap result count and snippet length.

**Integration touchpoints and downstream effects**
- Reuses the workspace markdown resolver from Step 05.
- Lives in the side panel from Step 03 and opens files into the editor from Step 04.
- Step 08 will verify search remains correct while autosave and external file changes occur.

**Blockers, unresolved decisions, and handoff expectations**
- No blockers remain.
- Handoff to Step 08 should include any indexing invalidation edge cases discovered during testing.

**Junior-developer readiness verdict**
- PASS

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->
- 2026-04-09: Executor-1 implemented main-process `searchNotes()` (workspace walk, mtime caching, snippet extraction, scoring). Renderer UI was already in place from prior session. Reviewer applied follow-up fixes: snippet highlighting (replaced literal `**match**` with visible treatment), async race condition in NotesContext, added tests. typecheck ✅, tests ✅. Routed to tester.

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
