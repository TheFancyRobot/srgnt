---
note_type: phase
template_version: 2
contract_version: 1
title: Notes View
phase_id: PHASE-14
status: planned
owner: ''
created: '2026-03-30'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|PHASE-13 UI Layout Restructuring]]'
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]'
  - '[[06_Shared_Knowledge/srgnt_framework_ux_direction|Initial Product UX Direction]]'
  - '[[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage]]'
related_decisions:
  - '[[04_Decisions/DEC-0011_dec-0011-use-simplequeryengine-over-in-memory-canonicalstore-for-v1-query-index|DEC-0011 Use SimpleQueryEngine over in-memory CanonicalStore for v1 query/index]]'
  - '[[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract]]'
  - '[[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Define notes workspace boundary and cross-workspace navigation rules]]'
related_bugs:
  - '[[03_Bugs/BUG-0004_notes-tree-add-item-input-has-white-on-white-text-a11y-aaa-fail|BUG-0004 Notes tree add-item input has white-on-white text (a11y AAA fail)]]'
  - '[[03_Bugs/BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor|BUG-0005 Markdown syntax tokens invisible and uneditable in live-preview editor]]'
  - '[[03_Bugs/BUG-0006_notes-view-shows-markdown-syntax-on-all-lines-and-textarea-has-visible-border-on-focus|BUG-0006 Notes view shows markdown syntax on all lines and textarea has visible border on focus]]'
  - '[[03_Bugs/BUG-0007_source-button-on-note-editor-does-not-implement-live-preview-toggle-correctly|BUG-0007 Source button on note editor does not implement live-preview toggle correctly]]'
tags:
  - agent-vault
  - phase
---

# Phase 14 Notes View

Build the Notes view: a workspace-backed file/folder browser and markdown note editor that replaces the placeholder scaffold from Phase 13. Notes are operational artifacts (meeting prep, follow-ups, briefing drafts, triage notes) stored as markdown in the user's local workspace -- not a general-purpose note-taking app.

## Objective

- Deliver a functional Notes view accessible from the activity bar, with a file/folder tree in the side panel and a markdown viewer/editor in the main content area, backed by the user's local workspace directory.

## Why This Phase Exists

- Phase 13 adds a "Notes" icon to the activity bar with a placeholder file tree in the side panel. This phase replaces that placeholder with a real, workspace-backed implementation.
- The product's IA design (see [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]) positions artifacts as a core surface. Notes are the simplest form of user-created artifact and a natural complement to the generated artifacts (briefings, triage summaries) that workflows produce.
- Users coming from Obsidian expect a local-first, file-backed notes experience. Providing a basic but functional notes view early validates the layout and demonstrates the workspace's local-first nature.
- This is explicitly not trying to compete with Obsidian's full feature set. The goal is a minimal but useful operational notes surface that fits the command-center product identity.

## Scope

- **File/folder tree** (side panel): Read the workspace notes directory, render a navigable tree with expand/collapse folders, file icons by type, create/rename/delete operations, and drag-to-reorder (stretch goal).
- **Markdown viewer/editor** (main content): Render markdown notes with syntax highlighting. Provide a basic edit mode (toggle between view and edit, or live preview). Support frontmatter display. Auto-save on edit.
- **Workspace integration**: Notes are stored as `.md` files in a `notes/` subdirectory of the user's workspace root (e.g., `~/srgnt-workspace/.command-center/notes/`). Use the existing workspace layout contracts.
- **IPC bridge**: Add preload/IPC methods for file system operations: list directory, read file, write file, create file, create folder, rename, delete. All operations scoped to the workspace notes directory (no arbitrary filesystem access).
- **Search**: Basic full-text search across notes with results shown in the side panel.
- **Side panel integration**: Replace the Phase 13 placeholder `NotesSidePanel` with the real file tree component.

## Non-Goals

