# Execution Brief

## Step Overview

Build the shell-level navigation and placeholder surfaces that later milestones will fill in.

## Why This Step Exists

- The framework defines the major product surfaces early.
- Later workflow and integration phases are easier to validate when they attach to real shell routes and panels.

## Prerequisites

- Complete [[02_Phases/Phase_02_desktop_foundation/Steps/Step_02_implement-electron-shell-and-preload-boundary|STEP-02-02 Implement Electron Shell And Preload Boundary]].
- Complete [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts|STEP-02-03 Define Local Workspace Layout And Persistence Contracts]].

## Relevant Code Paths

- `packages/desktop/renderer/`
- `packages/desktop/preload/`
- `packages/runtime/`
- desktop smoke/manual QA scripts chosen in Step 01

## Execution Prompt

1. Implement the navigation skeleton and top-level placeholder screens named in the framework.
2. Hook the shell to workspace bootstrap state and one safe preload-mediated capability so the app proves the privilege boundary in practice.
3. Keep the surfaces intentionally thin; do not smuggle connector or workflow logic into this step.
4. Add a manual smoke path that verifies route changes, settings shell, and integrations shell all render inside the desktop app.
5. Validate with the desktop smoke script and a manual route walk-through.
6. Update notes with the final screen list and any deferred IA question.

## Related Notes

- Step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_04_add-navigation-skeleton-and-settings-surfaces|STEP-02-04 Add Navigation Skeleton And Settings Surfaces]]
- Phase: [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
