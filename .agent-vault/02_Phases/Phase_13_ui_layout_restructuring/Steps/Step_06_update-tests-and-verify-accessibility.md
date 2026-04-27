---
note_type: step
template_version: 2
contract_version: 1
title: Update tests and verify accessibility
step_id: STEP-13-06
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: complete
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on:
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_04_implement-view-specific-side-panel-content|STEP-13-04]]'
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_05_persist-layout-preferences-and-add-collapse-behaviors|STEP-13-05]]'
related_sessions:
  - '[[05_Sessions/2026-03-30-191843-update-tests-and-verify-accessibility-opencode|SESSION-2026-03-30-191843 OpenCode session for Update tests and verify accessibility]]'
  - '[[05_Sessions/2026-03-30-193848-update-tests-and-verify-accessibility-opencode|SESSION-2026-03-30-193848 OpenCode session for Update tests and verify accessibility]]'
related_bugs: []
tags:
  - agent-vault
  - step
completed_at: '2026-03-30'
---

# Step 06 - Update tests and verify accessibility

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: All existing tests pass with the new layout, new tests cover the ActivityBar keyboard navigation and LayoutContext state management, and accessibility is verified for the icon-only navigation pattern.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

## Required Reading

- All existing test files in `packages/desktop/src/renderer/components/` to understand test patterns and what might break
- `packages/desktop/vitest.config.ts` and `packages/desktop/src/test-setup.ts` for test infrastructure setup
- [[01_Architecture/System_Overview|System Overview]] -- understand the desktop test infrastructure and component architecture
- WAI-ARIA Toolbar Pattern keyboard interaction model (for writing keyboard navigation tests)

## Companion Notes

- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner: OpenCode
- Last touched: 2026-03-30
- Next action: Phase complete - all steps done
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- The existing test files use `@testing-library/react` and Vitest with JSDOM. New tests should follow the same patterns.
- For keyboard navigation tests, use `fireEvent.keyDown(element, { key: 'ArrowDown' })` from Testing Library.
- The manual accessibility checklist items that require a screen reader should be documented as "verified" or "not verified (no screen reader available)" -- either is acceptable for this phase. The ARIA attribute tests are the automated verification.
- If any existing E2E tests exist (`test:e2e`), they may also need updates, but focus on unit/component tests first since E2E tests are slower to iterate on.
- Screen reader testing: if no screen reader is available, mark those checklist items as "not verified — no screen reader available" and note that the automated ARIA attribute tests provide baseline coverage.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-30 - [[05_Sessions/2026-03-30-191843-update-tests-and-verify-accessibility-opencode|SESSION-2026-03-30-191843 OpenCode session for Update tests and verify accessibility]] - Step completed.
- 2026-03-30 - [[05_Sessions/2026-03-30-193848-update-tests-and-verify-accessibility-opencode|SESSION-2026-03-30-193848 OpenCode session for Update tests and verify accessibility]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