- Rich text editing, WYSIWYG, or block-based editors (markdown source + preview is sufficient for v1).
- Backlinks, graph view, or Obsidian-style knowledge graph features.
- Plugin/extension system for notes (that's a separate concern).
- Dataview queries embedded in notes (deferred; the query engine exists but note-level integration is future work).
- Sync or conflict resolution for notes (depends on Phase 09 Sync Preparation).
- Tags, properties panel, or metadata-driven note organization beyond folders.
- Collaborative editing or real-time multi-device access.

## Dependencies

- Depends on [[02_Phases/Phase_13_ui_layout_restructuring/Phase|PHASE-13 UI Layout Restructuring]] (activity bar icon, side panel scaffold, and LayoutContext panel registry are prerequisites).
- References [[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007]] for the file-backed data layer strategy.
- References [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008]] for workspace file conventions.
- References [[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage]] for workspace directory layout.
- Requires new IPC channels in the Electron main process for file system operations, scoped to the workspace notes directory.

## Acceptance Criteria

- [ ] The Notes activity bar icon opens a functional file/folder tree in the side panel showing the contents of the workspace notes directory.
- [ ] Clicking a file in the tree renders its markdown content in the main content area with proper formatting (headings, lists, code blocks, links).
- [ ] Users can create new notes (file) and folders from the side panel.
- [ ] Users can rename and delete notes and folders with confirmation dialogs for destructive operations.
- [ ] Edit mode allows modifying note content with auto-save (debounced write to disk).
- [ ] Basic full-text search across notes returns results in the side panel.
- [ ] All file operations are scoped to the workspace notes directory; no path traversal outside the workspace.
- [ ] The notes directory is created automatically if it doesn't exist when the Notes view is first opened.
- [ ] The view works correctly within the Phase 13 three-panel layout (activity bar, side panel tree, main content editor).

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|PHASE-13 UI Layout Restructuring]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]
- [[06_Shared_Knowledge/srgnt_framework_ux_direction|Initial Product UX Direction]]
- [[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0011_dec-0011-use-simplequeryengine-over-in-memory-canonicalstore-for-v1-query-index|DEC-0011 Use SimpleQueryEngine over in-memory CanonicalStore for v1 query/index]]
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract]]
- [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Define notes workspace boundary and cross-workspace navigation rules]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- [[03_Bugs/BUG-0004_notes-tree-add-item-input-has-white-on-white-text-a11y-aaa-fail|BUG-0004 Notes tree add-item input has white-on-white text (a11y AAA fail)]]
- [[03_Bugs/BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor|BUG-0005 Markdown syntax tokens invisible and uneditable in live-preview editor]]
- [[03_Bugs/BUG-0006_notes-view-shows-markdown-syntax-on-all-lines-and-textarea-has-visible-border-on-focus|BUG-0006 Notes view shows markdown syntax on all lines and textarea has visible border on focus]]
- [[03_Bugs/BUG-0007_source-button-on-note-editor-does-not-implement-live-preview-toggle-correctly|BUG-0007 Source button on note editor does not implement live-preview toggle correctly]]
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_14_notes_view/Steps/Step_01_add-ipc-channels-and-main-process-handlers-for-notes-file-operations|STEP-14-01 Freeze Notes workspace contract and typed IPC surface]] -- pending
- [ ] [[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations|STEP-14-02 Implement main-process notes service and scoped filesystem handlers]] -- pending
- [ ] [[02_Phases/Phase_14_notes_view/Steps/Step_03_build-real-file-tree-component-for-notessidepanel|STEP-14-03 Build Notes tree and shared renderer selection state]] -- pending
- [ ] [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting|STEP-14-04 Implement Obsidian-style live-preview markdown editor foundation]] -- pending
- [ ] [[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05 Add workspace-wide wikilink resolution, navigation, and note creation]] -- pending
- [ ] [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]] -- pending
- [ ] [[02_Phases/Phase_14_notes_view/Steps/Step_07_add-basic-full-text-search-across-notes|STEP-14-07 Add whole-workspace markdown search with bounded indexing]] -- pending
- [ ] [[02_Phases/Phase_14_notes_view/Steps/Step_08_wire-up-auto-save-error-handling-and-final-integration|STEP-14-08 Harden autosave, conflict recovery, and end-to-end Notes integration]] -- pending
<!-- AGENT-END:phase-steps -->

## Parallel Work Map

