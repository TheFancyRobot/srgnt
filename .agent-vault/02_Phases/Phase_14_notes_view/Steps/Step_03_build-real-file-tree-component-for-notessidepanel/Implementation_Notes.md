# Implementation Notes

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

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_03_build-real-file-tree-component-for-notessidepanel|STEP-14-03 Build Notes tree and shared renderer selection state]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
