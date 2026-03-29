---
note_type: step
template_version: 2
contract_version: 1
title: Compose End To End Command Center Workflow
step_id: STEP-05-04
phase: '[[02_Phases/Phase_05_flagship_workflow/Phase|Phase 05 flagship workflow]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-27'
depends_on:
  - STEP-05-02
  - STEP-05-03
related_sessions:
  - '[[05_Sessions/2026-03-27-002722-compose-end-to-end-command-center-workflow|SESSION-2026-03-27-002722 Session for Phase 05 Close-Out and Phase 07 Advance]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Compose End To End Command Center Workflow

Integrate the flagship workflow into one testable user path.

## Purpose

- Prove the base product can move from connector data to Today/Calendar surfaces to a durable daily artifact.
- Provide the manual validation path that justifies later hardening and premium prep.

## Why This Step Exists

- Earlier steps can still pass independently while the actual user journey remains broken.
- This is the first phase where the product should feel meaningfully useful end-to-end.

## Prerequisites

- Complete [[02_Phases/Phase_05_flagship_workflow/Steps/Step_02_implement-daily-briefing-artifact-pipeline|STEP-05-02 Implement Daily Briefing Artifact Pipeline]].
- Complete [[02_Phases/Phase_05_flagship_workflow/Steps/Step_03_build-calendar-detail-and-triage-surfaces|STEP-05-03 Build Calendar Detail And Triage Surfaces]].

## Relevant Code Paths

- `packages/desktop/renderer/`
- `packages/desktop/preload/`
- `packages/runtime/`
- all first-connector packages

## Required Reading

- [[02_Phases/Phase_05_flagship_workflow/Phase|Phase 05 flagship workflow]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Wire the workflow so a user can move from normalized inputs to Today, Calendar, and the generated daily briefing artifact.
2. Exercise the wedge with fixture-backed data and document the manual walkthrough.
3. Capture any broken assumption spanning connectors, runtime, UI, or artifact generation as a bug or decision rather than burying it in session logs.
4. Validate with one repeatable end-to-end walkthrough and the most targeted automated checks available.
5. Update notes with the exact walkthrough, known gaps, and the reasons the slice is or is not ready for Phase 07.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-27
- Next action: None - E2E walkthrough documented at fixture level. IPC channels wired for canonical integration.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- This step is the first strong signal of whether the product is useful without Fred.
### Refinement (readiness checklist pass)

**Exact outcome:**
- A wired end-to-end user path: app launch → connector data loads (fixture-backed) → Today View renders (priorities, schedule, attention items) → user navigates to Calendar detail → user views/triages an event → daily briefing artifact is generated and persisted
- Documented manual walkthrough script (markdown file in project docs) with exact steps, expected states at each point, and pass/fail criteria
- Integration test or E2E test (if Electron testing infrastructure from PHASE-02 supports it) exercising the full path with fixture data
- A "known gaps" section documenting any broken transitions, missing data, or UX friction discovered during the walkthrough
- Bug notes created for any issues discovered (not buried in session logs, per execution prompt)

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod): All data flowing through the workflow is Zod-validated at boundaries
- DEC-0004 (macOS + Windows + Linux): E2E walkthrough must pass on at least one platform, with known issues documented for others
- DEC-0007 (Dataview/markdown local data): Generated briefing artifact is a queryable markdown file

**CRITICAL — Fred clarification:** This step is explicitly described as "the first strong signal of whether the product is useful without Fred" (per existing Implementation Note). This is correct. The E2E walkthrough must demonstrate a useful daily command center experience with ZERO AI/Fred involvement. If the workflow feels empty or useless without Fred, that is a product design bug to be filed, not a reason to add Fred.

**Starting files (must exist before this step runs):**
- Daily briefing pipeline from STEP-05-02
- Calendar detail and triage surfaces from STEP-05-03
- Today workflow acceptance slice from STEP-05-01 (the walkthrough validates against this slice)
- All PHASE-04 connector outputs and connector status UI

**Constraints:**
- Do NOT add Fred/AI features to make the walkthrough "feel complete" — the base product must stand on its own
- Do NOT skip documenting gaps — if something is broken or awkward, file a bug note rather than glossing over it
- Do NOT expand scope beyond the acceptance slice from STEP-05-01
- Do NOT claim the step is done because individual parts work — the integration between parts is the deliverable

**Validation:**
A junior dev verifies completeness by:
1. Following the documented walkthrough script step-by-step on a clean dev build with fixture data
2. Confirming each step in the walkthrough produces the expected state (Today View populated, Calendar navigable, briefing generated)
3. Checking that the generated briefing artifact exists on disk, is valid markdown, and contains data from all three connectors
4. Reviewing the "known gaps" section — it should exist and be honest (an empty known-gaps section is suspicious)
5. Checking that any bugs found during the walkthrough have corresponding bug notes in `.agent-vault/03_Bugs/`
6. Confirming zero Fred/AI imports anywhere in the workflow path

**BLOCKER — STEP-02-03 dependency gap:** The E2E walkthrough expects "the generated briefing artifact exists on disk, is valid markdown, and contains data from all three connectors." This requires both STEP-05-02 (briefing pipeline) and the workspace bootstrap from STEP-02-03 to persist artifacts. If STEP-02-03 is not complete, validation item (3) must be scoped down: verify the briefing artifact is valid markdown with correct Zod structure, but acknowledge it exists only in-memory rather than on disk. Flag this as a known gap in the "known gaps" section.

**Junior-readiness verdict:** PASS — This is an integration/validation step, not a feature-building step. The main risk is declaring victory prematurely when parts work individually but the flow is broken. The explicit requirement for a documented walkthrough and known-gaps section mitigates this. A junior dev can execute this with clear fixture data and the acceptance slice from STEP-05-01.

## Human Notes

- If the workflow is awkward or brittle, record that explicitly instead of calling the slice done because the parts exist.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-27 - [[05_Sessions/2026-03-27-002722-compose-end-to-end-command-center-workflow|SESSION-2026-03-27-002722 Session for Compose End To End Command Center Workflow]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means a repeatable flagship workflow walkthrough exists and works on fixture-backed inputs.
- Validation target: one end-to-end manual flow plus targeted automated checks.
