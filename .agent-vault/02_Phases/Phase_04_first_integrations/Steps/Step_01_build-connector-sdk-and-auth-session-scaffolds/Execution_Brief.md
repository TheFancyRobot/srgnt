# Execution Brief

## Step Overview

Create the shared connector plumbing behind the privileged desktop boundary.

## Why This Step Exists

- Jira, Outlook Calendar, and the collaboration connector should not each invent their own auth and sync scaffolding.
- This is the main guardrail against brittle connectors and unsafe secret handling.

## Prerequisites

- Complete [[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]].
- Complete [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]].

## Relevant Code Paths

- `packages/connectors/`
- `packages/runtime/`
- `packages/desktop/main/`
- `packages/desktop/preload/`

## Execution Prompt

1. Implement the shared connector SDK, install/discovery path, and auth/session scaffolds using the privileged boundary from Phase 02.
2. Separate connector capabilities, auth/session state, sync cursors, and raw metadata retention concerns cleanly.
3. Expose only narrow UI-facing connector state through preload/IPC.
4. Add fixture-friendly connector test hooks before building concrete connectors.
5. Validate with targeted SDK tests and a smoke check that one dummy connector can register and expose safe status information.
6. Update notes with the shared SDK modules, auth assumptions, and any capability gap discovered.

## Related Notes

- Step: [[02_Phases/Phase_04_first_integrations/Steps/Step_01_build-connector-sdk-and-auth-session-scaffolds|STEP-04-01 Build Connector SDK And Auth Session Scaffolds]]
- Phase: [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
