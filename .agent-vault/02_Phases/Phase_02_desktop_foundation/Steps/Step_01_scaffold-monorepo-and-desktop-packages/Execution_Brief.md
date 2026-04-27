# Execution Brief

## Step Overview

Choose the initial workspace tooling and create the package skeleton for the desktop product.

## Why This Step Exists

- The repo is currently vault-only, so every later implementation step depends on a real package skeleton.
- Tooling choice is still open; this step must settle it once and document the validation commands everyone else will use.

## Prerequisites

- Read [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]].
- Read [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]].

## Relevant Code Paths

- `package.json`
- workspace config chosen here, such as `pnpm-workspace.yaml` or equivalent
- `packages/desktop/`
- `packages/contracts/`
- `packages/runtime/`
- `packages/connectors/`
- `packages/executors/`
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`

## Execution Prompt

1. Confirm the repo is still empty of product code and choose a workspace/tooling direction that fits Electron plus shared TypeScript packages.
2. Create the initial package skeleton and baseline scripts for install, typecheck, test, and desktop smoke validation.
3. Keep the layout aligned with Phase 01 contract homes and later runtime/connector phases.
4. Record the exact validation commands chosen here so later steps do not guess.
5. Validate by running the new workspace bootstrap commands and verifying the package graph matches the planned milestones.
6. Update notes with the chosen tooling, exact paths, and any deferred tooling decision.

## Related Notes

- Step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_01_scaffold-monorepo-and-desktop-packages|STEP-02-01 Scaffold Monorepo And Desktop Packages]]
- Phase: [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
