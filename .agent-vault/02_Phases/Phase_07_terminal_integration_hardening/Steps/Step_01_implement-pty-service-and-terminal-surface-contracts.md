---
note_type: step
template_version: 2
contract_version: 1
title: Implement PTY Service And Terminal Surface Contracts
step_id: STEP-07-01
phase: '[[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-29'
depends_on:
  - PHASE-02
  - PHASE-05
related_sessions:
  - '[[05_Sessions/2026-03-27-233525-implement-pty-service-and-terminal-surface-contracts-opencode-claude-opus|SESSION-2026-03-27-233525 opencode-claude-opus session for Implement PTY Service And Terminal Surface Contracts]]'
  - '[[05_Sessions/2026-03-29-190942-implement-pty-service-and-terminal-surface-contracts-gpt-5-4|SESSION-2026-03-29-190942 gpt-5.4 session for Implement PTY Service And Terminal Surface Contracts]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Implement PTY Service And Terminal Surface Contracts

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Host PTY-backed sessions through the privileged boundary and expose only explicit terminal capabilities to the renderer.
- Give the product a real embedded terminal surface without collapsing security boundaries.

## Required Reading

- [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_02_implement-electron-shell-and-preload-boundary|Step 02-02 — Electron Shell and Preload Boundary]]
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_03_implement-artifact-registry-run-history-and-executor-contracts|Step 03-03 — Artifact Registry and Executor Contracts]]
- [[02_Phases/Phase_04_first_integrations/Steps/Step_05_add-connector-status-and-freshness-ui|Step 04-05 — Connector Status and Freshness UI]]
- [[02_Phases/Phase_05_flagship_workflow/Steps/Step_04_compose-end-to-end-command-center-workflow|Step 05-04 — End-to-End Command Center Workflow]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Companion Notes

- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_01_implement-pty-service-and-terminal-surface-contracts/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_01_implement-pty-service-and-terminal-surface-contracts/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_01_implement-pty-service-and-terminal-surface-contracts/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_01_implement-pty-service-and-terminal-surface-contracts/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: opencode
- Last touched: 2026-03-28
- Next action: None — step complete. Proceed to STEP-07-02.
- Summary: PTY service (node-pty), session manager, Effect Schema-validated IPC contracts, preload API, ghostty-web terminal renderer, and terminal cleanup/default-shell fixes are in place. Desktop tests and build are green.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Treat generic shell execution requests as a security smell unless the capability surface makes them explicit.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-27 - [[05_Sessions/2026-03-27-233525-implement-pty-service-and-terminal-surface-contracts-opencode-claude-opus|SESSION-2026-03-27-233525 opencode-claude-opus session for Implement PTY Service And Terminal Surface Contracts]] - Session created.
- 2026-03-29 - [[05_Sessions/2026-03-29-190942-implement-pty-service-and-terminal-surface-contracts-gpt-5-4|SESSION-2026-03-29-190942 gpt-5.4 session for Implement PTY Service And Terminal Surface Contracts]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
