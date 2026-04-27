---
note_type: step
template_version: 2
contract_version: 1
title: Freeze Repo Layout And Contract Locations
step_id: STEP-01-01
phase: '[[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - PHASE-00
related_sessions:
  - '[[05_Sessions/2026-03-21-044133-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-21-044133 OpenCode session for Freeze Repo Layout And Contract Locations]]'
  - '[[05_Sessions/2026-03-21-045659-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-21-045659 OpenCode session for Freeze Repo Layout And Contract Locations]]'
  - '[[05_Sessions/2026-03-22-031913-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-22-031913 opencode session for Freeze Repo Layout And Contract Locations]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Freeze Repo Layout And Contract Locations

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Establish the repo/package layout that downstream Phase 01 work will use without guessing.
- Document the canonical homes for contract files, worked examples, and later desktop/runtime packages.

## Required Reading

- [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Code_Map|Code Map]]

## Companion Notes

- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_01_freeze-repo-layout-and-contract-locations/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_01_freeze-repo-layout-and-contract-locations/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_01_freeze-repo-layout-and-contract-locations/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_01_freeze-repo-layout-and-contract-locations/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Integrity risk: if this step chooses provider- or UI-specific directories too early, later contract work will inherit the wrong boundary.
- Prefer a small shared contracts surface plus examples over a wide skeleton of empty packages.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-21 - [[05_Sessions/2026-03-21-044133-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-21-044133 OpenCode session for Freeze Repo Layout And Contract Locations]] - Planning session created.
- 2026-03-21 - [[05_Sessions/2026-03-21-045659-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-21-045659 OpenCode session for Freeze Repo Layout And Contract Locations]] - Session created.
- 2026-03-22 - [[05_Sessions/2026-03-22-031913-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-22-031913 opencode session for Freeze Repo Layout And Contract Locations]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
