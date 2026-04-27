# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- Step 03 introduces the main-process truth and Step 04 updates the presentational UI, but the preload API and top-level renderer state still reflect the old toggle-first connector model.
- `packages/desktop/src/renderer/main.tsx` currently refreshes connector state via `connectConnector`, `disconnectConnector`, and settings saves that assume connector booleans.
- Without this step, the UI cannot exercise the new lifecycle safely or type-check against the actual desktop boundary.

## Prerequisites

- Complete [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03]].
- Complete [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators|STEP-19-04]].
- Review current renderer bootstrap and refresh flows in `packages/desktop/src/renderer/main.tsx` before editing callbacks.

## Relevant Code Paths

- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/main.tsx`
- `packages/desktop/src/renderer/components/ConnectorStatus.tsx`
- `packages/desktop/src/renderer/components/Settings.tsx`

## Execution Prompt

1. Add preload bridge methods for install and uninstall, keeping naming and return types aligned with the main-process handlers from Step 03.
2. Update `window.srgnt` typings so renderer code sees the same connector state shape and method set as preload.
3. Refactor top-level renderer orchestration to use explicit install, uninstall, connect, and disconnect callbacks instead of treating settings saves or connect/disconnect calls as installation.
4. Ensure refresh logic after connector actions keeps connector lists and settings in sync without auto-installing anything.
5. Remove any renderer assumptions that connector booleans live inside generic settings UI state unless that state now genuinely represents installed connector IDs.
6. Preserve component markup from Step 04; avoid changing action labels/copy unless required to compile data flow.
7. Finish by typechecking the desktop package and manually exercising the full renderer flow against the real preload API.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_05_align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model|STEP-19-05 Align preload bridge and renderer contracts with new connector pluggability model]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
