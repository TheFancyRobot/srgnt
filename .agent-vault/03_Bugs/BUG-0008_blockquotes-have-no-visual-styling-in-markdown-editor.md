---
note_type: bug
template_version: 2
contract_version: 1
title: Blockquotes have no visual styling in markdown editor
bug_id: BUG-0008
status: closed
severity: sev-2
category: ui
reported_on: '2026-04-03'
fixed_on: '2026-04-03'
owner: ''
created: '2026-04-03'
updated: '2026-04-03'
related_notes: '[[BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor]], [[BUG-0006_notes-view-shows-markdown-syntax-on-all-lines-and-textarea-has-visible-border-on-focus]]'
tags:
  - agent-vault
  - bug
---

# BUG-0008 - Blockquotes have no visual styling in markdown editor

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Blockquotes (`> text`) have zero visual styling in both live-preview and rendered display modes.
- The `>` syntax markers are correctly hidden by codemirror-live-markdown, but no visual replacement (left border, background, indentation) is rendered.
- Blockquote text is visually indistinguishable from regular paragraph text.
- Affects all blockquote variants: simple, multi-paragraph, nested (`> >`), and blockquotes containing headers, lists, or code.
- Evidence: Playwright screenshots `05-lp-blockquotes-nested.png`, `06-lp-blockquotes-elements.png`, `19-rd-blockquotes.png`, `20-rd-lists.png`.

## Observed Behavior

- Blockquote content renders as regular paragraph text with no visual distinction.
- The `>` markers are hidden (correct), but nothing replaces them visually.
- Nested blockquotes (`> > text`) show all levels at the same indentation — no nesting depth is visible.
- Blockquotes containing headers render the header styling but no blockquote container.
- Blockquotes containing ordered lists render the list but no blockquote container.
- Blockquotes containing indented code render as plain text (overlaps with BUG-0009).

## Expected Behavior

- Blockquotes should have a visible left border (e.g., 3px solid left border in brand or muted color).
- Blockquote text should be slightly indented from the left margin.
- Optional: light background tint to further distinguish from body text.
- Nested blockquotes should show progressively deeper indentation / additional border.
- All inner content (headers, lists, code) should render inside the blockquote container.

## Reproduction Steps

1. Create a note in the Notes view with blockquote markdown: `> This is a blockquote`.
2. Also add nested blockquotes: `> > Nested`.
3. Observe that the `>` markers are hidden but no visual blockquote styling appears.
4. Toggle between "Rendered only" and "Active-line edit" modes — both lack styling.

## Scope / Blast Radius

- Package: `packages/desktop` — MarkdownEditor component and `styles.css`.
- Affects all users viewing or editing notes with blockquotes.
- Widespread: blockquotes are a fundamental markdown element.

## Suspected Root Cause

- The `codemirror-live-markdown` library's `livePreviewPlugin` hides the `>` formatting marks but there are no CSS rules in `styles.css` targeting blockquote line decorations.
- The `MarkdownEditor.tsx` has a `listLinePlugin` for list bullet/number rendering but no equivalent `blockquoteLinePlugin` to decorate blockquote lines with CSS classes.
- CodeMirror's markdown mode parses `Blockquote` nodes in the syntax tree, but no ViewPlugin iterates them to add line decorations.

## Confirmed Root Cause
- Confirmed in `packages/desktop/src/renderer/components/notes/MarkdownEditor.tsx`: the editor already added line decorations for list items, but blockquote syntax nodes were never decorated, so `codemirror-live-markdown` hid the `>` `QuoteMark` tokens without any replacement visual treatment.
- Confirmed in `packages/desktop/src/renderer/styles.css`: there were CSS rules for `.cm-list-bullet-line` and `.cm-list-ordered-line`, but no corresponding `.cm-blockquote-line` rules, so blockquote lines rendered exactly like plain paragraphs in both live-preview and rendered display modes.
- The fix adds a dedicated `blockquoteLinePlugin` that decorates every line covered by `Blockquote` nodes and records nesting depth via `data-blockquote-depth`, plus matching CSS that restores the left border, indentation, and subtle quote background.
## Permanent Fix Plan

- Create a `blockquoteLinePlugin` (ViewPlugin) in `MarkdownEditor.tsx` that iterates `Blockquote` syntax tree nodes and applies `Decoration.line()` with a class like `cm-blockquote-line`.
- Support nesting depth via a `data-blockquote-depth` attribute.
- Add CSS rules in `styles.css` for `.cm-blockquote-line` with left border, padding-left, and optional background.
- Handle nested blockquotes by stacking borders or increasing indent.

## Regression Coverage Needed

- E2E test: verify blockquote lines have the `cm-blockquote-line` class.
- E2E test: verify nested blockquote lines have correct `data-blockquote-depth` attribute.
- Visual screenshot comparison test for blockquote rendering.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- [[BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor]] — related live-preview formatting issue.
- [[BUG-0006_notes-view-shows-markdown-syntax-on-all-lines-and-textarea-has-visible-border-on-focus]] — related markdown rendering issue.
- [[BUG-0009_code-blocks-indented-and-fenced-render-as-plain-text-with-no-styling]] — code blocks inside blockquotes also unstyled.
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-03 - Reported.
<!-- AGENT-END:bug-timeline -->
