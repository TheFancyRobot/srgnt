---
note_type: step
template_version: 2
contract_version: 1
title: Implement Obsidian-style live-preview markdown editor foundation
step_id: STEP-14-04
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: done
owner: ''
created: '2026-03-31'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations|STEP-14-02]]'
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_03_build-real-file-tree-component-for-notessidepanel|STEP-14-03]]'
related_sessions:
  - '[[05_Sessions/2026-04-01-045431-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-045431 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]]'
  - '[[05_Sessions/2026-04-01-190658-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-190658 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]]'
  - '[[05_Sessions/2026-04-01-192822-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-192822 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]]'
  - '[[05_Sessions/2026-04-02-042138-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-02-042138 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]]'
related_bugs:
  - '[[03_Bugs/BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor|BUG-0005 Markdown syntax tokens invisible and uneditable in live-preview editor]]'
  - '[[03_Bugs/BUG-0006_notes-view-shows-markdown-syntax-on-all-lines-and-textarea-has-visible-border-on-focus|BUG-0006 Notes view shows markdown syntax on all lines and textarea has visible border on focus]]'
tags:
  - agent-vault
  - step
---

# Step 04 - Implement Obsidian-style live-preview markdown editor foundation

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Implement markdown editor with syntax highlighting.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

## Why This Step Exists

- Core editor functionality: users need to view and edit markdown notes
- Must support live-preview: formatted text displayed, markdown syntax revealed on active selection
- Uses a ProseMirror-based library (Tiptap preferred) for mature React integration, slash-command support via Suggestion, and markdown round-tripping

## Prerequisites

- STEP-14-02 must be complete (can read/write files via IPC)
- STEP-14-03 must be complete (shared Notes state including selected file and save state)
- Understand existing `NotesView.tsx` placeholder

## Relevant Code Paths

- `packages/desktop/src/renderer/components/NotesView.tsx` - Replace this
- `packages/desktop/src/preload/index.ts` - Exposed IPC methods

## Required Reading

- [[01_Architecture/System_Overview|System Overview]] - Desktop app architecture
- Phase 14 scope notes on editor choice: ProseMirror-based library (Tiptap preferred)
- Tiptap docs: https://tiptap.dev/docs — React integration, Starter Kit, Markdown extension
- `@tiptap/pm` package for ProseMirror primitives when needed

## Execution Prompt

1. Install required packages:
   - `@tiptap/react` - React integration
   - `@tiptap/starter-kit` - Base extensions (headings, lists, code, bold, italic, etc.)
   - `@tiptap/extension-task-list` and `@tiptap/extension-task-item` - Task lists
   - `@tiptap/extension-code-block-lowlight` - Syntax-highlighted code blocks (if needed)
   - `@tiptap/extension-placeholder` - Placeholder text
   - A markdown serializer (e.g., `tiptap-markdown` or custom `prosemirror-markdown` integration) for markdown ↔ ProseMirror round-tripping
2. Implement `NotesView.tsx` with:
   - Read note content via IPC when file is selected from shared Notes state
   - Parse markdown into Tiptap/ProseMirror document model on load
   - Serialize back to markdown on save (debounced: save 1 second after last edit)
   - Display frontmatter as a read-only block at the top (not editable inline — show as rendered YAML)
   - Save state indicator: `saving`, `saved`, `error` visible in the editor chrome
3. Use existing brand styles (colors, fonts from Phase 12)
4. Verify markdown round-trip fidelity: load → edit → save → reload must produce identical markdown for unchanged sections

## Validation Commands

- Manual: Create a note with headings, lists, code blocks, links - verify rendering looks correct

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: OpenCode
- Last touched: 2026-04-01
- Next action: Start STEP-14-05 wikilink support on top of the CodeMirror live-preview editor.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

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

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-01 - [[05_Sessions/2026-04-01-045431-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-045431 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]] - Session created.
- 2026-04-01 - [[05_Sessions/2026-04-01-190658-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-190658 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]] - Bug-orchestration session created to continue BUG-0005 implementation and repair vault note integrity.
- 2026-04-01 - [[05_Sessions/2026-04-01-192822-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-192822 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]] - Session created.
- 2026-04-02 - [[05_Sessions/2026-04-02-042138-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-02-042138 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]] - Session created.
<!-- AGENT-END:step-session-history -->
- [[05_Sessions/2026-04-01-045431-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-045431]] started (OpenCode)
- [[05_Sessions/2026-04-02-042138-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-02-042138 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]] — integrated bug-fix branch, fixed merge damage, resolved notes editor console errors, and narrowed remaining `Tab`/list continuation issues.

## Outcome Summary

- Completed by replacing the original Tiptap-based editor with a CodeMirror 6 `MarkdownEditor` that uses `codemirror-live-markdown` to reveal syntax on the active line while preserving raw markdown in the document.
- `NotesView.tsx` now exposes a persisted source/live-preview toggle, and the renderer keeps the existing frontmatter block plus debounced save-state feedback.
- Validation: `pnpm --filter @srgnt/desktop test`, `pnpm --filter @srgnt/desktop typecheck`, and `pnpm --filter @srgnt/desktop build` all passed on 2026-04-01.
