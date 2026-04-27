# Execution Brief

## Step Overview

Translate manifest-declared capabilities and approvals into reusable runtime enforcement.

## Why This Step Exists

- The framework calls out silent changes and weak trust as major risks.
- Approval and capability rules must exist before connector write flows, artifact updates, or terminal launches become real.

## Prerequisites

- Complete [[02_Phases/Phase_03_runtime_foundation/Steps/Step_01_implement-canonical-store-and-manifest-loaders|STEP-03-01 Implement Canonical Store And Manifest Loaders]].

## Relevant Code Paths

- `packages/runtime/`
- `packages/contracts/`
- skill and connector manifests from Phase 01
- approval UI hooks to be used later by desktop and workflow phases

## Execution Prompt

1. Implement capability resolution and approval requirements from the manifest contracts.
2. Distinguish read-only flows from write or side-effect flows in a way later UI can display clearly.
3. Keep policy enforcement runtime-centric rather than renderer-centric.
4. Add tests or fixtures that show a denied capability path and an approval-required path.
5. Validate with targeted policy tests and loader integration checks.
6. Update notes with the resolved capability taxonomy and any ambiguity that requires a new decision note.

## Related Notes

- Step: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_02_implement-capability-policy-and-approval-model|STEP-03-02 Implement Capability Policy And Approval Model]]
- Phase: [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
