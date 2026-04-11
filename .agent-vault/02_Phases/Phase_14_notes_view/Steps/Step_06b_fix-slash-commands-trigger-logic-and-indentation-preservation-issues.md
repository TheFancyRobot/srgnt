---
note_type: step
template_version: 2
contract_version: 1
title: Fix slash commands trigger logic and indentation preservation issues (BUG-0010)
step_id: STEP-14-06b
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: done
owner: fixer-codex
created: '2026-04-06'
updated: '2026-04-07'
depends_on:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06]]'
related_sessions:
  - '[[05_Sessions/2026-04-06-202256-implement-markdown-slash-commands-on-top-of-live-preview-vault-resume|SESSION-2026-04-06-202256]]'
related_bugs:
  - '[[03_Bugs/BUG-0010_slash-commands-trigger-logic-and-indentation-preservation-issues|BUG-0010]]'
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
tags:
  - agent-vault
  - step
  - bugfix
---

# Step 06b - Fix slash commands trigger logic and indentation preservation issues (BUG-0010)

This step tracked the bugfix work for [[03_Bugs/BUG-0010_slash-commands-trigger-logic-and-indentation-preservation-issues|BUG-0010]] which emerged during [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06]] implementation.

## Purpose

- Outcome: Fix slash commands trigger logic, indentation preservation, and sync/async integration issues.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].
- Related bug: [[03_Bugs/BUG-0010_slash-commands-trigger-logic-and-indentation-preservation-issues|BUG-0010]].

## Why This Step Exists

- BUG-0010 was discovered after Step 06 implementation: slash commands failed to trigger after typing letters beyond `/`, indentation was lost on command application, and mixed sync/async completion sources caused integration failures.
- This step ensured the slash command feature was production-ready before proceeding to search (Step 07) and hardening (Step 08).

## Prerequisites

- Step 06 must be complete with slash command menu implemented.
- Tests must pass before marking done.

## Relevant Code Paths

- `packages/desktop/src/renderer/components/notes/SlashCommandsExtension.ts` - trigger logic and command application
- `packages/desktop/src/renderer/components/notes/WikilinkExtension.ts` - completion source integration
- `packages/desktop/src/renderer/components/notes/SlashCommandsExtension.test.tsx` - regression tests
- `packages/desktop/src/renderer/components/notes/__slash_rootcause__.test.ts` - integration test

## Required Reading

- [[03_Bugs/BUG-0010_slash-commands-trigger-logic-and-indentation-preservation-issues|BUG-0010]] - full bug details and fix plan
- [[01_Architecture/System_Overview|System Overview]] - desktop app architecture

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: fixer-codex
- Last touched: 2026-04-07
- Next action: Completed - all BUG-0010 issues fixed and tests passing. Proceed to Step 07 (search).
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Trigger logic fix: Changed validation to check text before slash token start (`word.from`) instead of `pos - 1`
- Indentation fix: Command insertion replaces only slash token range, preserving existing indentation
- Integration fix: Added `normalizeCompletionSources()` helper to wrap all sources in async functions for CodeMirror compatibility
- All 194 tests pass: `pnpm --filter @srgnt/desktop test`

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-06 - [[05_Sessions/2026-04-06-202256-implement-markdown-slash-commands-on-top-of-live-preview-vault-resume|SESSION-2026-04-06-202256]] - Bug discovered and initial fixes applied.
- 2026-04-07 - Integration fix applied (normalizeCompletionSources for sync/async sources).
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- **Result**: BUG-0010 fully resolved. Slash commands now:
  - Trigger correctly after typing `/h2`, `/todo`, etc.
  - Preserve leading indentation when applying commands
  - Work alongside async wikilink completions
- **Validation**: 194 tests pass, E2E manual verification completed
- **Follow-up**: Proceed to Step 07 (whole-workspace search) or Step 08 (hardening)
