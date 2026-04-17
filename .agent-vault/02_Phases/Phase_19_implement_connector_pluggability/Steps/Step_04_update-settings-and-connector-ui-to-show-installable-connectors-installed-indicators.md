---
note_type: step
template_version: 2
contract_version: 1
title: Update Settings and connector UI to show installable connectors + installed indicators
step_id: STEP-19-04
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
status: completed
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - STEP-19-03
related_sessions:
  - '[[05_Sessions/2026-04-16-231002-update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators-executor-1|SESSION-2026-04-16-231002 executor-1 session for Update Settings and connector UI to show installable connectors + installed indicators]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Update Settings and connector UI to show installable connectors + installed indicators

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: refactor presentational connector and settings components so they communicate the new **Available / Installed / Connected** model instead of a boolean enable/disable toggle.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

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

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]
- `packages/desktop/src/renderer/components/ConnectorStatus.tsx`
- `packages/desktop/src/renderer/components/Settings.tsx`
- `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.tsx`

## Execution boundary (Step 04 vs Step 05)

**Step 04 scope:** presentation and prop-shape only.

- Keep this step focused to renderer components:
  - `ConnectorStatus` states/labels
  - section/grouping labels in settings/panels
  - callback prop names for actions (`onInstall`, `onUninstall`, `onConnect`, `onDisconnect`)
- Update tests for render outcomes and user-visible copy.

**Step 05 scope:** boundary orchestration and preload wiring.

- Do **not** edit `preload/index.ts`, `renderer/main.tsx`, `renderer/env.d.ts`, or IPC contracts in Step 04.
- If a component needs action semantics to work, define/augment props only and leave execution to Step 05.


## Execution Prompt

1. Refactor connector-facing components to render installability explicitly rather than inferring everything from `status`.
2. Update action labels and grouping so the UI distinguishes discoverable connectors from installed connectors.
3. Remove or replace the old boolean connector settings rows in `Settings.tsx` / `defaultSettingsSections`; they should no longer imply default installation.
4. Keep leaf components presentational where possible: prefer callback props such as `onInstall`, `onUninstall`, `onConnect`, and `onDisconnect` over direct `window.srgnt` calls.
5. Do not call preload APIs here; Step 05 is the only wiring layer for renderer action dispatch.
6. Add copy or empty-state text that makes the default explicit: bundled connectors are available, but none are installed until the user chooses them.
7. Update component tests to match the new buttons, labels, grouping, and state transitions.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-16
- Next action: Refactor connector and settings components to show installability explicitly before renderer wiring lands.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### Refinement (readiness checklist pass)

**Exact outcome:**
- The main connector surfaces visibly communicate the three-state model.
- No component copy or default toggle implies that connectors arrive preinstalled.
- The presentational contract is ready for Step 05 to wire with real preload calls.

**Key decisions to apply:**
- [[01_Architecture/Integration_Map|Integration Map]] is the architecture anchor: the renderer shows safe summary state only and never becomes the source of truth for installation.
- “Install” is the first action for discoverable connectors; “Connect” is not shown before installation.
- Settings and connector views should agree on naming and counts.
- Preserve accessibility and testability: every action must have clear button text and ARIA labels.

**Starting files and likely touch points:**
- `packages/desktop/src/renderer/components/ConnectorStatus.tsx` and tests.
- `packages/desktop/src/renderer/components/Settings.tsx` and tests.
- `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.tsx` and tests.
- `packages/desktop/src/renderer/components/sidepanels/SettingsSidePanel.tsx` if category labels or navigation hints change.

**Constraints and non-goals:**
- Do not call preload or mutate global state directly from deeply nested presentational components unless there is an established pattern already in use.
- Do not reintroduce boolean connector toggle copy.
- Do not fake installation in UI-only state just to make tests pass.
- Do not expose secret/auth details in component props.

**Edge cases and failure modes:**
- Installed-but-error connectors still need clear action affordances.
- Unavailable future connectors should degrade safely if catalog support later expands.
- Empty states should remain useful when zero connectors are installed and when zero connectors are available.

**Security:**
- Renderer components should operate on safe summary state only.
- No token/account details belong in these props.

**Performance:**
- Keep grouping logic straightforward and memoizable.
- Avoid unnecessary prop reshaping that causes broad rerenders in lists.

**Validation:**
1. `pnpm -C packages/desktop test -- --filter ConnectorStatus`
2. `pnpm -C packages/desktop test -- --filter Settings`
3. `pnpm -C packages/desktop test -- --filter ConnectorsSidePanel`
4. Manual smoke in the renderer shell with mocked state or live app: verify buttons and section headings for available, installed, connected, and error cases.

**Junior-readiness verdict:** PASS — the UI matrix is explicit enough to implement without guessing if the action matrix above is followed.

### Readiness packet (handoff)

- **Starting files:** `packages/desktop/src/renderer/components/ConnectorStatus.tsx`, `packages/desktop/src/renderer/components/Settings.tsx`, `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.tsx`, and corresponding tests under `packages/desktop/src/renderer/components/**`.
- **Success condition:** renderer surfaces must show explicit Available/Installed/Connected states and no longer imply pre-installed connectors before Step 05.
- **Blockers:** none technical inside this step; execution is blocked only by stale Step 03 runtime semantics if incomplete (Step 05 assumes `onInstall`, `onConnect`, etc. callbacks are available).
- **Edge/failure cases to validate:** install state mismatch between discoverability and render; empty workspace state; error-state connectors; unavailable catalog entries.
- **Validation expectations:** targeted component tests and renderer smoke checks complete with manual verification of labels/state grouping and action affordances.
- **Downstream effect:** creates stable UI action contract consumed by Step 05 without additional prop-shape churn.

## Human Notes

- If Step 04 reveals that top-level app state assumptions are too baked into presentational components, document the pressure clearly for Step 05 rather than hiding it in ad hoc UI workarounds.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-16 - [[05_Sessions/2026-04-16-231002-update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators-executor-1|SESSION-2026-04-16-231002 executor-1 session for Update Settings and connector UI to show installable connectors + installed indicators]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the UI teaches the correct install-before-use mental model even before full wiring is complete.
- Validation target: a reviewer can look at the connector surfaces and immediately tell which connectors are available, installed, and connected.
- Follow-up moves to [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_05_align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model|STEP-19-05]].