# Execution Brief

## Step Overview

Add a repeatable validation path and worked examples so Phase 01 ends with executable contract checks instead of prose only.

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

## Execution Prompt

1. Implement the lightest repeatable validation path chosen earlier in the phase so contract checks can run locally and deterministically.
2. Validate the example canonical entities, sample skill manifest, sample connector manifest, and executor/run artifacts together.
3. Add fixture data or worked examples wherever a contract would otherwise remain ambiguous.
4. Keep the validation surface repo-local and fast; Phase 01 should not require live connectors, network calls, or a running desktop app.
5. Document the exact command or manual check sequence that proves the contracts compose.
6. If any example forces a contract change, update the owning step notes and phase acceptance criteria instead of patching around the mismatch.
7. Update notes with the final verification command, fixture paths, and any follow-up work that Phase 02 inherits.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_06_add-contract-validation-and-worked-examples|STEP-01-06 Add Contract Validation And Worked Examples]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
