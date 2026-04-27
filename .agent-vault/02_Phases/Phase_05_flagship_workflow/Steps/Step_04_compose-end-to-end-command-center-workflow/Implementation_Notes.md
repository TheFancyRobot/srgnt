# Implementation Notes

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

## Related Notes

- Step: [[02_Phases/Phase_05_flagship_workflow/Steps/Step_04_compose-end-to-end-command-center-workflow|STEP-05-04 Compose End To End Command Center Workflow]]
- Phase: [[02_Phases/Phase_05_flagship_workflow/Phase|Phase 05 flagship workflow]]
