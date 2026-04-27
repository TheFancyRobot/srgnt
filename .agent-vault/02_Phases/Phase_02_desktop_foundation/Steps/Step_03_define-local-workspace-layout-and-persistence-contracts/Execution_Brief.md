# Execution Brief

## Step Overview

Freeze the on-disk workspace shape and the hybrid file-plus-metadata persistence boundaries.

## Why This Step Exists

- The framework's final pre-coding checklist explicitly calls out exact workspace layout and file formats as remaining work.
- If the local-first persistence model is vague, runtime and sync work will fork incompatible assumptions.

## Prerequisites

- Complete [[02_Phases/Phase_02_desktop_foundation/Steps/Step_01_scaffold-monorepo-and-desktop-packages|STEP-02-01 Scaffold Monorepo And Desktop Packages]].

## Relevant Code Paths

- `packages/desktop/`
- `packages/contracts/`
- `packages/runtime/`
- target workspace paths such as `.command-center/config/`, `.command-center/state/`, `.command-center/logs/`, `.command-center/cache/`, `.command-center/connectors/`, plus user-facing directories like `Daily/`, `Projects/`, `People/`, and `Meetings/`
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`

## Execution Prompt

1. Translate the framework's workspace model into exact on-disk layout and file-format rules.
2. Separate file-backed artifacts from the derived local metadata/index layer and document the authority boundary.
3. Define workspace bootstrap behavior for first run and for reopening an existing workspace.
4. Ensure the result is compatible with later sync preparation without making remote services authoritative.
5. Validate by checking that Phase 03 runtime work can point to one canonical source-of-truth boundary for artifacts, logs, settings, and derived metadata.
6. Update notes with the final directory shape, file-format rules, and any unresolved storage detail.

## Related Notes

- Step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts|STEP-02-03 Define Local Workspace Layout And Persistence Contracts]]
- Phase: [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
