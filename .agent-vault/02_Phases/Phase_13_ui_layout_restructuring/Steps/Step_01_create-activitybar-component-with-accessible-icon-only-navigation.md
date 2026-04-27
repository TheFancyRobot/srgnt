---
note_type: step
template_version: 2
contract_version: 1
title: Create ActivityBar component with accessible icon-only navigation
step_id: STEP-13-01
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: completed
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-03-30-052634-create-activitybar-component-with-accessible-icon-only-navigation-opencode|SESSION-2026-03-30-052634 OpenCode session for Create ActivityBar component with accessible icon-only navigation]]'
  - '[[05_Sessions/2026-03-30-151255-create-activitybar-component-with-accessible-icon-only-navigation-opencode|SESSION-2026-03-30-151255 OpenCode session for Create ActivityBar component with accessible icon-only navigation]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Create ActivityBar component with accessible icon-only navigation

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: A standalone `ActivityBar` component that renders a narrow (~48px) vertical strip of icon-only buttons following the WAI-ARIA toolbar pattern. This replaces the icon+label navigation currently embedded in `Navigation.tsx`.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

## Required Reading

- `packages/desktop/src/renderer/components/Navigation.tsx` -- understand current icon map, nav item types, and active indicator styling
- `packages/desktop/src/renderer/styles.css` -- understand current nav-item CSS including active state indicator bar
- [[01_Architecture/System_Overview|System Overview]] -- understand the desktop renderer architecture
- [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]] -- canonical view list and navigation principles
- WAI-ARIA Toolbar Pattern: the toolbar should use `role="toolbar"`, `aria-orientation="vertical"`, and roving tabindex where only the focused button has `tabindex="0"` and all others have `tabindex="-1"`

## Companion Notes

- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_01_create-activitybar-component-with-accessible-icon-only-navigation/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_01_create-activitybar-component-with-accessible-icon-only-navigation/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_01_create-activitybar-component-with-accessible-icon-only-navigation/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_01_create-activitybar-component-with-accessible-icon-only-navigation/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-03-30
- Next action: Start STEP-13-01.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- The user specifically called out accessibility for the icon-only menu. This is a hard requirement, not optional polish.
- Icon extraction to `icons.tsx` is specified in the execution prompt. Create the shared module first, verify Navigation still works, then build ActivityBar.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-30 - [[05_Sessions/2026-03-30-052634-create-activitybar-component-with-accessible-icon-only-navigation-opencode|SESSION-2026-03-30-052634 OpenCode session for Create ActivityBar component with accessible icon-only navigation]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-151255-create-activitybar-component-with-accessible-icon-only-navigation-opencode|SESSION-2026-03-30-151255 OpenCode session for Create ActivityBar component with accessible icon-only navigation]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