- Step 01 (workspace contract + typed IPC surface) and Step 02 (main-process service + handlers) are sequential.
- Step 03 (tree + shared renderer state) depends on Step 02.
- Step 04 (editor foundation) depends on Steps 02-03.
- Step 05 (wikilinks) and Step 06 (slash commands) both depend on Step 04 and can proceed in parallel once the live-preview editor exists.
- Step 07 (whole-workspace search) depends on Step 03 for UI placement and Step 05 for the shared workspace markdown resolver/index rules.
- Step 08 (hardening + E2E) is the final integration step after Steps 04-07.

## Notes

- **Product identity reminder**: The UX direction docs are explicit that srgnt is NOT a note-taking app. Notes here are operational artifacts -- meeting prep, follow-up tracking, briefing drafts, triage notes. The UI should reflect this: no "daily note" template, no backlink graph, no zettelkasten features. Keep it simple and operational.
- **Editor target**: The user requirement is Obsidian-style live preview, not split preview or raw-source-only editing. A ProseMirror-based library (Tiptap preferred) is the implementation path because it provides a mature React integration, built-in Suggestion extension for slash commands, and markdown serialization. The ProseMirror document model is acceptable as an internal representation as long as markdown remains the serialization and persistence format.
- **Frontmatter on new notes**: New notes get minimal default YAML frontmatter: `title` (derived from filename) and `created` (ISO date). Users may add more manually. This is consistent with DEC-0008 canonical records using markdown with frontmatter.
- **Save failure UX**: When a write fails, the editor shows an inline error banner with a "Retry Save" button and a "Copy to Clipboard" fallback. Content stays in the editor buffer so no data loss occurs. Autosave retries with exponential backoff before surfacing the banner.
- **Security boundary**: All writes stay limited to `${workspaceRoot}/Notes/`. Whole-workspace reads for search and wikilinks are allowed only for user-facing markdown files and must exclude `.command-center/`, hidden directories, symlinks, and escaped paths.
- **Step detail**: The step notes are now refinement-ready and carry the execution details, constraints, validations, and readiness verdicts for junior-safe execution.
### Refinement Decisions (2026-03-31)

The items below supersede any older planning text in this note that says notes live under `.command-center/notes/`, that the tree should browse the whole workspace, or that the query/index direction for this phase is still `DEC-0007`.

- Canonical editable root: `${workspaceRoot}/Notes/`.
- Tree scope: the side panel browses `Notes/` only.
- Whole-workspace reads: wikilinks and search may open user-facing markdown anywhere under the workspace root, but must exclude `.command-center/`, hidden directories, symlinks, non-markdown files, and escaped paths.
- Missing-link creation: allowed only when the normalized target resolves inside `Notes/`.
- Editor target: Obsidian-style live preview where markdown syntax is visible on the active line and rendered elsewhere; split preview is not acceptable for this phase. Implementation uses a ProseMirror-based library (Tiptap preferred) rather than CodeMirror.
- Slash commands remain in scope, but only as markdown insertion commands layered on top of the live-preview editor.
- Search implementation must not assume `SimpleQueryEngine` can search raw markdown bodies. Phase 14 needs a dedicated bounded markdown resolver/search service in the main process.
- Delete posture for v1: file delete and empty-folder delete only. Recursive delete stays out of scope.

### Refined Step Sequence

- `STEP-14-01`: freeze the `Notes/` workspace contract and typed IPC/preload/env surface.
- `STEP-14-02`: implement the main-process notes service and scoped filesystem handlers.
- `STEP-14-03`: replace the placeholder tree and add shared renderer selection state.
- `STEP-14-04`: implement the Obsidian-style live-preview editor foundation and debounced save plumbing.
- `STEP-14-05`: add workspace-wide wikilink resolution, navigation, and create-in-Notes behavior.
- `STEP-14-06`: implement slash commands on top of the live-preview editor.
- `STEP-14-07`: add whole-workspace markdown search with bounded indexing.
- `STEP-14-08`: harden autosave, conflict/error recovery, and end-to-end Notes integration.

### Shared Readiness Checklist

Every step in this phase must answer the same checklist explicitly:

