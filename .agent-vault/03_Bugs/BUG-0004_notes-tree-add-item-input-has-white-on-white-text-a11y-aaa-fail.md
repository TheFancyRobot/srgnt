---
note_type: bug
template_version: 2
contract_version: 1
title: Notes tree add-item input has white-on-white text (a11y AAA fail)
bug_id: BUG-0004
status: new
severity: sev-2
category: a11y
reported_on: '2026-04-01'
fixed_on: ''
owner: ''
created: '2026-04-01'
updated: '2026-04-01'
related_notes: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]], [[02_Phases/Phase_14_notes_view/Steps/Step_03_build-real-file-tree-component-for-notessidepanel|STEP-14-03 Build Notes tree and shared renderer selection state]], [[05_Sessions/2026-04-01-042638-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-042638]], [[06_Shared_Knowledge/srgnt_framework_ux_direction|UX Direction]], [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Navigation and IA]], [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
tags:
  - agent-vault
  - bug
---

# BUG-0004 - Notes tree add-item input has white-on-white text (a11y AAA fail)

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Notes tree add-item input has white-on-white text (a11y AAA fail).
- Related notes: [[02_Phases/Phase_14_notes_view/Steps/Step_03_build-real-file-tree-component-for-notessidepanel|STEP-14-03 Build Notes tree and shared renderer selection state]], [[05_Sessions/2026-04-01-042638-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-042638 OpenCode session for Build Notes tree and shared renderer selection state]].

## Observed Behavior

- Describe what actually happens.
- Include error text, incorrect output, broken UI state, or missing side effect when relevant.
- When clicking the "+" button to add a new folder or note in the Notes tree side panel, an inline input box appears for entering the name.
- The input text color is white (`#FFFFFF` or similar) regardless of theme, making entered text invisible against white backgrounds in light mode and against whatever background color appears in dark mode.
- Broken in **both light and dark mode** — text is unreadable in either theme.
- Contrast ratio is ~1:1 in light mode, far below WCAG AAA minimum of 7:1 (and even below AA minimum of 4.5:1). In dark mode the background may differ but contrast still fails AAA.

## Expected Behavior

- Describe what should happen instead.
- Keep this outcome-specific so validation is straightforward.
- The inline input for naming new notes/folders must render text with sufficient contrast against its background in both light and dark themes.
- WCAG AAA compliance requires a minimum contrast ratio of **7:1** for normal text.
- Both `color` and `background-color` (or their CSS variable equivalents) must be theme-aware and tested in both modes.

## Reproduction Steps

1. List the exact setup state.
2. List the user or developer actions.
3. Record the observed result.
1. Launch the desktop app in light mode.
2. Navigate to the Notes view.
3. Click the "+" (add item) button in the Notes tree side panel.
4. Observe the inline input box that appears for entering a name.
5. Type any characters — text is invisible (white-on-white).

## Scope / Blast Radius

- List affected packages, commands, integrations, environments, or users.
- Note whether this is isolated, widespread, data-sensitive, or release-blocking.
- Affects **all users** attempting to create new notes or folders via the Notes tree.
- Isolated to the inline rename/create input within the file tree component in `NotesSidePanel`.
- Not data-sensitive; does not block data operations but blocks a core user interaction (creating items).
- Users can work around by creating files externally, but that defeats the purpose of the in-app tree.

## Suspected Root Cause

- Record current theories before the issue is proven.
- Mark assumptions clearly.
- The inline input component likely inherits a light-themed `color` CSS variable but hardcodes or defaults to white text rather than using the theme's foreground variable.
- Check `NotesSidePanel.tsx` or the shared tree component for inline input styling — the `input` or `contentEditable` element's text color is not being set from the correct CSS variable (e.g., `--color-text-primary` or equivalent).

## Confirmed Root Cause

- Fill this in once investigation proves the cause.
- Link the decisive evidence such as code paths, tests, or logs.

## Workaround

- Describe any temporary mitigation.
- Say who can use it and what risk remains.

## Permanent Fix Plan

- Describe the intended durable fix.
- Include related steps, decisions, or validation strategy if known.
- Ensure the inline input's `color` uses the correct theme CSS variable (e.g., `var(--color-text-primary)`) and `background-color` uses `var(--color-bg-primary)` or similar.
- Verify contrast ratio >= 7:1 (AAA) for both light and dark mode using a contrast checker.
- Check other side panel inputs for the same pattern and fix consistently.

## Regression Coverage Needed

- List tests, fixtures, reproductions, alerts, or docs updates needed to stop the bug from returning.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_03_build-real-file-tree-component-for-notessidepanel|STEP-14-03 Build Notes tree and shared renderer selection state]]
- Session: [[05_Sessions/2026-04-01-042638-build-notes-tree-and-shared-renderer-selection-state-opencode|SESSION-2026-04-01-042638 OpenCode session for Build Notes tree and shared renderer selection state]]
- Architecture: [[01_Architecture/System_Overview|System Overview]]
- Shared knowledge: [[06_Shared_Knowledge/srgnt_framework_ux_direction|UX Direction]] — theme and visual direction for side panels
- Shared knowledge: [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Navigation and IA]] — notes tree navigation contract
- Preceding phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]] — introduced the side panel shell and layout conventions
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-01 - Reported.
<!-- AGENT-END:bug-timeline -->
