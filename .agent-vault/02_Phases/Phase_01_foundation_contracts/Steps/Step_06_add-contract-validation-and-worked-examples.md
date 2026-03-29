---
note_type: step
template_version: 2
contract_version: 1
title: Add Contract Validation And Worked Examples
step_id: STEP-01-06
phase: '[[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-01-03
  - STEP-01-04
  - STEP-01-05
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 06 - Add Contract Validation And Worked Examples

Add a repeatable validation path and worked examples so Phase 01 ends with executable contract checks instead of prose only.

## Purpose

- Create the minimal repeatable verification path for the Phase 01 contracts.
- Ensure the example entity, skill, connector, and executor artifacts validate together.

## Why This Step Exists

- Without a validation path, Phase 01 would end as narrative documentation with no way to catch drift or impossible examples.
- This step proves the contracts compose before any runtime or connector implementation work starts.

## Prerequisites

- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_03_define-skill-manifest-contract|STEP-01-03 Define Skill Manifest Contract]].
- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_04_define-connector-capability-contract|STEP-01-04 Define Connector Capability Contract]].
- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_05_define-executor-and-run-contracts|STEP-01-05 Define Executor And Run Contracts]].
- Review the layout and tooling choices recorded in Step 01.

## Relevant Code Paths

- The validation or tooling location frozen in Step 01.
- The example skill and connector paths defined in Steps 03 and 04.
- The shared contract files created in Steps 02-05.

## Required Reading

- [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_03_define-skill-manifest-contract|STEP-01-03 Define Skill Manifest Contract]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_04_define-connector-capability-contract|STEP-01-04 Define Connector Capability Contract]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_05_define-executor-and-run-contracts|STEP-01-05 Define Executor And Run Contracts]]
- [[01_Architecture/Code_Map|Code Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Implement the lightest repeatable validation path chosen earlier in the phase so contract checks can run locally and deterministically.
2. Validate the example canonical entities, sample skill manifest, sample connector manifest, and executor/run artifacts together.
3. Add fixture data or worked examples wherever a contract would otherwise remain ambiguous.
4. Keep the validation surface repo-local and fast; Phase 01 should not require live connectors, network calls, or a running desktop app.
5. Document the exact command or manual check sequence that proves the contracts compose.
6. If any example forces a contract change, update the owning step notes and phase acceptance criteria instead of patching around the mismatch.
7. Update notes with the final verification command, fixture paths, and any follow-up work that Phase 02 inherits.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Web pressure-testing suggests contracts should be machine-validated rather than left as prose; worked examples are the fastest way to expose drift.
- This step should stay repo-local and deterministic so later contributors can run it before touching Phase 02.
### Refinement (readiness checklist pass)

**Exact outcome**: A validation script at `packages/contracts/scripts/validate.ts` that:
1. Imports all Zod schemas from Steps 02-05.
2. Loads all fixture YAML/JSON files from `examples/skills/` and `examples/connectors/`.
3. Parses each fixture through its corresponding schema.
4. Validates cross-references: skill `requiredCapabilities` are satisfied by at least one connector's declared capabilities.
5. Exits 0 on success, non-zero with specific error messages on failure.

Plus a package.json script: `pnpm run validate` in the contracts package.

**Key decisions to apply**:
- DEC-0002: Validation uses Zod `.parse()` / `.safeParse()`. No additional validation library needed.
- DEC-0005: Script runs via `pnpm run validate`.

**Validation tool is now decided**: Zod itself. The earlier ambiguity about "which validation tooling" is resolved. No ajv, no custom validator — Zod schemas parse fixtures directly.

**Constraints**:
- No network calls. All validation is local against fixture data.
- Script must run in < 5 seconds.
- Script must produce human-readable output (not just exit codes).

**Validation** (meta-validation):
- Running `pnpm run validate` from `packages/contracts/` reports all fixture parse results.
- Introducing a deliberate schema violation in a fixture causes the script to fail with a clear error.
- `pnpm -r run typecheck` still passes.

**Integration touchpoints**:
- This validation script becomes the baseline for PHASE-02's CI pipeline.
- PHASE-04 connector implementations must pass the same validation with their real manifests.

**Junior-readiness verdict**: PASS. Validation tool is locked (Zod), script location is explicit, run command is defined, and the expected behavior on success/failure is documented.

## Human Notes

- Integrity risk: if validation depends on live connectors or manual interpretation, the contract surface will rot before runtime work begins.
- Prefer one small repeatable command over a broad test suite at this stage.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means there is one repeatable check path that validates the Phase 01 contracts and the worked examples together.
- Validation target: a future engineer can run the documented check locally and see contract failures before starting Phase 02 implementation.
