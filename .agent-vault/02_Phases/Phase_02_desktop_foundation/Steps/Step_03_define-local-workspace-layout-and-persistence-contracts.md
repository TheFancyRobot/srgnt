---
note_type: step
template_version: 2
contract_version: 1
title: Define Local Workspace Layout And Persistence Contracts
step_id: STEP-02-03
phase: '[[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-26'
depends_on:
  - STEP-02-01
related_sessions:
  - '[[05_Sessions/2026-03-22-175617-define-local-workspace-layout-and-persistence-contracts-opencode|SESSION-2026-03-22-175617 opencode session for Define Local Workspace Layout And Persistence Contracts]]'
  - '[[05_Sessions/2026-03-26-232438-define-local-workspace-layout-and-persistence-contracts|SESSION-2026-03-26-232438 Session for Define Local Workspace Layout And Persistence Contracts]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Define Local Workspace Layout And Persistence Contracts

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Decide what lives in files, what lives in the derived local metadata/index layer, and how the workspace is bootstrapped on disk.
- Give later runtime, sync, and workflow phases a stable local storage model.

## Required Reading

- [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Companion Notes

- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-26
- Next action: None - implementation complete, Phase 02 closed.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Keep the file layout inspectable; avoid hiding durable user data behind opaque local stores.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-175617-define-local-workspace-layout-and-persistence-contracts-opencode|SESSION-2026-03-22-175617 opencode session for Define Local Workspace Layout And Persistence Contracts]] - Session created.
- 2026-03-26 - [[05_Sessions/2026-03-26-232438-define-local-workspace-layout-and-persistence-contracts|SESSION-2026-03-26-232438 Session for Define Local Workspace Layout And Persistence Contracts]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
