---
note_type: step
template_version: 2
contract_version: 1
title: Persist layout preferences and add collapse behaviors
step_id: STEP-13-05
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: complete
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on:
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_03_refactor-applayout-to-three-panel-shell|STEP-13-03]]'
related_sessions:
  - '[[05_Sessions/2026-03-30-190901-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-190901 OpenCode session for Persist layout preferences and add collapse behaviors]]'
  - '[[05_Sessions/2026-03-30-193903-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-193903 OpenCode session for Persist layout preferences and add collapse behaviors]]'
  - '[[05_Sessions/2026-03-30-222302-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-222302 OpenCode session for Persist layout preferences and add collapse behaviors]]'
  - '[[05_Sessions/2026-03-30-225848-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-225848 OpenCode session for Persist layout preferences and add collapse behaviors]]'
related_bugs: []
tags:
  - agent-vault
  - step
completed_at: '2026-03-30'
---

# Step 05 - Persist layout preferences and add collapse behaviors

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: The sidebar width and collapsed state are persisted to desktop settings so they survive app restarts. The collapse/expand animation is polished and the toggle behaviors feel native-quality.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

## Required Reading

- `packages/desktop/src/renderer/main.tsx` -- understand the `patchSettings` flow and how settings are loaded on startup (lines 50-83, 116-126)
- `packages/desktop/src/renderer/main.tsx` -- also inspect the duplicated renderer-side `defaultSettings` constant at lines 16-28 so layout defaults do not drift between renderer and main process
- `packages/contracts/src/ipc/contracts.ts` -- understand the `SDesktopSettings` Effect Schema (lines 76-104) and the existing `SDesktopConnectorPreferences` nested struct pattern
- `packages/desktop/src/renderer/styles.css` -- understand the existing animation easing curves and transition patterns
- [[01_Architecture/System_Overview|System Overview]] -- understand the desktop settings persistence architecture

## Companion Notes

- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_05_persist-layout-preferences-and-add-collapse-behaviors/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_05_persist-layout-preferences-and-add-collapse-behaviors/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_05_persist-layout-preferences-and-add-collapse-behaviors/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_05_persist-layout-preferences-and-add-collapse-behaviors/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-03-30
- Next action: Start STEP-13-05.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- The debounce on resize persistence is important. Saving to disk on every pixel of drag will cause noticeable lag. 300ms debounce after drag ends is the right pattern.
- The animation easing curve `cubic-bezier(0.16, 1, 0.3, 1)` is an "ease-out-expo" that gives a fast start and gentle deceleration. It's used consistently throughout the app and the sidebar should match.
- The double-click-to-reset-width behavior is optional polish. Do not block the phase on it if the core persistence and collapse behavior are correct.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-30 - [[05_Sessions/2026-03-30-190901-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-190901 OpenCode session for Persist layout preferences and add collapse behaviors]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-193903-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-193903 OpenCode session for Persist layout preferences and add collapse behaviors]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-222302-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-222302 OpenCode session for Persist layout preferences and add collapse behaviors]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-225848-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-225848 OpenCode session for Persist layout preferences and add collapse behaviors]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
