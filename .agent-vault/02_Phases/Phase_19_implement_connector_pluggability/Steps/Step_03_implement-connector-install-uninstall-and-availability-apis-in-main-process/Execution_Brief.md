# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- After Step 02, installation intent can be persisted honestly, but the main process still uses `connect` / `disconnect` as a proxy for installation.
- The desktop app needs an API surface that lets the renderer say “install this connector” without immediately authenticating it.
- This is also where install-before-use becomes enforceable: connect flows must reject uninstalled connectors.

## Prerequisites

- Complete [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema|STEP-19-02]].
- Review how connector state is currently derived and where `connectorState` is mutated in `packages/desktop/src/main/index.ts`.
- Understand the secret boundary in [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]].

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts`
- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/settings.test.ts`

## Execution Prompt

1. Add explicit IPC channel definitions for connector installation and uninstallation.
2. Implement main-process install and uninstall handlers that mutate only persisted install state plus the in-memory connector runtime state derived from it.
3. Ensure install returns an **installed but disconnected** connector unless some later explicit connect/auth action occurs.
4. Ensure uninstall removes installation intent and clears any in-memory connected/error/freshness state so the connector returns to a discoverable-but-uninstalled posture.
5. Update existing `connect` / `disconnect` handlers so they no longer stand in for installation. If a connector is not installed, connect must reject or fail closed with a clear error.
6. Keep availability derived from the bundled catalog. Do not add renderer wiring in this step.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03 Implement connector install/uninstall and availability APIs in main process]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
