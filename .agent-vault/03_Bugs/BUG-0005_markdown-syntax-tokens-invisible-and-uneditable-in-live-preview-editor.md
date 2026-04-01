---
note_type: bug
template_version: 2
contract_version: 1
title: Markdown syntax tokens invisible and uneditable in live-preview editor
bug_id: BUG-0005
status: closed
severity: sev-2
category: ux
reported_on: '2026-04-01'
fixed_on: '2026-04-01'
owner: OpenCode
created: '2026-04-01'
updated: '2026-04-01'
related_notes: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]], [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting|STEP-14-04 Implement Obsidian-style live-preview markdown editor foundation]], [[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05 Add workspace-wide wikilink resolution, navigation, and note creation]], [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]], [[05_Sessions/2026-04-01-042638-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-042638 OpenCode session for Build Notes tree and shared renderer selection state]], [[05_Sessions/2026-04-01-045431-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-045431 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]], [[05_Sessions/2026-04-01-190658-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-190658 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]], [[05_Sessions/2026-04-01-192822-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-192822 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]], [[01_Architecture/System_Overview|System Overview]], [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Define notes workspace boundary and cross-workspace navigation rules]], [[06_Shared_Knowledge/srgnt_framework_ux_direction|Initial Product UX Direction]], [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]'
tags:
  - agent-vault
  - bug
---

# BUG-0005 - Markdown syntax tokens invisible and uneditable in live-preview editor

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- In the live-preview markdown editor, markdown syntax tokens (e.g., `###`, `**`, `-`, `>`) are rendered visually but the raw syntax is invisible and uneditable. Users cannot change heading levels, toggle bold/italic, or modify list markers without deleting the entire line and retyping it with the desired syntax.
- Related notes: [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting|STEP-14-04]], [[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05]], [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06]], [[06_Shared_Knowledge/srgnt_framework_ux_direction|Initial Product UX Direction]].

## Observed Behavior

- When typing markdown syntax like `### Heading Text`, the editor immediately renders it as an H3 heading — the `###` tokens disappear from view.
- The cursor sits inside the rendered text, but the markdown syntax tokens (`###`, `**`, `*`, `-`, `>`, `` ` ``, etc.) are not visible or editable at all.
- To change a heading from H3 to H2, the user must delete the entire line and retype `## Heading Text`. There is no way to just modify the `###` to `##`.
- This applies to all markdown syntax: bold (`**`), italic (`*`), blockquotes (`>`), list markers (`-`, `1.`), code spans, etc.
- The editor provides no toggle or mechanism to reveal and edit raw markdown syntax inline.

## Expected Behavior

- **Cursor-revealed syntax (Obsidian-style live preview):** When the cursor is on a line or selection that contains markdown syntax, the raw syntax tokens should become visible and directly editable. For example, placing the cursor on a heading line reveals `###` so the user can delete one `#` to make it H2. Moving the cursor away hides the syntax again and shows the rendered result.
- **Syntax visibility toggle:** There should be a toggle (accessible but not distracting) that lets the user switch between:
  - **Live preview mode** (default): syntax revealed only on the active line/selection, rendered elsewhere.
  - **Reading mode**: syntax fully hidden for clean reading of the rendered document.
- **Toggle placement guidance** (from UI/UX skill — navigation patterns, accessibility):
  - Place the toggle in the editor toolbar or status bar area — visible but not competing with content.
  - Use a recognizable icon (e.g., eye icon or split-view icon) with a tooltip label like "Toggle syntax visibility".
  - Keyboard shortcut should be available (e.g., `Cmd+/` or `Ctrl+/`) for power users.
  - The toggle state should persist across sessions and per-note if feasible.
- Markdown round-trip fidelity must be preserved: syntax reveal → edit → hide must produce valid markdown.

## Reproduction Steps

1. Launch the desktop app and navigate to the Notes view.
2. Select or create a markdown note that contains headings, bold, italic, lists, and blockquotes.
3. Observe that the note renders with formatted text (headings appear large, bold text is bold, etc.).
4. Place the cursor on a heading line — the `###` (or other syntax tokens) remain invisible.
5. Try to click or navigate to the position before the heading text to modify the `###` — it cannot be selected or edited.
6. Attempt to change a heading level: the only path is to delete the entire line and retype with different syntax.

## Scope / Blast Radius

- **Affected packages**: `packages/desktop/src/renderer/` — the Tiptap-based markdown editor component in `NotesView.tsx`.
- **Affected users**: All users editing notes in the Notes view — this is a core interaction flaw in the primary editor surface.
- **Blast radius**: High — this makes the markdown editor fundamentally frustrating to use for any non-trivial editing. It blocks the core value proposition of the Notes view.
- **Downstream impact**: [[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05]] (wikilinks) and [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06]] (slash commands) both depend on the editor supporting inline syntax visibility and editing. These steps may need rework if this bug is not addressed first.
- **Not data-sensitive**: This is a UX/rendering issue, not a data loss or corruption risk.

