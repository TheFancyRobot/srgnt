# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

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

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting|STEP-14-04 Implement Obsidian-style live-preview markdown editor foundation]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
