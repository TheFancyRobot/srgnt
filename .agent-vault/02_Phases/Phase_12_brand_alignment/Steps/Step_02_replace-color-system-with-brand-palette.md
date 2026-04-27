---
note_type: step
template_version: 2
contract_version: 1
title: Replace color system with brand palette
step_id: STEP-12-02
phase: '[[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]]'
status: completed
owner: ''
created: '2026-03-29'
updated: '2026-03-29'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Replace color system with brand palette

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Every CSS custom property in the desktop app's color system matches the BRAND_GUIDE palette. Dark mode uses graphite/carbon/ink surfaces, warm bone/stone text, luminous violet primary accent (#b794f6), steel blue secondary (#85acc6), and branded semantic tones. Light mode is updated to complement the brand direction. The `srgnt-*` Tailwind color scale is rewritten from amber/gold to a violet scale.
- Parent phase: [[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]].

## Required Reading

- [[01_Architecture/System_Overview|System Overview]]
- `~/dev/srgnt-website/BRAND_GUIDE.md` — Color direction section (lines 315-327) and Visual direction section (lines 276-302)
- `~/dev/srgnt-website/src/styles/global.css` — CSS variable color definitions (lines 57-99): the website's dark palette is the canonical reference implementation
- `packages/desktop/src/renderer/styles.css` — current color system to understand what needs replacing

## Companion Notes

- [[02_Phases/Phase_12_brand_alignment/Steps/Step_02_replace-color-system-with-brand-palette/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_02_replace-color-system-with-brand-palette/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_02_replace-color-system-with-brand-palette/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_02_replace-color-system-with-brand-palette/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-29
- Next action: Start STEP-12-02.
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
