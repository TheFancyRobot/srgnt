# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
### Refinement (readiness checklist pass)

This section supersedes the vaguer template text above when they conflict.

**Exact outcome and success condition**
- Outcome: `NotesView` becomes a ProseMirror-based (Tiptap) live-preview editor that opens the selected markdown file, uses markdown as the persistence format, and includes debounced save plumbing with save-state feedback.
- Success condition: a fixed fixture set proves that the editor renders formatted markdown, allows inline editing, round-trips markdown without corruption, and surfaces save state (`saving`/`saved`/`error`).

**Why this step matters to the phase**
- The clarified user requirement is a ProseMirror-based rich editor with markdown round-tripping, not a raw-source or split-preview editor. Slash commands and wikilinks extend this foundation in later steps.

**Prerequisites, setup state, and dependencies**
- Steps 02-03 must already provide file IO and shared Notes state (selected file, save state signals).
- Install Tiptap and markdown serialization dependencies before building custom glue code.

**Concrete starting files, directories, packages, commands, and tests**
- `packages/desktop/package.json` — add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-placeholder`, markdown serializer package
- `packages/desktop/src/renderer/components/NotesView.tsx`
- `packages/desktop/src/renderer/components/notes/NotesContext.tsx`
- `packages/desktop/src/renderer/components/notes/TiptapEditor.tsx` — new editor component
- `packages/desktop/src/renderer/components/notes/markdown-serializer.ts` — markdown ↔ ProseMirror conversion
- Commands: `pnpm run typecheck`, `pnpm run test`

**Required reading completeness**
- Read the phase note plus the current renderer Notes entrypoints. Tiptap React docs are the primary external reference.

**Implementation constraints and non-goals**
- The UX target is live-preview: formatted text displayed, raw markdown visible when cursor is on that node (Tiptap handles this naturally via ProseMirror's node-view model).
- Markdown must be the persistence and serialization format. The ProseMirror document model is an internal representation only.
- Markdown round-trip fidelity is critical: unchanged sections must serialize identically. Investigate `tiptap-markdown` or `prosemirror-markdown` for this.
- Frontmatter must be displayed as a read-only rendered block, not editable inline (prevents accidental corruption).
- New notes get minimal frontmatter: `title` (from filename) and `created` (ISO date).
- No split preview, no alternate raw/edit mode toggle.

**Validation commands, manual checks, and acceptance criteria mapping**
- Run renderer tests covering markdown round-trip for headings, emphasis, task lists, fenced code, links, and frontmatter fixtures.
- Manual: create a note, edit content, verify save indicator transitions (saving → saved), close and reopen, confirm markdown is intact.
- Manual: verify frontmatter block displays correctly and is not editable inline.
- This step supports the phase acceptance items for rendered markdown, editor behavior, and edit flow.

**Edge cases, failure modes, and recovery expectations**
- Frontmatter must remain intact through save cycles and not be reformatted accidentally.
- Save debounce must cancel cleanly when the active file changes.
- If the markdown serializer produces lossy output (e.g., reordering list items, normalizing whitespace), this must be caught in fixture tests and fixed before proceeding.
- If Tiptap's markdown round-tripping is insufficient, the fallback is a custom `prosemirror-markdown` serializer/parser rather than abandoning the ProseMirror approach.

**Security considerations**
- The editor must not execute raw HTML from markdown content. Use Tiptap's default HTML sanitization or explicitly strip dangerous tags.

**Performance considerations**
- Tiptap/ProseMirror is designed for efficient incremental updates. Avoid full-document re-parsing on every keystroke.
- Debounced save should serialize only the current document state, not trigger a fresh parse from scratch.

**Integration touchpoints and downstream effects**
- Step 05 extends this editor for wikilinks (custom Tiptap node/mark).
- Step 06 extends it for slash commands (Tiptap Suggestion extension).
- Step 08 hardens save failures and external-file recovery on top of the same Notes state.

**Blockers, unresolved decisions, and handoff expectations**
- No blockers remain.
- The explicit fallback path is a custom prosemirror-markdown serializer if existing Tiptap markdown packages produce lossy output.

**Junior-developer readiness verdict**
- PASS

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting|STEP-14-04 Implement Obsidian-style live-preview markdown editor foundation]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
