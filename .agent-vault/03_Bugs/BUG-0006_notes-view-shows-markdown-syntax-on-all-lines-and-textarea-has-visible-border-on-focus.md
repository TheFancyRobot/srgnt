---
note_type: bug
template_version: 2
contract_version: 1
title: Notes view shows markdown syntax on all lines and textarea has visible border on focus
bug_id: BUG-0006
status: closed
severity: sev-2
category: ui
reported_on: '2026-04-01'
fixed_on: '2026-04-01'
owner: ''
created: '2026-04-01'
updated: '2026-04-01'
related_notes: '["02_Phases/Phase_14_notes_view/Phase.md", "02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting.md", "03_Bugs/BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor.md"]'
tags:
  - agent-vault
  - bug
---

# BUG-0006 - Notes view shows markdown syntax on all lines and textarea has visible border on focus

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Notes view shows markdown syntax on all lines and textarea has visible border on focus.
- Related notes: none linked yet.
- Two related UI defects in the live-preview markdown editor:
  1. Markdown syntax (e.g. `**`, `#`, `---`) is visible on ALL lines, not just the currently focused/cursor line. Only the line containing the cursor should show raw syntax tokens; all others should render as formatted markdown.
  2. The `<textarea>` element has a bold yellow/orange border/outline when the editor receives focus. There should be no visible border or outline on focus.

## Observed Behavior

- Describe what actually happens.
- Include error text, incorrect output, broken UI state, or missing side effect when relevant.
- In the Obsidian-style live-preview markdown editor, markdown syntax tokens (`**`, `#`, `---`, backticks, etc.) are shown as visible text on every line of the document, regardless of cursor position.
- The `<textarea>` overlay displays a prominent yellow/orange border when the editor gains keyboard focus.

## Expected Behavior

- Describe what should happen instead.
- Keep this outcome-specific so validation is straightforward.
- **Issue 1**: Only the line where the cursor is currently positioned should show raw markdown syntax tokens. All other lines should render fully formatted (e.g. bold text shows as bold, headings render with heading styles, etc.). This is the standard Obsidian live-preview behavior.
- **Issue 2**: The textarea should have no visible border or outline when focused. The focus state should be seamless/invisible to the user — the rendered content and the invisible textarea should merge visually.

## Reproduction Steps

1. List the exact setup state.
2. List the user or developer actions.
3. Record the observed result.
1. Open the desktop app and navigate to the Notes view.
2. Select or create a markdown note with mixed content (headings, bold, italic, code, lists).
3. Place cursor on one line.
4. Observe: all other lines still show raw syntax tokens instead of rendered markdown.
5. Click into the editor textarea.
6. Observe: a bold yellow/orange border appears around the textarea.

## Scope / Blast Radius

- List affected packages, commands, integrations, environments, or users.
- Note whether this is isolated, widespread, data-sensitive, or release-blocking.
- Affects the markdown editor component in the Notes view (renderer process).
- Related to BUG-0005 (markdown syntax tokens were invisible/uneditable) — that fix may have introduced or revealed these regressions.

## Suspected Root Cause

- Record current theories before the issue is proven.
- Mark assumptions clearly.
- **Issue 1**: The syntax-hiding logic likely applies CSS visibility rules at a global level rather than per-line based on cursor position. The live-preview component may not be toggling a "focused line" class correctly, or the CSS selector targeting unfocused lines is missing/incorrect.
- **Issue 2**: The textarea likely lacks `outline: none` and `border: none` in its focus state CSS, or Electron's default focus ring is bleeding through.

## Confirmed Root Cause

- Fill this in once investigation proves the cause.
- Link the decisive evidence such as code paths, tests, or logs.
**Issue 1 (syntax visible on all lines):** The editor used a `SyntaxMode` toggle with a `Compartment` to switch between `live-preview` and `source` modes. The `[data-mode='source']` CSS overrides in `styles.css` force-showed formatting tokens (`max-width: none; opacity: 1`), but the `collapseOnSelectionFacet` was conditionally enabled only when `syntaxMode === 'live-preview'`. The toggle introduced complexity and a state where source mode showed all tokens. Fix: removed the mode toggle entirely; `collapseOnSelectionFacet.of(true)` is now always active, so only the cursor line shows raw syntax.

**Issue 2 (textarea border on focus):** CodeMirror 6 uses a hidden `<textarea>` for IME/clipboard input. This element inherited default browser focus outlines. Fix: added `outline: none !important; border: none !important; box-shadow: none !important` targeting `.cm-editor textarea`, plus reinforced `outline: none` on `.cm-editor.cm-focused` and `.cm-content:focus`.

## Workaround

- Describe any temporary mitigation.
- Say who can use it and what risk remains.

## Permanent Fix Plan

- Describe the intended durable fix.
- Include related steps, decisions, or validation strategy if known.

## Regression Coverage Needed

- List tests, fixtures, reproductions, alerts, or docs updates needed to stop the bug from returning.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- None yet.
<!-- AGENT-END:bug-related-notes -->
- [[02_Phases/Phase_14_notes_view/Phase|Phase 14: Notes View]]
- [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting|Step 14-04: Implement Obsidian-style live-preview markdown editor]]
- [[03_Bugs/BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor|BUG-0005: Markdown syntax tokens invisible and uneditable]] (predecessor fix, likely regression source)
- [[06_Shared_Knowledge/srgnt_framework_ux_direction|UX Direction]]
- [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Navigation and IA]]

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-01 - Reported.
<!-- AGENT-END:bug-timeline -->
