---
note_type: step
template_version: 2
contract_version: 1
title: Implement view-specific side panel content
step_id: STEP-13-04
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: completed
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on:
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_03_refactor-applayout-to-three-panel-shell|STEP-13-03]]'
related_sessions:
  - '[[05_Sessions/2026-03-30-163338-implement-view-specific-side-panel-content-opencode|SESSION-2026-03-30-163338 OpenCode session for Implement view-specific side panel content]]'
  - '[[05_Sessions/2026-03-30-171111-implement-view-specific-side-panel-content-opencode|SESSION-2026-03-30-171111 OpenCode session for Implement view-specific side panel content]]'
  - '[[05_Sessions/2026-03-30-174823-implement-view-specific-side-panel-content-opencode|SESSION-2026-03-30-174823 OpenCode session for Implement view-specific side panel content]]'
  - '[[05_Sessions/2026-03-30-174829-implement-view-specific-side-panel-content-opencode|SESSION-2026-03-30-174829 OpenCode session for Implement view-specific side panel content]]'
  - '[[05_Sessions/2026-03-30-185258-implement-view-specific-side-panel-content-opencode|SESSION-2026-03-30-185258 OpenCode session for Implement view-specific side panel content]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Implement view-specific side panel content

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Each activity bar view has meaningful side panel content that provides contextual secondary navigation, making the middle column genuinely useful rather than empty placeholder space.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

## Required Reading

- `packages/desktop/src/renderer/components/TodayView.tsx` -- understand the sections: header, blockers, priorities (Jira), schedule (Outlook), attention (Teams)
- `packages/desktop/src/renderer/components/CalendarView.tsx` -- understand the triage strip, day agenda, event detail panel
- `packages/desktop/src/renderer/main.tsx` -- understand the `settingsSections` array structure
- [[01_Architecture/System_Overview|System Overview]] -- understand the desktop renderer architecture
- [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]] -- section-level architecture for each view

## Companion Notes

- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_04_implement-view-specific-side-panel-content/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_04_implement-view-specific-side-panel-content/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_04_implement-view-specific-side-panel-content/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_04_implement-view-specific-side-panel-content/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-03-30
- Next action: Start STEP-13-04.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- The user said the middle column should be "as configurable as possible". Each side panel content component should be relatively self-contained so it can be replaced, reordered, or removed without touching other components.
- For the calendar side panel, the user specifically mentioned wanting to "select the year and month". This is the most functional piece of side panel content and the one most likely to feel valuable immediately.
- The notes side panel is explicitly a placeholder/scaffold. Don't over-invest in making it functional. The goal is to show what the layout will look like when notes are implemented, not to build the notes feature.
- Settings is no longer allowed to keep its old internal left-nav for this phase. Replace it with a stacked, scrollable section layout so the global side panel is the single section-navigation surface.
- Keep side panel content components thin. They should navigate/filter, not display primary content. If a side panel component is getting complex, the logic probably belongs in the main content view instead.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-30 - [[05_Sessions/2026-03-30-163338-implement-view-specific-side-panel-content-opencode|SESSION-2026-03-30-163338 OpenCode session for Implement view-specific side panel content]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-171111-implement-view-specific-side-panel-content-opencode|SESSION-2026-03-30-171111 OpenCode session for Implement view-specific side panel content]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-174823-implement-view-specific-side-panel-content-opencode|SESSION-2026-03-30-174823 OpenCode session for Implement view-specific side panel content]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-174829-implement-view-specific-side-panel-content-opencode|SESSION-2026-03-30-174829 OpenCode session for Implement view-specific side panel content]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-185258-implement-view-specific-side-panel-content-opencode|SESSION-2026-03-30-185258 OpenCode session for Implement view-specific side panel content]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
