---
note_type: step
template_version: 2
contract_version: 1
title: Implement main-process notes service and scoped filesystem handlers
step_id: STEP-14-02
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: completed
owner: ''
created: '2026-03-31'
updated: '2026-03-31'
depends_on:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_01_add-ipc-channels-and-main-process-handlers-for-notes-file-operations|STEP-14-01]]'
related_sessions:
  - '[[05_Sessions/2026-03-31-044642-implement-main-process-notes-service-and-scoped-filesystem-handlers-opencode|SESSION-2026-03-31-044642 OpenCode session for Implement main-process notes service and scoped filesystem handlers]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement main-process notes service and scoped filesystem handlers

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Create notes file service with path-scoped operations.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

## Required Reading

- [[01_Architecture/System_Overview|System Overview]] - Desktop app architecture
- `packages/desktop/src/main/settings.ts` - Path handling patterns and workspace layout
- `packages/desktop/src/main/index.ts` - Where current IPC handlers are registered (all inline, ~689 lines)
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008]] - Atomic write pattern: write-to-temp, fsync, rename-into-place

## Companion Notes

- [[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-31
- Next action: Start STEP-14-02.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-31 - [[05_Sessions/2026-03-31-044642-implement-main-process-notes-service-and-scoped-filesystem-handlers-opencode|SESSION-2026-03-31-044642 OpenCode session for Implement main-process notes service and scoped filesystem handlers]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
