---
note_type: step
template_version: 2
contract_version: 1
title: Implement markdown slash commands on top of live preview
step_id: STEP-14-06
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: done
owner: ''
created: '2026-03-31'
updated: '2026-04-07'
depends_on:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting|STEP-14-04]]'
related_sessions:
  - '[[05_Sessions/2026-04-06-202256-implement-markdown-slash-commands-on-top-of-live-preview-vault-resume|SESSION-2026-04-06-202256 vault-resume session for Implement markdown slash commands on top of live preview]]'
  - '[[05_Sessions/2026-04-06-213600-implement-markdown-slash-commands-on-top-of-live-preview-bugfix-reviewers|SESSION-2026-04-06-213600 bugfix-reviewers session for Implement markdown slash commands on top of live preview]]'
  - '[[05_Sessions/2026-04-07-225700-implement-markdown-slash-commands-on-top-of-live-preview-reviewer|SESSION-2026-04-07-225700 reviewer session for Implement markdown slash commands on top of live preview]]'
related_bugs:
  - '[[03_Bugs/BUG-0010_slash-commands-trigger-logic-and-indentation-preservation-issues|BUG-0010 Slash commands trigger logic and indentation preservation issues]]'
  - '[[03_Bugs/BUG-0012_markdown-editor-shipped-commonmark-only-parsing-so-gfm-task-lists-tables-strikethrough-and-bare-autolinks-did-not-render|BUG-0012 Markdown editor shipped CommonMark-only parsing so GFM task lists, tables, strikethrough, and bare autolinks did not render]]'
tags:
  - agent-vault
  - step
---

# Step 06 - Implement markdown slash commands on top of live preview

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Implement Notion-style slash commands menu.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

## Required Reading

- [[01_Architecture/System_Overview|System Overview]] - Desktop app architecture
- Notion slash commands: `/heading`, `/bullet`, `/number`, `/todo`, `/quote`, `/code`, `/callout`, `/divider`, `/table`

## Companion Notes

- [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: 
- Last touched: 2026-04-07
- Next action: Completed - slash commands implemented and BUG-0010 fixed.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.
- 2026-04-07 reviewer pass: expanded slash command coverage in `packages/desktop/src/renderer/components/notes/SlashCommandsExtension.ts` to include `/heading4`, `/heading5`, `/heading6`, `/bold`, `/italic`, `/strikethrough`, `/link`, `/image`, `/code-inline`, and `/done`.
- 2026-04-07 reviewer pass: enabled GFM parsing plus GFM rendering support in `packages/desktop/src/renderer/components/notes/MarkdownEditor.tsx` so the slash commands' emitted task lists, tables, strikethrough, and bare URLs render correctly.
- 2026-04-07 reviewer pass: added regression coverage in `packages/desktop/src/renderer/components/notes/MarkdownEditor.test.tsx`; `pnpm --filter @srgnt/desktop test` passed with 198/198 tests green.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-06 - [[05_Sessions/2026-04-06-202256-implement-markdown-slash-commands-on-top-of-live-preview-vault-resume|SESSION-2026-04-06-202256 vault-resume session for Implement markdown slash commands on top of live preview]] - Session created.
- 2026-04-06 - [[05_Sessions/2026-04-06-213600-implement-markdown-slash-commands-on-top-of-live-preview-bugfix-reviewers|SESSION-2026-04-06-213600 bugfix-reviewers session for Implement markdown slash commands on top of live preview]] - Session created.
- 2026-04-07 - [[05_Sessions/2026-04-07-225700-implement-markdown-slash-commands-on-top-of-live-preview-reviewer|SESSION-2026-04-07-225700 reviewer session for Implement markdown slash commands on top of live preview]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
