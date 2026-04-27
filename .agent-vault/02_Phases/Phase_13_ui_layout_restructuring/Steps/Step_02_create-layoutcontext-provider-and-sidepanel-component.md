---
note_type: step
template_version: 2
contract_version: 1
title: Create LayoutContext provider and SidePanel component
step_id: STEP-13-02
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: completed
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Create LayoutContext provider and SidePanel component

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: A `LayoutContext` React context provider that manages the three-panel layout state, and a `SidePanel` shell component that renders context-dependent content with resize and collapse capabilities.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

## Required Reading

- `packages/desktop/src/renderer/main.tsx` -- understand the full navigation state flow (lines 38, 147-157, 420-468)
- `packages/desktop/src/renderer/components/Navigation.tsx` -- understand `NavItem` interface and how items are categorized
- [[01_Architecture/System_Overview|System Overview]] -- understand the desktop renderer architecture

## Companion Notes

- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_02_create-layoutcontext-provider-and-sidepanel-component/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_02_create-layoutcontext-provider-and-sidepanel-component/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_02_create-layoutcontext-provider-and-sidepanel-component/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_02_create-layoutcontext-provider-and-sidepanel-component/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-03-30
- Next action: Start STEP-13-02.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- The panel registry pattern is forward-looking for connector extensibility. In this phase, panels are registered statically by the app. In future phases, connectors will call `registerPanel()` to add themselves dynamically.
- The resize handle should feel native-quality. Key details: prevent text selection during drag (add `user-select: none` to body), use `requestAnimationFrame` if drag feels janky, and make the hover target wider than the visual indicator (use a ::before pseudo-element or padding).

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