## Suspected Root Cause

- The Tiptap-based editor is configured in a pure "what you see is what you get" rendering mode where ProseMirror node types (heading, bold, italic, etc.) are serialized directly to the DOM without exposing the originating markdown tokens.
- Unlike Obsidian's live-preview mode (which uses a hybrid approach: CodeMirror for the active line + rendered output elsewhere), the current implementation does not have a mechanism to show raw syntax on the active/selected line.
- The markdown serializer converts ProseMirror doc → markdown on save, but the reverse path (markdown → ProseMirror doc) does not preserve or expose the raw syntax tokens in the editor state.

## Confirmed Root Cause

- The Tiptap/ProseMirror editor renders markdown into a structured document model (headings become `<h1>`–`<h6>` nodes, bold becomes `<strong>` marks, etc.). The raw markdown syntax tokens (`###`, `**`, `-`, `>`) are consumed during parsing and never stored in the document state — they cannot be revealed because they do not exist in ProseMirror's internal representation.
- Obsidian's live preview avoids this by using **CodeMirror 6** (a plain-text editor with decorations) rather than a structured document editor. CodeMirror always has the raw text; it hides/shows syntax via view decorations, which is architecturally compatible with the desired behavior.
- Attempting to reconstruct and inject raw syntax tokens back into a ProseMirror document via decorations would be fragile: tokens must be re-derived from node types and marks, edge cases (nested formatting, ambiguous syntax) would be error-prone, and edits to decoration-injected tokens would require bidirectional sync between the decoration layer and the document model.
- Fixed in `packages/desktop/src/renderer/components/notes/MarkdownEditor.tsx` by replacing the Tiptap editor with a CodeMirror 6 editor backed by `codemirror-live-markdown`, so the raw markdown stays in the document state and syntax visibility is handled by decorations instead of lossy rich-text parsing.

## Workaround

- Delete the entire line and retype with the desired syntax. This is the only current workaround and is unacceptable as a long-term solution.

## Permanent Fix Plan

### Decision: Replace Tiptap with CodeMirror 6 + `codemirror-live-markdown`

**Chosen approach: Option A — Obsidian-style hybrid rendering via CodeMirror 6.**

User confirmed switching from Tiptap/ProseMirror to CodeMirror 6 with the `codemirror-live-markdown` library (`npm install codemirror-live-markdown`). This library implements exactly the desired behavior: it hides markdown syntax on unfocused lines and reveals raw markdown on the active line.

#### Why CodeMirror 6 over a Tiptap plugin

| Dimension | CodeMirror 6 + `codemirror-live-markdown` | Custom Tiptap/ProseMirror plugin |
|-----------|--------------------------------------------|----------------------------------|
| Architecture match | Plain-text editor with view decorations — raw markdown always in document | Structured document model — raw syntax lost after parsing |
| Implementation risk | Library already implements the feature | Must re-derive syntax tokens from node types, handle edge cases |
| Maintenance | Community-maintained, ~500 LOC core, MIT license | Custom code we maintain, fragile to ProseMirror version changes |
| Round-trip fidelity | No serialization step — editing raw text natively | Must round-trip ProseMirror ↔ markdown, risk of data mutation |
| Feature coverage | Headings, bold, italic, lists, blockquotes, code, tables, math, images, links | Must implement per-node-type, easy to miss cases |

#### Dependencies to add

- `codemirror-live-markdown` — live preview plugin
- `@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`, `@codemirror/language` — CodeMirror 6 core
- `@lezer/markdown` — peer dep for markdown parsing

