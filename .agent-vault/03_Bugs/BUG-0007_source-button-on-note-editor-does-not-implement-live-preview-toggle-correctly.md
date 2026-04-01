---
note_type: bug
template_version: 2
contract_version: 1
title: Source button on note editor does not implement live-preview toggle correctly
bug_id: BUG-0007
status: new
severity: sev-2
category: logic
reported_on: '2026-04-01'
fixed_on: ''
owner: ''
created: '2026-04-01'
updated: '2026-04-01'
related_notes: |-
  [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
    - [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting|STEP-14-04 Implement Obsidian-style live-preview markdown editor foundation]]
    - [[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05 Add workspace-wide wikilink resolution, navigation, and note creation]]
    - [[03_Bugs/BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor|BUG-0005 Markdown syntax tokens invisible and uneditable in live-preview editor]]
    - [[03_Bugs/BUG-0006_notes-view-shows-markdown-syntax-on-all-lines-and-textarea-has-visible-border-on-focus|BUG-0006 Notes view shows markdown syntax on all lines and textarea has visible border on focus]]
tags:
  - agent-vault
  - bug
---

# BUG-0007 - Source button on note editor does not implement live-preview toggle correctly

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Source button on note editor does not implement live-preview toggle correctly.
- Related notes: [[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05 Add workspace-wide wikilink resolution, navigation, and note creation]].
- The "Source" button on the note editor view toggles between a raw-source mode and a rendered mode, but this is not the intended Obsidian-style live-preview behavior.
- In the correct implementation, the editor should always show rendered content for all lines except the currently focused line, which should show raw markdown syntax for editing.
- There is no need for a Source toggle button at all — the live-preview mode should handle both rendered and raw display simultaneously based on cursor position.

## Observed Behavior

- Describe what actually happens.
- Include error text, incorrect output, broken UI state, or missing side effect when relevant.
- The note editor has a "Source" button that toggles the entire editor between raw markdown source view and rendered preview view.
- In source mode, all lines display raw markdown syntax.
- In preview/rendered mode, all lines display rendered content.
- The focused/cursor line does not toggle between raw and rendered — it behaves the same as all other lines.
- This makes the editor behave like a traditional two-pane editor rather than an Obsidian-style live-preview editor.

## Expected Behavior

- Describe what should happen instead.
- Keep this outcome-specific so validation is straightforward.
- The editor should use Obsidian-style live-preview: **all non-focused lines render markdown as rich content**, while the **currently focused line (where the cursor is) shows raw markdown syntax** for direct editing.
- As the user moves the cursor to a different line, the previously focused line re-renders to rich content and the new focused line switches to raw syntax.
- There should be no global Source/Preview toggle button — the live-preview behavior handles both simultaneously.
- This is consistent with how Obsidian's live-preview mode works and matches the intent of STEP-14-04.

## Reproduction Steps

1. List the exact setup state.
2. List the user or developer actions.
3. Record the observed result.
1. Open the srgnt desktop app.
2. Navigate to the Notes view.
3. Open or create a markdown note with mixed content (headings, bold, lists, code).
4. Observe the "Source" button in the editor toolbar.
5. Click the Source button — the entire editor toggles to raw markdown view.
6. Click again — the entire editor toggles back to rendered view.
7. In either mode, position the cursor on any line and observe that there is no per-line raw/rendered toggle based on focus.

## Scope / Blast Radius

- List affected packages, commands, integrations, environments, or users.
- Note whether this is isolated, widespread, data-sensitive, or release-blocking.
- Affects the Notes view markdown editor (renderer package).
- Impacts all users editing notes in the desktop app.
- Not data-sensitive or release-blocking, but a core UX deficiency in the editor.
- Related to [[03_Bugs/BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor|BUG-0005]] and [[03_Bugs/BUG-0006_notes-view-shows-markdown-syntax-on-all-lines-and-textarea-has-visible-border-on-focus|BUG-0006]], which also involved live-preview rendering issues.

## Suspected Root Cause

- Record current theories before the issue is proven.
- Mark assumptions clearly.
- The live-preview editor implementation (from STEP-14-04) may have been built with a global source/preview toggle instead of per-line focus-based rendering.
- The underlying rich-text or code-mirror editor may not have the cursor-position-aware rendering logic needed for Obsidian-style live preview.
- The Source button itself may be a remnant of an earlier approach that should be removed or repurposed.

## Confirmed Root Cause

- Fill this in once investigation proves the cause.
- Link the decisive evidence such as code paths, tests, or logs.

## Workaround

- Describe any temporary mitigation.
- Say who can use it and what risk remains.

## Permanent Fix Plan

- Describe the intended durable fix.
- Include related steps, decisions, or validation strategy if known.
- Remove or repurpose the Source toggle button.
- Implement per-line focus-based rendering: detect cursor line position, render that line as raw markdown syntax, render all other lines as rich content.
- Re-render on cursor movement (line changes).
- May require changes to the underlying editor component (likely CodeMirror or similar) to support mixed raw/rendered line display.

## Regression Coverage Needed

- List tests, fixtures, reproductions, alerts, or docs updates needed to stop the bug from returning.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
- Steps:
  - [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting|STEP-14-04 Implement Obsidian-style live-preview markdown editor foundation]]
  - [[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05 Add workspace-wide wikilink resolution, navigation, and note creation]]
  - [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]]
- Related bugs:
  - [[03_Bugs/BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor|BUG-0005 Markdown syntax tokens invisible and uneditable in live-preview editor]]
  - [[03_Bugs/BUG-0006_notes-view-shows-markdown-syntax-on-all-lines-and-textarea-has-visible-border-on-focus|BUG-0006 Notes view shows markdown syntax on all lines and textarea has visible border on focus]]
- Sessions:
  - [[05_Sessions/2026-04-01-192822-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-192822 Implement Obsidian-style live-preview markdown editor foundation]]
- Architecture: [[01_Architecture/System_Overview|System Overview]]
- Decisions: [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Define notes workspace boundary and cross-workspace navigation rules]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-01 - Reported.
<!-- AGENT-END:bug-timeline -->
