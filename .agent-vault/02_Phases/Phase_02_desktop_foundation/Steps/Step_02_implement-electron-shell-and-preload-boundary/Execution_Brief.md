# Execution Brief

## Step Overview

Create the first runnable Electron main/renderer/preload shell with typed, narrow capability boundaries.

## Why This Step Exists

- The desktop shell is the main executable product surface.
- Security posture can drift immediately if preload and IPC boundaries are not designed up front.

## Prerequisites

- Complete [[02_Phases/Phase_02_desktop_foundation/Steps/Step_01_scaffold-monorepo-and-desktop-packages|STEP-02-01 Scaffold Monorepo And Desktop Packages]].

## Relevant Code Paths

- `packages/desktop/main/`
- `packages/desktop/preload/`
- `packages/desktop/renderer/`
- `packages/runtime/` for shared types
- desktop smoke and typecheck scripts chosen in Step 01

## Execution Prompt

1. Create the Electron main, renderer, and preload entry points using the package structure from Step 01.
2. Expose only narrow, typed capabilities through preload and IPC; do not add broad filesystem, network, or shell bridges.
3. Keep secrets, PTY hosting, and connector auth out of the renderer.
4. Add the minimum smoke path needed to prove the shell boots and the bridge can call one safe capability.
5. Validate with the desktop smoke command and a typecheck that covers shared preload contract types.
6. Update notes with the exact IPC entry points created and any capability intentionally deferred.

## Related Notes

- Step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_02_implement-electron-shell-and-preload-boundary|STEP-02-02 Implement Electron Shell And Preload Boundary]]
- Phase: [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