#### Dependencies to remove

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` — Tiptap core
- `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-placeholder`, `@tiptap/extension-code-block-lowlight` — Tiptap extensions
- `tiptap-markdown` — markdown serializer for Tiptap

#### Files to change

- **Rewrite**: `packages/desktop/src/renderer/components/notes/TiptapEditor.tsx` → rename to `MarkdownEditor.tsx`, replace Tiptap `useEditor` with CodeMirror 6 `EditorView` wrapped in a React ref-based component
- **Update**: `packages/desktop/src/renderer/components/NotesView.tsx` — import renamed editor, add toggle button to toolbar
- **Update**: `packages/desktop/src/renderer/styles.css` — replace `.tiptap-*` styles with CodeMirror 6 theme classes (`.cm-*`, `codemirror-live-markdown` CSS variables)
- **Update**: `packages/desktop/src/renderer/components/notes/TiptapEditor.test.tsx` → rename to `MarkdownEditor.test.tsx`, update to test CodeMirror-based editor
- **Preserve**: `packages/desktop/src/renderer/components/notes/markdown-serializer.ts` — frontmatter parsing/serialization still needed, unchanged
- **Preserve**: `packages/desktop/src/renderer/components/notes/NotesContext.tsx` — context interface unchanged, editor swap is transparent

#### Syntax visibility toggle design

- **Placement**: Editor toolbar area (top of editor pane, `NotesView.tsx` line 42–55), right-aligned alongside existing Close button. Accessible but not competing with content.
- **Control**: Icon button using eye/eye-off SVG (consistent with existing Lucide-style icons in the codebase). Tooltip: "Toggle reading mode".
- **Keyboard shortcut**: `Cmd+/` (macOS) / `Ctrl+/` (Linux/Windows). Registered via CodeMirror `keymap` extension.
- **State**: `live-preview` (default) and `reading` modes. Persisted to `localStorage` keyed by `srgnt:editor:mode`.
- **Transition**: CSS opacity/visibility toggle on the live-preview decorations. Must respect `prefers-reduced-motion`.
- **Accessibility**: `aria-pressed` on the toggle button, `aria-label="Toggle reading mode"`. Focus management stays on editor content after toggle.

#### Validation criteria

- Markdown round-trip fidelity: load → edit syntax → save → reload produces identical markdown for unchanged sections.
- Cursor on heading line reveals `###` tokens; cursor leaves → tokens hidden, heading renders.
- Toggle switches between live-preview and reading mode; both render correctly.
- Existing tests (frontmatter display, save state indicators) continue to pass after migration.
- Dark mode and light mode both render correctly with the new editor.

## Regression Coverage Needed

- Visual regression test: verify that cursor on a heading line reveals `###` tokens.
- Edit test: change `###` to `##` while syntax is revealed, verify heading level updates on blur.
- Toggle test: switch between live-preview and reading mode, verify rendering is correct in both.
- Round-trip test: edit syntax tokens, save, reload, verify markdown fidelity is preserved.
- Keyboard shortcut test: verify toggle shortcut works.
- Accessibility test: verify toggle is keyboard-navigable, has proper aria-label, respects reduced-motion.
- Implemented: `packages/desktop/src/renderer/components/notes/MarkdownEditor.test.tsx` now covers frontmatter rendering, save-state indicators, heading syntax reveal in live preview, and full source mode rendering.
- Implemented validation: `pnpm --filter @srgnt/desktop test`, `pnpm --filter @srgnt/desktop typecheck`, and `pnpm --filter @srgnt/desktop build`.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting|STEP-14-04 Implement Obsidian-style live-preview markdown editor foundation]]
- Downstream step: [[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05 Add workspace-wide wikilink resolution, navigation, and note creation]]
- Downstream step: [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]]
- Session: [[05_Sessions/2026-04-01-042638-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-042638 OpenCode session for Build Notes tree and shared renderer selection state]]
- Session: [[05_Sessions/2026-04-01-045431-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-045431 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]]
- Session: [[05_Sessions/2026-04-01-190658-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-190658 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]]
- Session: [[05_Sessions/2026-04-01-192822-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-192822 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]]
- Architecture: [[01_Architecture/System_Overview|System Overview]]
- Decision: [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Define notes workspace boundary and cross-workspace navigation rules]]
- UX direction: [[06_Shared_Knowledge/srgnt_framework_ux_direction|Initial Product UX Direction]]
- Navigation/IA: [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-01 - Reported.
- 2026-04-01 - Root cause confirmed: ProseMirror document model discards raw syntax tokens during parsing.
- 2026-04-01 - Decision made: Replace Tiptap/ProseMirror with CodeMirror 6 + `codemirror-live-markdown` (Option A). User confirmed.
- 2026-04-01 - Researched `codemirror-live-markdown` (npm package, MIT, modular, supports headings/bold/italic/lists/blockquotes/code/tables/math/links). Also evaluated `codemirror-markdown-hybrid` as alternative.
- 2026-04-01 - Fix plan documented. Implementation pending.
- 2026-04-01 - SESSION-2026-04-01-190658 created to continue implementation and repair vault note integrity before handoff.
- 2026-04-01 - Fixed by migrating the notes editor from Tiptap to CodeMirror 6 + `codemirror-live-markdown`, adding a persisted source/live-preview toggle, and validating with full desktop test, typecheck, and build runs.
<!-- AGENT-END:bug-timeline -->
