---
note_type: bug
template_version: 2
contract_version: 1
title: Slash commands trigger logic and indentation preservation issues
bug_id: BUG-0010
status: fixed
severity: sev-1
category: logic
reported_on: '2026-04-06'
fixed_on: '2026-04-06'
owner: fixer-codex
created: '2026-04-06'
updated: '2026-04-06'
related_notes:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]]'
  - '[[05_Sessions/2026-04-06-202256-implement-markdown-slash-commands-on-top-of-live-preview-vault-resume|SESSION-2026-04-06-202256 vault-resume session for Implement markdown slash commands on top of live preview]]'
tags:
  - agent-vault
  - bug
---

# BUG-0010 - Slash commands trigger logic and indentation preservation issues

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Slash commands trigger logic and indentation preservation issues.
- Related notes: [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]], [[05_Sessions/2026-04-06-202256-implement-markdown-slash-commands-on-top-of-live-preview-vault-resume|SESSION-2026-04-06-202256 vault-resume session for Implement markdown slash commands on top of live preview]].
- Slash commands trigger logic incorrectly checks cursor position instead of slash token position, causing failures when typing beyond "/"
- Command application drops leading whitespace/indentation, breaking valid indentation scenarios
- Missing test coverage for slash command functionality
- Related to Step 06 implementation in MarkdownEditor.tsx, WikilinkExtension.ts, and SlashCommandsExtension.ts

## Observed Behavior

- Describe what actually happens.
- Include error text, incorrect output, broken UI state, or missing side effect when relevant.
**Issue 1 - Trigger Logic:**
- When typing "/h2", the trigger logic uses `pos - 1` to calculate text before slash
- This includes "/h" in the textBeforeSlash, causing whitespace/start-of-line check to fail
- Result: autocomplete stops working after typing letters beyond "/"

**Issue 2 - Indentation Loss:**
- Commands replace from `line.from` (start of line) instead of slash token position
- Any leading whitespace that made the trigger valid gets deleted
- Breaks indentation and nesting scenarios that should be supported

**Missing Coverage:**
- No tests for slash command functionality
- No validation of trigger restrictions or code-block exclusion
- No testing of merged wikilink + slash completion sources

## Expected Behavior

- Describe what should happen instead.
- Keep this outcome-specific so validation is straightforward.

## Reproduction Steps

1. List the exact setup state.
2. List the user or developer actions.
3. Record the observed result.

## Scope / Blast Radius

- List affected packages, commands, integrations, environments, or users.
- Note whether this is isolated, widespread, data-sensitive, or release-blocking.

## Suspected Root Cause

- Record current theories before the issue is proven.
- Mark assumptions clearly.

## Confirmed Root Cause

**Issue 1 - Trigger Logic:**
- `shouldTriggerSlashCommand` incorrectly used `pos - 1` to calculate text before the slash position, which included the "/" character when letters were typed after "/"

**Issue 2 - Indentation Loss:**
- `apply` function in `slashCommandSource` replaced from `line.from` (start of line) instead of the slash token position

**Issue 3 - Integration Failure (CRITICAL):**
- `slashCommandSource` is synchronous while `wikilinkCompletionSource` is async
- CodeMirror's `autocompletion({ override: [...] })` requires all sources to have the same async/sync contract
- When mixed, the autocompletion system failed to activate slash commands in the live editor
- Fixed by adding `normalizeCompletionSources()` helper in `WikilinkExtension.ts` to wrap all sources in async functions

## Workaround

- None required - fix implemented.

## Permanent Fix Plan

**Fixes Applied:**
1. **Trigger Logic Fix**: Changed validation to check text before slash token start (`word.from`) instead of using `pos - 1`
2. **Indentation Preservation Fix**: Changed command insertion to replace only the slash token range (`from..to`) and preserve existing indentation
3. **Integration Fix**: Added `normalizeCompletionSources()` in `WikilinkExtension.ts` to ensure all completion sources have async contract

**Files Modified:**
- `packages/desktop/src/renderer/components/notes/SlashCommandsExtension.ts`
- `packages/desktop/src/renderer/components/notes/WikilinkExtension.ts`

**Tests Added:**
- `packages/desktop/src/renderer/components/notes/SlashCommandsExtension.test.tsx`
- `packages/desktop/src/renderer/components/notes/__slash_rootcause__.test.ts` (integration regression test)

## Workaround

- Describe any temporary mitigation.
- Say who can use it and what risk remains.

## Permanent Fix Plan

- Describe the intended durable fix.
- Include related steps, decisions, or validation strategy if known.

## Regression Coverage Needed

- Tests added in `packages/desktop/src/renderer/components/notes/SlashCommandsExtension.test.tsx`
  - triggers after indentation even when letters are typed after `/`
  - does not trigger mid-word
  - preserves leading indentation when applying `/todo`
- Integration test added in `packages/desktop/src/renderer/components/notes/__slash_rootcause__.test.ts`
  - verifies slash completions work when mixed with async wikilink completions
  - prevents regression of the integration failure
- All tests pass: `pnpm --filter @srgnt/desktop test` (194 tests passed)

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]]
- Session: [[05_Sessions/2026-04-06-202256-implement-markdown-slash-commands-on-top-of-live-preview-vault-resume|SESSION-2026-04-06-202256 vault-resume session for Implement markdown slash commands on top of live preview]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-06 - Reported.
- 2026-04-06 - Trigger logic and indentation fixes applied.
- 2026-04-07 - Integration fix applied (normalizeCompletionSources for mixed sync/async sources).
- 2026-04-07 - All tests passing (194 tests), E2E verified.
<!-- AGENT-END:bug-timeline -->
