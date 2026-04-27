# Implementation Notes

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

## Related Notes

- Step: [[02_Phases/Phase_05_flagship_workflow/Steps/Step_01_define-today-workflow-inputs-outputs-and-acceptance-slice|STEP-05-01 Define Today Workflow Inputs Outputs And Acceptance Slice]]
- Phase: [[02_Phases/Phase_05_flagship_workflow/Phase|Phase 05 flagship workflow]]
