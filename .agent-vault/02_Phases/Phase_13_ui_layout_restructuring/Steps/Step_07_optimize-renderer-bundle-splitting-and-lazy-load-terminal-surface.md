---
note_type: step
template_version: 2
contract_version: 1
title: Optimize renderer bundle splitting and lazy-load terminal surface
step_id: STEP-13-07
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: complete
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on:
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility|STEP-13-06]]'
related_sessions:
  - '[[05_Sessions/2026-03-30-203238-optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface-opencode|SESSION-2026-03-30-203238 OpenCode session for Optimize renderer bundle splitting and lazy-load terminal surface]]'
related_bugs: []
tags:
  - agent-vault
  - step
completed_at: '2026-03-30'
---

# Step 07 - Optimize renderer bundle splitting and lazy-load terminal surface

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Reduce the renderer's initial JavaScript cost by splitting large chunks and lazy-loading the terminal surface so Phase 13's three-panel shell keeps its correctness gains without carrying unnecessary startup weight.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

## Required Reading

- [[02_Phases/Phase_13_ui_layout_restructuring/Phase|PHASE-13 UI Layout Restructuring]]
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility|STEP-13-06 Update tests and verify accessibility]]
- [[05_Sessions/2026-03-30-193848-update-tests-and-verify-accessibility-opencode|SESSION-2026-03-30-193848 OpenCode session for Update tests and verify accessibility]]
- [[01_Architecture/System_Overview|System Overview]]
- [[04_Decisions/DEC-0009_freeze-renderer-stack-and-routing-contract-for-desktop-v1|DEC-0009 Renderer stack and routing contract]]

## Companion Notes

- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner: OpenCode
- Last touched: 2026-03-30
- Next action: None. STEP-13-07 is complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Reopening the phase is intentional: the shipped layout behavior is complete, but the audit identified bundle health as unfinished follow-up work that still belongs to Phase 13's shell quality bar.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-30 - [[05_Sessions/2026-03-30-203238-optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface-opencode|SESSION-2026-03-30-203238 OpenCode session for Optimize renderer bundle splitting and lazy-load terminal surface]] - Session created, scope documented, and phase reopened to track the follow-up honestly.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
