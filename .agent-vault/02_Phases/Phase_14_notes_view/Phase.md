---
note_type: phase
template_version: 2
contract_version: 1
title: Notes View
phase_id: PHASE-14
status: planned
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on:
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|PHASE-13 UI Layout Restructuring]]'
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]'
  - '[[06_Shared_Knowledge/srgnt_framework_ux_direction|Initial Product UX Direction]]'
  - '[[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage]]'
related_decisions:
  - '[[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007 Use Dataview query engine over markdown files as local data layer]]'
  - '[[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract]]'
related_bugs: []
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
- Next phase: not planned yet.
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
- [[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007 Use Dataview query engine over markdown files as local data layer]]
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- No step notes yet.
<!-- AGENT-END:phase-steps -->

## Notes

- **Product identity reminder**: The UX direction docs are explicit that srgnt is NOT a note-taking app. Notes here are operational artifacts -- meeting prep, follow-up tracking, briefing drafts, triage notes. The UI should reflect this: no "daily note" template, no backlink graph, no zettelkasten features. Keep it simple and operational.
- **Markdown editor choice**: A key decision for this phase will be which markdown rendering/editing approach to use. Options include CodeMirror 6 (full editor), a simpler textarea + marked/remark preview, or a lightweight component like `@uiw/react-markdown-editor`. This decision should be made during phase planning based on bundle size, licensing, and feature needs.
- **Security boundary**: File system operations MUST be scoped to the workspace notes directory via the IPC bridge. The renderer process should never have direct filesystem access. Path traversal attacks (e.g., `../../etc/passwd`) must be blocked in the main process handler.
- **Step notes deferred**: Detailed step notes will be created when this phase moves closer to execution. The scope above is sufficient for roadmap positioning and dependency tracking.