- exact outcome and success condition
- why the step matters to the phase
- prerequisites, setup state, and dependencies
- concrete starting files, directories, packages, commands, and tests
- required reading completeness
- implementation constraints and non-goals
- validation commands, manual checks, and acceptance criteria mapping
- edge cases, failure modes, and recovery expectations
- security considerations or an explicit not-applicable judgment
- performance considerations or an explicit not-applicable judgment
- integration touchpoints and downstream effects
- blockers, unresolved decisions, and handoff expectations
- junior-developer readiness verdict: `PASS` or `FAIL`

### Phase-Level Gaps Now Closed

- Notes root ambiguity is resolved by [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014]].
- The superseded Dataview decision is replaced here by [[04_Decisions/DEC-0011_dec-0011-use-simplequeryengine-over-in-memory-canonicalstore-for-v1-query-index|DEC-0011]], with the explicit reminder that it does not solve raw markdown search.
- The missing renderer state bridge between `NotesSidePanel` and `NotesView` is now an explicit Step 03 requirement.
- The editor requirement is no longer vague: the target UX is Obsidian-like live preview plus slash commands, with a CodeMirror-first implementation path and a custom CM6 fallback if needed.
- Security expectations are now explicit: renderer-relative paths only, main-process path resolution, symlink rejection, `.command-center/` exclusion for whole-workspace reads, and no recursive delete in v1.
## Planning Context Gathered

### Research Summary

**Obsidian Features (Context7 documentation):**
- Wikilinks: `[[Note Name]]` or `[[Note Name|Display Text]]` - compact internal link syntax
- Markdown links: `[Note Name](Note%20Name.md)` - URL-encoded alternative
- Backlinks plugin: Shows all notes linking to current note (linked + unlinked mentions)
- Graph view: Visualize note connections (nodes = notes, edges = internal links)
- Callouts: `> [!type] Title` syntax for highlighted blocks
- Default generates wikilinks but can switch to markdown format

**Notion Slash Commands (web research):**
- Trigger: Type `/` at start of line or after text
- Types: heading 1-3, bullet/numbered lists, to-do, quote, callout, code, toggle, divider, image, table
- Block-based: Each element is a block that can be reordered/manipulated
- Quick insert menu appears below cursor with typeable command names

### Existing Codebase Context

**Workspace Layout** (from `settings.ts` and `contracts.ts`):
- Workspace root: `~/srgnt-workspace/`
- Command center: `{workspaceRoot}/.command-center/`
- Default directories: `Daily/`, `Meetings/`, `Projects/`, etc.
- Phase 14 refinement fixes a canonical top-level `Notes/` directory as the editable root for this surface

**IPC Channels** (from `contracts.ts`):
- Existing: workspace management, settings, skills, terminal, run history
- Missing for Notes: file system operations (list directory, read file, write file, create/delete)

**Existing Components**:
- `NotesSidePanel.tsx`: Placeholder file tree (needs real implementation)
- `NotesView.tsx`: Placeholder "coming soon" view
- Activity bar and side panel already exist from Phase 13

### Clarifications Resolved

1. **Where do notes live?** → `${workspaceRoot}/Notes/`.
2. **Do we need block-based editor?** → No. The target is Obsidian-style live preview with markdown as the source of truth.
3. **Wikilinks to other workspace docs?** → Yes. Existing user-facing workspace markdown files may open from notes.
4. **Slash command scope** → Markdown insertion commands remain in scope for Phase 14.

### Key Technical Decisions Resolved

1. **Workspace boundary**: Accepted in [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014]].
2. **Query/index reference**: [[04_Decisions/DEC-0011_dec-0011-use-simplequeryengine-over-in-memory-canonicalstore-for-v1-query-index|DEC-0011]] supersedes DEC-0007 and does not solve raw markdown note search.
3. **Editor path**: Step 04 uses a ProseMirror-based library (Tiptap preferred) because it provides mature React integration, built-in Suggestion for slash commands, and markdown round-tripping. The ProseMirror document model is acceptable internally as long as markdown remains the serialization format. CodeMirror is not used for this phase.
4. **Readiness bar**: Each step now has a concrete readiness checklist pass and a junior-developer verdict.
5. **Frontmatter on create**: New notes get minimal frontmatter (`title`, `created`). Phase 14 does not add a properties panel or metadata-driven organization.
6. **Save failure UX**: Inline error banner with retry button. Content stays in the editor buffer until a successful write or explicit discard.
