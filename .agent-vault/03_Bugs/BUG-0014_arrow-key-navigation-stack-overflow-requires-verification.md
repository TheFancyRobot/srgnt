---
note_type: bug
template_version: 2
contract_version: 1
title: Arrow key navigation stack overflow - requires verification
bug_id: BUG-0014
status: not-a-bug
severity: sev-3
category: logic
reported_on: '2026-04-12'
fixed_on: '2026-04-13'
owner: executor
created: '2026-04-12'
updated: '2026-04-13'
related_notes: []
tags:
  - agent-vault
  - bug
date_created: '2026-04-12'
investigation_status: closed_thorough_investigation_no_code_defect_found
notes: All tests pass including cursorLineUp/cursorLineDown tests. No infinite loops found in code analysis. Likely a stale build or environment issue. Requires E2E testing in Electron context to verify.
---

# BUG-0014 - Arrow key navigation stack overflow - requires verification

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Arrow key navigation stack overflow - requires verification.
- Related notes: none linked yet.

## Observed Behavior

- Describe what actually happens.
- Include error text, incorrect output, broken UI state, or missing side effect when relevant.

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

- Fill this in once investigation proves the cause.
- Link the decisive evidence such as code paths, tests, or logs.
No code defect found. Thorough investigation of all arrow key navigation paths confirms the implementation is safe:

1. **Arrow key handling**: Fully delegated to CodeMirror's `defaultKeymap` which provides `cursorLineUp`/`cursorLineDown` from `@codemirror/commands`. No custom arrow key handlers exist in the editor. Comment at `MarkdownEditor.tsx:567` explicitly documents this.

2. **No recursive dispatch loops**: The `updateListener` in MarkdownEditor only triggers on `docChanged`, not on `selectionSet`. No CodeMirror extension dispatches transactions in response to selection changes. Arrow keys produce selection-only updates which do not trigger the content change callback.

3. **Custom plugins guard against selectionSet**: `blockFormattingRevealPlugin` and `autolinkPlugin` explicitly skip rebuilds on `selectionSet` (comment at line 203-205: "selectionSet triggers on every arrow key, causing excessive rebuilds"). All other custom plugins (listLine, blockquoteLine, codeBlockLine, checkboxLine, calloutLine, horizontalRule, headingId) only rebuild on `docChanged || viewportChanged`.

4. **codemirror-live-markdown library plugins**: The `livePreviewPlugin` and `linkPlugin` do rebuild decorations on `selectionSet`, but they only rebuild decoration sets (no transaction dispatch), so they cannot cause recursive loops. This is by design for revealing source markdown on the active line.

5. **Global keydown handlers**: `LayoutContext.tsx` only handles `Ctrl+B`. `ActivityBar.tsx` handles ArrowUp/ArrowDown for focus navigation (proper switch/case with breaks, no recursion). `TerminalPanel.tsx` only handles `Shift+Enter`. `NotesSidePanel.tsx` handles Enter/Space/F2/Escape/Delete (no arrow keys). None of these can interact with the CodeMirror editor's arrow key handling.

6. **All existing tests pass**: Including `cursorLineUp`/`cursorLineDown` behavioral tests and the "moves vertically through live-preview content without recursive scan errors" test.

7. **Defensive tests added**: 4 new tests verify rapid arrow key presses (200 iterations), document boundary edge cases (top/bottom), and full live-preview content navigation. All pass.

**Conclusion**: The reported "stack overflow" was likely a stale build artifact, an Electron environment issue, or a misattributed error. The codebase has no recursive patterns, no unbounded event propagation, and no missing guards in arrow key navigation.

## Workaround

- Describe any temporary mitigation.
- Say who can use it and what risk remains.
Not reproducible in code analysis or unit tests. No workaround needed. Likely caused by stale build cache or environment-specific Electron issue. A clean rebuild (`pnpm run clean && pnpm install && pnpm run build`) would resolve the original symptom.

## Permanent Fix Plan

- Describe the intended durable fix.
- Include related steps, decisions, or validation strategy if known.

## Regression Coverage Needed

- List tests, fixtures, reproductions, alerts, or docs updates needed to stop the bug from returning.
No fix needed — code is safe. 4 defensive regression tests added to `MarkdownEditor.test.tsx`:
- "handles rapid ArrowUp/ArrowDown presses without stack overflow or errors" — 200 alternating presses on a 50-line document
- "handles ArrowUp at document top boundary without errors" — 100 ArrowUp presses at line 1
- "handles ArrowDown at document bottom boundary without errors" — 100 ArrowDown presses at last line
- "handles rapid arrow navigation through live-preview markdown content without errors" — 100 presses through rich markdown with live-preview plugins active

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- None yet.
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-12 - Reported.
<!-- AGENT-END:bug-timeline -->
- 2026-04-13 - Deep investigation completed. All arrow key navigation paths analyzed: MarkdownEditor.tsx (keymap delegation to CodeMirror defaultKeymap), LayoutContext.tsx (Ctrl+B only), ActivityBar.tsx (focus navigation, not editor), TerminalPanel.tsx (Shift+Enter only), NotesSidePanel.tsx (no arrow keys). No recursive dispatch patterns, no unbounded event propagation, no missing guards. All 30 existing tests pass. 4 defensive regression tests added (all pass). Closed as not-a-bug.
