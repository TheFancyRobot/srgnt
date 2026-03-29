---
note_type: step
template_version: 2
contract_version: 1
title: Define Today Workflow Inputs Outputs And Acceptance Slice
step_id: STEP-05-01
phase: '[[02_Phases/Phase_05_flagship_workflow/Phase|Phase 05 flagship workflow]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-04-05
related_sessions:
  - '[[05_Sessions/2026-03-22-071535-define-today-workflow-inputs-outputs-and-acceptance-slice-opencode|SESSION-2026-03-22-071535 opencode session for Define Today Workflow Inputs Outputs And Acceptance Slice]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Define Today Workflow Inputs Outputs And Acceptance Slice

Freeze the exact end-to-end slice the flagship workflow must prove.

## Purpose

- Define what data enters the Today workflow, what artifacts and UI state it must emit, and how success is judged.
- Prevent the flagship phase from drifting into a vague UX polish effort.

## Why This Step Exists

- The daily command center spans multiple product surfaces and could easily sprawl.
- Later artifact and Calendar work should be measured against one shared acceptance slice.

## Prerequisites

- Complete [[02_Phases/Phase_04_first_integrations/Phase|PHASE-04 First Integrations]].

## Relevant Code Paths

- `packages/desktop/renderer/`
- `packages/runtime/`
- connector packages from Phase 04
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`

## Required Reading

- [[02_Phases/Phase_05_flagship_workflow/Phase|Phase 05 flagship workflow]]
- [[02_Phases/Phase_00_product_framing_lock/Steps/Step_02_lock-v1-wedge-users-and-success-criteria|STEP-00-02 Lock V1 Wedge Users And Success Criteria]]
- [[02_Phases/Phase_04_first_integrations/Steps/Step_05_add-connector-status-and-freshness-ui|STEP-04-05 Add Connector Status And Freshness UI]]
- [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003 Teams first, Slack second for messaging connector]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Turn the framework's daily command-center wedge into a precise workflow contract for Today.
2. Produce a Zod schema in `packages/contracts/` that defines the Today workflow's inputs (per-connector canonical entities) and outputs (briefing artifact shape, surface contracts). This schema is the machine-readable contract — the prose document is supplementary.
3. List the inputs from each first connector, the generated outputs, and the UI surfaces that must be involved.
4. Keep the acceptance slice thin enough to validate in one manual walkthrough.
5. Validate by checking that Steps 02-04 can all derive their scope directly from this definition and the Zod contract.
6. Update notes with the frozen slice, the Zod schema location, and any field or artifact still blocked on runtime work.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- The workflow should remain useful without Fred and without sync.
### Refinement (readiness checklist pass)

**Exact outcome:**
- A frozen `Today Workflow Acceptance Slice` note at `.agent-vault/06_Shared_Knowledge/today_workflow_acceptance_slice.md` defining:
  - **Inputs**: exactly which canonical entities from each connector feed into Today (Jira tasks → priority/blocker list; Outlook Calendar events → today's schedule + meeting prep; Teams messages → mentions/threads needing attention)
  - **Outputs**: the generated daily briefing artifact shape, the Today View surface contract, the Calendar View surface contract, and the base output path convention `Daily/YYYY-MM-DD.md` for the generated daily briefing artifact
  - **Acceptance criteria**: one manual walkthrough script that exercises the full slice (fixture data in → surfaces rendered → briefing artifact generated)
- Updated Zod schemas in `packages/contracts/` if the acceptance slice reveals missing fields
- A workflow contract type in `packages/contracts/src/workflows/today.ts` defining the Today workflow's inputs and outputs programmatically

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod): Workflow contract (inputs/outputs) must be a Zod schema, not prose-only
- DEC-0007 (Dataview/markdown local data): All workflow outputs land as local markdown-compatible artifacts

**Dependency resolution:** The `depends_on` frontmatter now points to `STEP-04-05`, which is the Phase 04 checkpoint that proves all three connectors and the connector-status model exist before this workflow slice is frozen.

**CRITICAL — Fred clarification:** The existing Implementation Note says "The workflow should remain useful without Fred and without sync." This is correct and must be enforced. "Fred" is the premium AI orchestration layer (see product framing). ALL PHASE-05 functionality must work fully WITHOUT Fred. Fred is additive — it may enhance briefing quality later, but the base daily command center must produce useful output from rule-based aggregation of connector data alone. No step in PHASE-05 should introduce a Fred dependency.

**Starting files (must exist before this step runs):**
- All PHASE-04 outputs: connector SDK, all three connectors (Jira, Outlook, Teams), connector status UI
- Canonical entity Zod schemas from PHASE-01 (tasks, events, messages)
- Runtime foundation from PHASE-03
- Desktop shell from PHASE-02

**Constraints:**
- Do NOT design for Fred-dependent features — the acceptance slice must pass with zero AI calls
- Do NOT include sync/cloud features — local-only operation
- Do NOT expand scope beyond what the wedge requires — if a surface is not needed to prove the daily command center, exclude it
- Keep the acceptance slice thin enough for one manual walkthrough (per Human Notes)

**Validation:**
A junior dev verifies completeness by:
1. Reading the acceptance slice document and confirming it names specific inputs from each connector (not generic placeholders)
2. Checking that a Zod schema exists at `packages/contracts/src/workflows/today.ts` for the Today workflow contract (inputs + outputs)
3. Verifying the acceptance criteria include a concrete manual walkthrough script with fixture data
4. Confirming the document explicitly states "works without Fred" and "works without sync"
5. Tracing each output surface back to specific connector inputs — no dangling references

**Junior-readiness verdict:** PASS — the dependency metadata, required reading, output note path, and machine-readable workflow contract path are now explicit. A junior developer can start from the wedge definition, the settled connector set, and the workflow contract file without guessing.

## Human Notes

- If a surface is not needed to prove the wedge, keep it out of this step.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-071535-define-today-workflow-inputs-outputs-and-acceptance-slice-opencode|SESSION-2026-03-22-071535 opencode session for Define Today Workflow Inputs Outputs And Acceptance Slice]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the flagship phase has one concrete slice to implement and validate.
- Validation target: Steps 02-04 map cleanly to this acceptance slice.
