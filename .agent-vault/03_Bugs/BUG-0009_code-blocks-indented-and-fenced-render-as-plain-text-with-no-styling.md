---
note_type: bug
template_version: 2
contract_version: 1
title: Code blocks (indented and fenced) render as plain text with no styling
bug_id: BUG-0009
status: new
severity: sev-2
category: ui
reported_on: '2026-04-03'
fixed_on: ''
owner: ''
created: '2026-04-03'
updated: '2026-04-03'
related_notes: '[[BUG-0008_blockquotes-have-no-visual-styling-in-markdown-editor]]'
tags:
  - agent-vault
  - bug
---

# BUG-0009 - Code blocks (indented and fenced) render as plain text with no styling

Use one note per bug in `03_Bugs/`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Both indented (4-space) and fenced (triple-backtick) code blocks render as regular body text with no visual distinction.
- No monospace font, no background color, no code container styling is applied to either variant.
- Indented code blocks: the 4-space indentation is consumed but not replaced with any visual indicator.
- Fenced code blocks: the ``` delimiters are faded/hidden by codemirror-live-markdown, but the code content renders as plain text with no container.
- Inline code spans (single backtick) DO render correctly — this bug only affects block-level code.
- Affects both live-preview and rendered display modes.
- Evidence: Playwright screenshots `12-lp-code-blocks.png`, `13-lp-code-fenced.png`, `22-rd-code-blocks.png`, `23-rd-links-emphasis.png`.

## Observed Behavior

### Indented code blocks (4-space)
- "This is a code block." (indented 4 spaces) renders in the same sans-serif body font as surrounding paragraphs.
- AppleScript example (`tell application "Foo" / beep / end tell`) renders as regular text.
- HTML code blocks (`<div class="footer">...`) render as plain text.

### Fenced code blocks (triple-backtick)
- Fenced code block content renders in sans-serif body font with no visual distinction from paragraphs.
- The ``` delimiter markers are visible but heavily faded (opacity near 0) — the content between them has no container.
- In rendered mode, the ``` delimiters are fully hidden and the code content floats as plain text.
- No syntax highlighting is applied even when a language identifier is provided.

## Expected Behavior

- Both code block types should render with:
  - Monospace font (JetBrains Mono or system monospace).
  - Subtle background color container (e.g., `var(--color-surface-tertiary)` with border-radius).
  - Consistent left/right padding inside the container.
  - Consistent styling between live-preview and rendered modes.
- Fenced code blocks: the ``` delimiters should appear inside/as part of the container in live-preview mode.
- Optional: language label when a language identifier is provided (e.g., ```js).

## Reproduction Steps

1. Create a note with an indented code block:
   ```
   This is a paragraph.

       This should be a code block.
   ```
2. Also add a fenced code block:
   ````
   ```
   const x = 42;
   console.log(x);
   ```
   ````
3. Observe both render as plain paragraph text with no code styling.
4. Toggle to "Rendered only" mode — same issue in both cases.

## Scope / Blast Radius

- Package: `packages/desktop` — MarkdownEditor component and `styles.css`.
- Affects all users writing documentation, code snippets, or technical notes.
- Widespread: code blocks are among the most heavily used markdown features.

## Suspected Root Cause

- CodeMirror's markdown parser recognizes `CodeBlock`/`CodeText` (indented) and `FencedCode` (fenced) nodes in the syntax tree, but no ViewPlugin in `MarkdownEditor.tsx` decorates these lines.
- The existing `listLinePlugin` pattern shows how to add line decorations for specific node types — the same approach is needed for code block nodes.
- The `codemirror-live-markdown` library handles the fenced code formatting marks (```) but not the content styling.
- CSS has `.cm-code` rules for inline code spans but nothing targeting code block lines.

## Permanent Fix Plan

- Create a single `codeBlockLinePlugin` (ViewPlugin) in `MarkdownEditor.tsx` that iterates both `CodeBlock`/`CodeText` and `FencedCode` syntax tree nodes and applies `Decoration.line()` with a class like `cm-codeblock-line`.
- Add first/last line markers (`cm-codeblock-first`, `cm-codeblock-last`) for border-radius styling on the container.
- Add CSS rules in `styles.css` for `.cm-codeblock-line` with monospace font, background color, and padding.

## Regression Coverage Needed

- E2E test: verify indented code block lines have the `cm-codeblock-line` class.
- E2E test: verify fenced code block lines have the `cm-codeblock-line` class.
- E2E test: verify code block text renders in monospace font with background.
- Visual screenshot comparison test for both variants.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- [[BUG-0008_blockquotes-have-no-visual-styling-in-markdown-editor]] — same architectural pattern: missing ViewPlugin for block-level styling.
- [[BUG-0011_horizontal-rule-has-no-visible-rendering]] — same pattern.
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-03 - Reported. Merged from separate BUG-0009 (indented) and BUG-0010 (fenced) into a single bug.
<!-- AGENT-END:bug-timeline -->
