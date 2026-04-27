# Execution Brief

## Step Overview

Create the runtime records that connect skill execution, artifacts, and pluggable executors.

## Why This Step Exists

- The framework treats artifacts, runs, and executor abstraction as core runtime concepts.
- Later workflow, terminal, and premium phases all depend on these records existing locally.

## Prerequisites

- Complete [[02_Phases/Phase_03_runtime_foundation/Steps/Step_01_implement-canonical-store-and-manifest-loaders|STEP-03-01 Implement Canonical Store And Manifest Loaders]].
- Complete [[02_Phases/Phase_03_runtime_foundation/Steps/Step_02_implement-capability-policy-and-approval-model|STEP-03-02 Implement Capability Policy And Approval Model]].

## Relevant Code Paths

- `packages/runtime/`
- `packages/executors/`
- `packages/contracts/`
- workspace paths for artifacts and logs defined in Step 02-03

## Execution Prompt

1. Implement artifact metadata, run records, and executor request/result handling as shared runtime modules.
2. Keep artifact identity separate from any one file path so generated outputs remain first-class objects.
3. Ensure run history captures status, approvals, and enough context for later UI and audit surfaces.
4. Add tests or fixtures that prove one example skill run creates expected run and artifact records.
5. Validate with targeted runtime tests plus one end-to-end fixture path using the Phase 01 examples.
6. Update notes with the exact runtime ownership boundaries and any missing executor contract detail.

## Related Notes

- Step: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_03_implement-artifact-registry-run-history-and-executor-contracts|STEP-03-03 Implement Artifact Registry Run History And Executor Contracts]]
- Phase: [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
