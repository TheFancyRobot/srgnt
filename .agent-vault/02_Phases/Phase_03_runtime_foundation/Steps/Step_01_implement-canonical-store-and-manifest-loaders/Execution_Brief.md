# Execution Brief

## Step Overview

Turn the contract-only entity, skill, and connector definitions into executable shared runtime code.

## Why This Step Exists

- The contracts phase is only useful if the runtime can actually consume those contracts.
- Later approval, artifact, and connector work all depend on a single store and manifest-loading path.

## Prerequisites

- Complete [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]].
- Read the finalized Phase 01 contracts and worked examples.

## Relevant Code Paths

- `packages/contracts/`
- `packages/runtime/`
- `packages/executors/`
- sample manifests and fixtures created in Phase 01

## Execution Prompt

1. Implement runtime packages that load canonical entities, skill manifests, and connector manifests from the contract locations frozen earlier.
2. Keep loaders strict enough to catch contract drift early.
3. Ensure the runtime can operate on local workspace state without provider-specific code paths.
4. Add targeted tests or fixtures that prove the runtime can load the Phase 01 examples end-to-end.
5. Validate with targeted loader tests plus the workspace typecheck command from Phase 02.
6. Update notes with the exact runtime modules created and any contract gap discovered.

## Related Notes

- Step: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_01_implement-canonical-store-and-manifest-loaders|STEP-03-01 Implement Canonical Store And Manifest Loaders]]
- Phase: [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
