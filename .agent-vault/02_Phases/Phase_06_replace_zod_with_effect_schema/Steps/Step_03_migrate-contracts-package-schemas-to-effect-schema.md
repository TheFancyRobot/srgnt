---
note_type: step
template_version: 2
contract_version: 1
title: Migrate contracts package schemas to Effect Schema
step_id: STEP-06-03
phase: '[[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|Phase 06 replace zod with effect schema]]'
status: completed
owner: opencode
created: '2026-03-27'
updated: '2026-03-28'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-03-28-014423-migrate-contracts-package-schemas-to-effect-schema-opencode|SESSION-2026-03-28-014423 opencode session for Migrate contracts package schemas to Effect Schema]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Migrate contracts package schemas to Effect Schema

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Migrate contracts package schemas to Effect Schema.
- Parent phase: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|Phase 06 replace zod with effect schema]].

## Required Reading

- [[01_Architecture/System_Overview|System Overview]]
- Link the minimum notes, docs, source files, or tests that must be read before editing.
- If a reader can skip something safely, do not list it here.

## Companion Notes

- [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_03_migrate-contracts-package-schemas-to-effect-schema/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_03_migrate-contracts-package-schemas-to-effect-schema/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_03_migrate-contracts-package-schemas-to-effect-schema/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_03_migrate-contracts-package-schemas-to-effect-schema/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: opencode
- Last touched: 2026-03-28
- Next action: Proceed to STEP-06-04 (migrate consumer packages and validation callers).
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-28 - [[05_Sessions/2026-03-28-004306-audit-zod-usage-across-codebase|SESSION-2026-03-28-004306]] - Migration in progress (base, task, event migrated).
- 2026-03-28 - [[05_Sessions/2026-03-28-014423-migrate-contracts-package-schemas-to-effect-schema-opencode|SESSION-2026-03-28-014423 opencode session for Migrate contracts package schemas to Effect Schema]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
