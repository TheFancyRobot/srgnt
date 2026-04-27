---
note_type: step
template_version: 2
contract_version: 1
title: Move anaglyph logo to titlebar
step_id: STEP-12-03
phase: '[[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]]'
status: completed
owner: ''
created: '2026-03-29'
updated: '2026-03-29'
depends_on:
  - STEP-12-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Move anaglyph logo to titlebar

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: The "srgnt" wordmark appears in the titlebar left side using JetBrains Mono bold with the anaglyph cyan/red text-shadow, matching the website navbar. The old lightning-bolt logo and brand box are removed from the sidebar header.
- Parent phase: [[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]].

## Required Reading

- [[01_Architecture/System_Overview|System Overview]]
- `~/dev/srgnt-website/src/components/Nav.astro` — the `.nav-logo` CSS (lines 137-155) shows the exact anaglyph text-shadow implementation to mirror
- `~/dev/srgnt-website/BRAND_GUIDE.md` — Logo identity section (lines 305-311): cyan rgba(0, 183, 255, 0.6), red rgba(255, 42, 61, 0.6)
- `packages/desktop/src/renderer/components/Titlebar.tsx` — current titlebar structure
- `packages/desktop/src/renderer/components/Navigation.tsx` — current sidebar brand header to remove

## Companion Notes

- [[02_Phases/Phase_12_brand_alignment/Steps/Step_03_move-anaglyph-logo-to-titlebar/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_03_move-anaglyph-logo-to-titlebar/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_03_move-anaglyph-logo-to-titlebar/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_03_move-anaglyph-logo-to-titlebar/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-29
- Next action: Start STEP-12-03.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
