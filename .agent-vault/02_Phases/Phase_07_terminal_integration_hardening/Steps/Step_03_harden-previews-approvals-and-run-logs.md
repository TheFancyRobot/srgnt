---
note_type: step
template_version: 2
contract_version: 1
title: Harden Previews Approvals And Run Logs
step_id: STEP-07-03
phase: '[[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]'
status: complete
owner: ''
created: '2026-03-21'
updated: '2026-03-29'
depends_on:
  - STEP-07-01
  - STEP-07-02
related_sessions:
  - '[[05_Sessions/2026-03-29-053301-harden-previews-approvals-and-run-logs-opencode|SESSION-2026-03-29-053301 opencode session for Harden Previews Approvals And Run Logs]]'
  - '[[05_Sessions/2026-03-29-132728-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-132728 Session for Harden Previews Approvals And Run Logs]]'
  - '[[05_Sessions/2026-03-29-134622-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-134622 Session for Harden Previews Approvals And Run Logs]]'
  - '[[05_Sessions/2026-03-29-142825-harden-previews-approvals-and-run-logs-opencode|SESSION-2026-03-29-142825 opencode session for Harden Previews Approvals And Run Logs]]'
  - '[[05_Sessions/2026-03-29-150444-harden-previews-approvals-and-run-logs-opencode|SESSION-2026-03-29-150444 OpenCode session for Harden Previews Approvals And Run Logs]]'
  - '[[05_Sessions/2026-03-29-154243-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-154243 Session for Harden Previews Approvals And Run Logs]]'
  - '[[05_Sessions/2026-03-29-155208-harden-previews-approvals-and-run-logs-opencode|SESSION-2026-03-29-155208 opencode session for Harden Previews Approvals And Run Logs]]'
  - '[[05_Sessions/2026-03-29-183813-harden-previews-approvals-and-run-logs-opencode|SESSION-2026-03-29-183813 OpenCode session for Harden Previews Approvals And Run Logs]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Harden Previews Approvals And Run Logs

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Make previews, approval gates, and run logs explicit for terminal-triggered operations.
- Preserve auditability without over-logging sensitive content.

## Required Reading

- [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Companion Notes

- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner: —
- Last touched: 2026-03-29
- Next action: None — step complete
- Completed: approval gate in main/index.ts, ApprovalPreview component in TerminalPanel.tsx, approval IPC events, run log persistence to .command-center/runs/ as markdown, runLogSave IPC channel and schema, approval path schema tests, security hardening (CSP, IPC validation, navigation blocking, Electron upgrade)
- Remaining: none
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Prefer explicit denied or approval-pending states over ambiguous silent behavior.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-29 - [[05_Sessions/2026-03-29-053301-harden-previews-approvals-and-run-logs-opencode|SESSION-2026-03-29-053301 opencode session for Harden Previews Approvals And Run Logs]] - Fixed main/index.ts, added approval flow, added ApprovalPreview component
- 2026-03-29 - [[05_Sessions/2026-03-29-132728-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-132728]] - Added run log persistence, IPC channel, schema tests, approval path tests
- 2026-03-29 - [[05_Sessions/2026-03-29-134622-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-134622 Session for Harden Previews Approvals And Run Logs]] - Session created.
- 2026-03-29 - [[05_Sessions/2026-03-29-142825-harden-previews-approvals-and-run-logs-opencode|SESSION-2026-03-29-142825 opencode session for Harden Previews Approvals And Run Logs]] - Session created.
- 2026-03-29 - [[05_Sessions/2026-03-29-150444-harden-previews-approvals-and-run-logs-opencode|SESSION-2026-03-29-150444 OpenCode session for Harden Previews Approvals And Run Logs]] - Session created.
- 2026-03-29 - [[05_Sessions/2026-03-29-154243-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-154243 Session for Harden Previews Approvals And Run Logs]] - Session created.
- 2026-03-29 - [[05_Sessions/2026-03-29-155208-harden-previews-approvals-and-run-logs-opencode|SESSION-2026-03-29-155208 opencode session for Harden Previews Approvals And Run Logs]] - Session created.
- 2026-03-29 - [[05_Sessions/2026-03-29-183813-harden-previews-approvals-and-run-logs-opencode|SESSION-2026-03-29-183813 OpenCode session for Harden Previews Approvals And Run Logs]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
