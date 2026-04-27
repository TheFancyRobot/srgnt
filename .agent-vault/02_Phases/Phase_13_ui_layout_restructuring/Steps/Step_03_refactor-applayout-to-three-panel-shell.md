---
note_type: step
template_version: 2
contract_version: 1
title: Refactor AppLayout to three-panel shell
step_id: STEP-13-03
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: completed
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on:
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_01_create-activitybar-component-with-accessible-icon-only-navigation|STEP-13-01]]'
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_02_create-layoutcontext-provider-and-sidepanel-component|STEP-13-02]]'
related_sessions:
  - '[[05_Sessions/2026-03-30-161918-refactor-applayout-to-three-panel-shell-opencode|SESSION-2026-03-30-161918 OpenCode session for Refactor AppLayout to three-panel shell]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Refactor AppLayout to three-panel shell

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: The `AppLayout` component renders the new three-panel layout (ActivityBar + SidePanel + Content), replacing the current two-panel layout. The `App` component in `main.tsx` uses `LayoutProvider` for state management and the new layout shell for rendering.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

## Required Reading

- `packages/desktop/src/renderer/components/Navigation.tsx` -- the full `AppLayout` component
- `packages/desktop/src/renderer/main.tsx` -- the full `App` component, especially the navigation state and `renderContent()` switch
- [[01_Architecture/System_Overview|System Overview]] -- understand the desktop renderer architecture and component hierarchy
- The completed Step 01 and Step 02 code

## Companion Notes

- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_03_refactor-applayout-to-three-panel-shell/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_03_refactor-applayout-to-three-panel-shell/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_03_refactor-applayout-to-three-panel-shell/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_03_refactor-applayout-to-three-panel-shell/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-03-30
- Next action: Start STEP-13-03.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- This is the riskiest step because it touches the core layout shell. Make a commit before starting and another after completing so the change is easily revertable.
- The Titlebar must span the full window width (it's the Electron drag region). It sits above the three-column flex row, not inside any column.
- Be careful with the `min-h-0` on the flex row -- without it, the content area won't scroll properly. This is a common flexbox gotcha.
- The `grain::after` pseudo-element is on the `.grain` class which is on the outermost div. It should still work since it uses `position: fixed; inset: 0`.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-30 - [[05_Sessions/2026-03-30-161918-refactor-applayout-to-three-panel-shell-opencode|SESSION-2026-03-30-161918 OpenCode session for Refactor AppLayout to three-panel shell]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
