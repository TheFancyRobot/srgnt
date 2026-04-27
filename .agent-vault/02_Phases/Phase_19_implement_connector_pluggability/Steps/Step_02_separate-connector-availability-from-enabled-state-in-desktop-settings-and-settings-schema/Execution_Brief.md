# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- Today `SDesktopConnectorPreferences` and `defaultDesktopSettings` still use per-connector booleans, which conflates “installed” with “connected/enabled”.
- The renderer cannot honestly present install/uninstall actions while settings still encode a toggle-first model.
- This step makes fresh-workspace defaults and migration behavior explicit before main-process APIs start mutating install state.

## Prerequisites

- Complete [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_01_introduce-discoverable-connector-catalog-with-explicit-installable-manifest-records|STEP-19-01]].
- Review current settings persistence helpers and tests before choosing the final persisted shape.
- Confirm the migration policy before implementation: preserve only explicit legacy opt-ins; never auto-install connectors for missing or fresh settings.

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts`
- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/settings.test.ts`
- `packages/desktop/src/main/index.ts`

## Execution Prompt

1. Replace the current connector boolean settings model with an explicit `installedConnectorIds: string[]` array containing connector IDs.
2. Keep `available` out of persisted settings; availability must remain derived from the bundled catalog created in Step 01.
3. Make fresh defaults empty: no connector is installed in `defaultDesktopSettings` and no connector becomes installed during onboarding without explicit user action.
4. Add a compatibility path for legacy settings files so previously explicit `true` connector flags are preserved as installed during migration, while missing or `false` values remain uninstalled.
5. Update settings merge/read/write helpers and any parsing tests that assert defaults.
6. Leave connect/disconnect runtime semantics for Step 03; this step ends when persistence tells the truth.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema|STEP-19-02 Separate connector availability from enabled state in desktop settings and settings schema]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
