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

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Implement markdown editor with syntax highlighting.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

## Required Reading

- [[01_Architecture/System_Overview|System Overview]] - Desktop app architecture
- Phase 14 scope notes on editor choice: ProseMirror-based library (Tiptap preferred)
- Tiptap docs: https://tiptap.dev/docs — React integration, Starter Kit, Markdown extension
- `@tiptap/pm` package for ProseMirror primitives when needed

## Companion Notes

- [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: OpenCode
- Last touched: 2026-04-01
- Next action: Start STEP-14-05 wikilink support on top of the CodeMirror live-preview editor.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-01 - [[05_Sessions/2026-04-01-045431-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-045431 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]] - Session created.
- 2026-04-01 - [[05_Sessions/2026-04-01-190658-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-190658 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]] - Bug-orchestration session created to continue BUG-0005 implementation and repair vault note integrity.
- 2026-04-01 - [[05_Sessions/2026-04-01-192822-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-01-192822 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]] - Session created.
- 2026-04-02 - [[05_Sessions/2026-04-02-042138-implement-obsidian-style-live-preview-markdown-editor-foundation-opencode|SESSION-2026-04-02-042138 OpenCode session for Implement Obsidian-style live-preview markdown editor foundation]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
