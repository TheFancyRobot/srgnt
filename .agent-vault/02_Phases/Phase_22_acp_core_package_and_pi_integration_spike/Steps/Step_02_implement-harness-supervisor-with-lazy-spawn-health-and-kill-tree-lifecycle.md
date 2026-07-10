---
note_type: step
template_version: 2
contract_version: 1
title: Implement harness supervisor with lazy spawn health and kill-tree lifecycle
step_id: STEP-22-02
phase: '[[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - STEP-22-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement harness supervisor with lazy spawn health and kill-tree lifecycle

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Implement harness supervisor with lazy spawn health and kill-tree lifecycle.
- Parent phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]].
- Exact outcome: `packages/harness/src/supervisor/` manages agent child processes: explicit state machine (idle → spawning → ready → reaping → dead), lazy spawn on demand, health/exit propagation into the update stream, kill-tree termination (process groups), restart policy, and idle-timeout reaping — so "UI-open ≠ process-running" is a supervisor invariant, not app logic.
- Starting files: `packages/harness/src/supervisor/` (new); the pty service's process-lifecycle handling in `packages/desktop/src/main/pty/` is the prior art for kill-tree/zombie lessons.
- Validate: unit tests against a fake agent binary (Node script): spawn-on-demand, crash propagation, kill-tree leaves no orphans (`ps` assertion in test), idle reap + respawn.

## Why This Step Exists

- Explain why this step matters to the parent phase.
- Call out the risk reduced, capability added, or knowledge gained.

## Prerequisites

- List the notes, approvals, tooling, branch state, or prior steps required before starting.
- Include blocking commands or setup steps if they are easy to forget.

## Relevant Code Paths

- List the most likely files, directories, packages, tests, commands, or docs to inspect.
- Include only the paths that help a new engineer get oriented quickly.

## Required Reading

- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_02_implement-harness-supervisor-with-lazy-spawn-health-and-kill-tree-lifecycle/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_02_implement-harness-supervisor-with-lazy-spawn-health-and-kill-tree-lifecycle/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (supervisor invariants)
- `packages/desktop/src/main/pty/` — prior art for child-process lifecycle and kill-tree handling

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Companion Notes

- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_02_implement-harness-supervisor-with-lazy-spawn-health-and-kill-tree-lifecycle/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_02_implement-harness-supervisor-with-lazy-spawn-health-and-kill-tree-lifecycle/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_02_implement-harness-supervisor-with-lazy-spawn-health-and-kill-tree-lifecycle/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_02_implement-harness-supervisor-with-lazy-spawn-health-and-kill-tree-lifecycle/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_02_implement-harness-supervisor-with-lazy-spawn-health-and-kill-tree-lifecycle/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_02_implement-harness-supervisor-with-lazy-spawn-health-and-kill-tree-lifecycle/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
