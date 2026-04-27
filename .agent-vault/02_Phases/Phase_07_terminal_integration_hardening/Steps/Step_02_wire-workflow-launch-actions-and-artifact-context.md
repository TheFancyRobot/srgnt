---
note_type: step
template_version: 2
contract_version: 1
title: Wire Workflow Launch Actions And Artifact Context
step_id: STEP-07-02
phase: '[[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]'
status: complete
owner: ''
created: '2026-03-21'
updated: '2026-03-29'
depends_on:
  - STEP-07-01
related_sessions:
  - '[[05_Sessions/2026-03-28-190743-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-190743 opencode session for Wire Workflow Launch Actions And Artifact Context]]'
  - '[[05_Sessions/2026-03-28-192743-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-192743 opencode session for Wire Workflow Launch Actions And Artifact Context]]'
  - '[[05_Sessions/2026-03-28-194526-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-194526 opencode session for Wire Workflow Launch Actions And Artifact Context]]'
  - '[[05_Sessions/2026-03-28-200819-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-200819 opencode session for Wire Workflow Launch Actions And Artifact Context]]'
  - '[[05_Sessions/2026-03-28-202447-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-202447 opencode session for Wire Workflow Launch Actions And Artifact Context]]'
  - '[[05_Sessions/2026-03-28-204638-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-204638 opencode session for Wire Workflow Launch Actions And Artifact Context]]'
  - '[[05_Sessions/2026-03-29-042830-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-29-042830 OpenCode session for Wire Workflow Launch Actions And Artifact Context]]'
related_bugs:
  - '[[03_Bugs/BUG-0002_today-view-launch-flow-fails-in-live-desktop-app|BUG-0002 Today View launch flow fails in live desktop app]]'
tags:
  - agent-vault
  - step
---

# Step 02 - Wire Workflow Launch Actions And Artifact Context

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Let users launch terminal or agent sessions from product workflows without losing artifact and run context.
- Ensure terminal sessions participate in the same runtime model as skills and artifacts.

## Required Reading

- [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
- [[02_Phases/Phase_05_flagship_workflow/Phase|PHASE-05 Flagship Workflow]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Companion Notes

- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner: —
- Last touched: 2026-03-29
- Next action: None — step complete
- Summary: Today View Jira items hand off a LaunchContext into the terminal view, IPC payload validated against contract, sandbox-safe preload bridge works in live Electron app, terminal surface shows launch context with intent-based routing. Calendar/briefing entry points deferred to future phases as non-blocking.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If launch context cannot be expressed cleanly, fix the runtime contract before adding more UI shortcuts.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-28 - [[05_Sessions/2026-03-28-190743-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-190743 opencode session for Wire Workflow Launch Actions And Artifact Context]] - Session created.
- 2026-03-28 - [[05_Sessions/2026-03-28-192743-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-192743 opencode session for Wire Workflow Launch Actions And Artifact Context]] - Session created.
- 2026-03-28 - [[05_Sessions/2026-03-28-194526-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-194526 opencode session for Wire Workflow Launch Actions And Artifact Context]] - Session created.
- 2026-03-28 - [[05_Sessions/2026-03-28-200819-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-200819 opencode session for Wire Workflow Launch Actions And Artifact Context]] - Session created.
- 2026-03-28 - [[05_Sessions/2026-03-28-202447-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-202447 opencode session for Wire Workflow Launch Actions And Artifact Context]] - Session created.
- 2026-03-28 - [[05_Sessions/2026-03-28-204638-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-204638 opencode session for Wire Workflow Launch Actions And Artifact Context]] - Session created.
- 2026-03-29 - [[05_Sessions/2026-03-29-042830-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-29-042830 OpenCode session for Wire Workflow Launch Actions And Artifact Context]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
