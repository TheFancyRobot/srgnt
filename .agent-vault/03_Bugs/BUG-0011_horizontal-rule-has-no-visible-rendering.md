---
note_type: bug
template_version: 2
contract_version: 1
title: Horizontal rule (----) has no visible rendering
bug_id: BUG-0011
status: closed
severity: sev-3
category: ui
reported_on: '2026-04-03'
fixed_on: '2026-04-03'
owner: ''
created: '2026-04-03'
updated: '2026-04-03'
related_notes: '[[BUG-0008_blockquotes-have-no-visual-styling-in-markdown-editor]]'
tags:
  - agent-vault
  - bug
---

# BUG-0011 - Horizontal rule (----) has no visible rendering

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Horizontal rules (`----`, `***`, `---`) render as an extremely faint or invisible line.
- The `----` text is hidden by codemirror-live-markdown formatting but the visual replacement (if any) is barely perceptible.
- Users cannot see section breaks in their documents.
- Affects both live-preview and rendered display modes.
- Evidence: Playwright screenshots `02-lp-paragraphs.png` (between "Note:" section and "Overview" heading), `17-rd-top-toc.png`.

## Observed Behavior

- The `----` horizontal rule syntax is hidden (the dashes are not visible as raw text).
- In its place, there is either no visual element, or an extremely faint line that is nearly invisible.
- The section break between the "Note:" paragraph and the "Overview" heading has barely any visual weight.
- Users scanning the document cannot identify where thematic breaks occur.

## Expected Behavior

- Horizontal rules should render as a clear, visible horizontal line spanning the content width.
- Style: `1px solid var(--color-border-default)` or similar, with vertical margin (e.g., 1.5rem) above and below.
- In live-preview mode, the `----` text could optionally be shown faintly on the active line, with the visual line always present.

## Reproduction Steps

1. Create a note with a horizontal rule:
   ```
   Some text above.

   ----

   Some text below.
   ```
2. Observe that the `----` disappears and no clear visual separator is rendered.
3. Compare with how a heading or paragraph break looks — the HR should be more visually prominent.

## Scope / Blast Radius

- Package: `packages/desktop` — MarkdownEditor component and `styles.css`.
- Lower severity than blockquotes/code blocks: horizontal rules are used less frequently.
- Affects document structure/readability for users who rely on section breaks.

## Suspected Root Cause

- The `codemirror-live-markdown` library hides the `----` formatting marks but no CSS or ViewPlugin adds a visual replacement.
- CodeMirror's markdown parser produces a `HorizontalRule` (or `ThematicBreak`) node in the syntax tree, but no decoration targets it.
- The thin line visible may be a CSS artifact from the `.cm-line` border or just margin collapse.

## Confirmed Root Cause
- Confirmed in `packages/desktop/src/renderer/components/notes/MarkdownEditor.tsx`: the editor already decorates list-item lines, but it had no CodeMirror decoration for `HorizontalRule` / `ThematicBreak` syntax nodes.
- `codemirror-live-markdown` hides block formatting markers on inactive lines, so the raw `----` text was collapsed without any replacement visual element.
- `packages/desktop/src/renderer/styles.css` also had no dedicated horizontal-rule styling, so the thematic break line inherited normal `.cm-line` rendering and appeared invisible.
- The fix adds a dedicated `horizontalRulePlugin` that decorates thematic break lines with `cm-hr-line`, and CSS that draws a visible separator via `::after` using `var(--color-border-default)`.
## Permanent Fix Plan

- Create a `horizontalRulePlugin` (ViewPlugin) in `MarkdownEditor.tsx` that finds `HorizontalRule`/`ThematicBreak` nodes and applies `Decoration.line({ class: 'cm-hr-line' })`.
- Add CSS: `.cm-hr-line { border-bottom: 1px solid var(--color-border-default); margin: 1rem 0; }` or use a `::after` pseudo-element for the line.
- Ensure the rule is visible in both live-preview and rendered modes.

## Regression Coverage Needed

- E2E test: verify HR lines have the `cm-hr-line` class.
- E2E test: verify the HR element has visible border or visual indicator.
- Visual screenshot comparison test.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- [[BUG-0008_blockquotes-have-no-visual-styling-in-markdown-editor]] — same architectural gap: formatting hidden but no visual replacement.
- [[BUG-0009_code-blocks-indented-and-fenced-render-as-plain-text-with-no-styling]] — same pattern.
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-03 - Reported.
<!-- AGENT-END:bug-timeline -->
