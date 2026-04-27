# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- After Step 03, the backend truth exists, but the UI still teaches the wrong mental model: it looks like connectors are merely on/off toggles.
- Users need explicit install affordances and labels before wiring work reaches the top-level renderer orchestration.
- Keeping this step mostly presentational makes the behavior reviewable without mixing API wiring and UI semantics in one diff.

## Prerequisites

- Complete [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03]].
- Review current connector and settings component tests so updated copy and buttons stay intentional.
- Confirm the expected action matrix before coding:
  - available + not installed -> Install
  - installed + disconnected -> Connect / Configure and Uninstall
  - installed + connected -> Connected / Disconnect and Uninstall (if safe)

## Relevant Code Paths

- `packages/desktop/src/renderer/components/ConnectorStatus.tsx`
- `packages/desktop/src/renderer/components/ConnectorStatus.test.tsx`
- `packages/desktop/src/renderer/components/Settings.tsx`
- `packages/desktop/src/renderer/components/Settings.test.tsx`
- `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.tsx`
- `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.test.tsx`
- `packages/desktop/src/renderer/components/sidepanels/SettingsSidePanel.tsx`

## Execution Prompt

1. Refactor connector-facing components to render installability explicitly rather than inferring everything from `status`.
2. Update action labels and grouping so the UI distinguishes discoverable connectors from installed connectors.
3. Remove or replace the old boolean connector settings rows in `Settings.tsx` / `defaultSettingsSections`; they should no longer imply default installation.
4. Keep leaf components presentational where possible: prefer callback props such as `onInstall`, `onUninstall`, `onConnect`, and `onDisconnect` over direct `window.srgnt` calls.
5. Do not call preload APIs here; Step 05 is the only wiring layer for renderer action dispatch.
6. Add copy or empty-state text that makes the default explicit: bundled connectors are available, but none are installed until the user chooses them.
7. Update component tests to match the new buttons, labels, grouping, and state transitions.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators|STEP-19-04 Update Settings and connector UI to show installable connectors + installed indicators]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
