---
note_type: bug
template_version: 2
contract_version: 1
title: Heading whitespace visual issue - requires verification
bug_id: BUG-0013
status: closed
severity: sev-3
category: logic
reported_on: '2026-04-12'
fixed_on: '2026-04-13'
owner: executor-1
created: '2026-04-12'
updated: '2026-04-13'
related_notes: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 Notes View]], [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 Product Hardening]]'
tags:
  - agent-vault
  - bug
---

# BUG-0013 - Heading whitespace visual issue - requires verification

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Heading whitespace visual issue - requires verification.
- Related notes: none linked yet.

## Observed Behavior

- Describe what actually happens.
- Include error text, incorrect output, broken UI state, or missing side effect when relevant.
- ATX headings (h1-h6) in the markdown live-preview editor render with no visual differentiation from body text: same font-size, same font-weight, no vertical whitespace separation from surrounding paragraphs.
- The project's CSS overrides the `codemirror-live-markdown` library's heading styles (`.cm-header-1` through `.cm-header-6`) with a single `color: var(--color-text-primary)` rule that strips out the library's `fontSize`, `fontWeight`, and `lineHeight` properties.
- The `.cm-heading-line` class applied by the library to heading lines has no corresponding CSS, so headings get zero vertical margin/padding.
- The `.cm-formatting-block` CSS class (used to hide `#` marks and trailing spaces) lacks `white-space: nowrap`, unlike `.cm-formatting-inline` which has `white-space: pre`.

## Expected Behavior

- Describe what should happen instead.
- Keep this outcome-specific so validation is straightforward.
- Headings should have distinct font sizes and weights per level (h1 largest, h6 smallest).
- Headings should have vertical whitespace (padding) above and below to visually separate them from surrounding content.
- Hidden block formatting marks should use `white-space: nowrap` to prevent whitespace collapse.

## Reproduction Steps

1. List the exact setup state.
2. List the user or developer actions.
3. Record the observed result.
- Open a markdown note in the Notes view.
- Add content with ATX headings: `# H1`, `## H2`, `### H3`, followed by paragraphs.
- Observe that all headings render with the same visual appearance as body text — no size/weight differentiation, no vertical spacing.

## Scope / Blast Radius

- List affected packages, commands, integrations, environments, or users.
- Note whether this is isolated, widespread, data-sensitive, or release-blocking.

## Suspected Root Cause

- Record current theories before the issue is proven.
- Mark assumptions clearly.

## Confirmed Root Cause

- Fill this in once investigation proves the cause.
- Link the decisive evidence such as code paths, tests, or logs.
- The project's CSS in `packages/desktop/src/renderer/styles.css` grouped heading classes (`.cm-header-1` through `.cm-header-6`) with inline formatting classes (`.cm-strong`, `.cm-emphasis`, etc.) under a single rule that only set `color: var(--color-text-primary)`. This overrode the `codemirror-live-markdown` library's `editorTheme` which provides per-level `fontSize`, `fontWeight`, and `lineHeight` for headings.
- No CSS rule existed for `.cm-heading-line`, the class applied by the library's `markdownStylePlugin` to add vertical whitespace to heading lines.
- The `.cm-formatting-block` CSS class (hiding `#` marks and trailing spaces on non-active heading lines) lacked `white-space: nowrap`, unlike `.cm-formatting-inline` which has `white-space: pre`. While not visually impactful due to `font-size: 0.01em` and `opacity: 0`, this was an inconsistency that could cause subtle whitespace behavior differences.

## Workaround

- Describe any temporary mitigation.
- Say who can use it and what risk remains.

## Permanent Fix Plan

- Describe the intended durable fix.
- Include related steps, decisions, or validation strategy if known.
- Separated heading CSS from inline formatting CSS in `packages/desktop/src/renderer/styles.css`.
- Added per-level heading styles: h1 (1.75em, 700), h2 (1.375em, 600), h3 (1.125em, 600), h4-h6 (600 weight only).
- Added `.cm-heading-line` CSS with `padding-top: 0.75rem` and `padding-bottom: 0.25rem` for vertical whitespace separation.
- Added `white-space: nowrap` to `.cm-formatting-block` for consistency with `.cm-formatting-inline`.
- Added unit test: `applies cm-heading-line class to ATX headings for vertical whitespace`.
- All 643 tests pass (642 existing + 1 new).

## Regression Coverage Needed

- List tests, fixtures, reproductions, alerts, or docs updates needed to stop the bug from returning.
- Unit test added in `MarkdownEditor.test.tsx` verifying `.cm-heading-line` class is applied to ATX headings.
- Existing GFM compliance tests and all 643 tests continue to pass.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- None yet.
<!-- AGENT-END:bug-related-notes -->
- [[02_Phases/Phase_14_notes_view/Phase|Phase 14 Notes View]] (heading rendering is part of the notes editor)
- [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 Product Hardening]] (visual quality)

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-12 - Reported.
<!-- AGENT-END:bug-timeline -->
- 2026-04-13 - Investigated and confirmed: headings lack visual hierarchy (font-size/weight) and vertical whitespace. Root cause: CSS override strips library heading styles and no `.cm-heading-line` CSS exists. Fixed by adding per-level heading styles, `.cm-heading-line` padding, and `white-space: nowrap` on `.cm-formatting-block`. Added regression test. All 643 tests pass.
