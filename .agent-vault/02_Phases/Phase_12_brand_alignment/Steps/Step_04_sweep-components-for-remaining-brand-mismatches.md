---
note_type: step
template_version: 2
contract_version: 1
title: Sweep components for remaining brand mismatches
step_id: STEP-12-04
phase: '[[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]]'
status: completed
owner: ''
created: '2026-03-29'
updated: '2026-03-29'
depends_on:
  - STEP-12-01
  - STEP-12-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Sweep components for remaining brand mismatches

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: No renderer component contains hardcoded references to Sora, DM Sans, or the old amber/gold color values. Every brand-touching style flows through CSS variables or Tailwind utilities that resolve to the updated brand tokens. Button text contrast on the violet primary is verified.
- Parent phase: [[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]].

## Required Reading

- [[01_Architecture/System_Overview|System Overview]]
- `~/dev/srgnt-website/BRAND_GUIDE.md` — for reference when deciding replacement values
- `packages/desktop/src/renderer/styles.css` — the updated styles after Steps 01+02

## Companion Notes

- [[02_Phases/Phase_12_brand_alignment/Steps/Step_04_sweep-components-for-remaining-brand-mismatches/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_04_sweep-components-for-remaining-brand-mismatches/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_04_sweep-components-for-remaining-brand-mismatches/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_04_sweep-components-for-remaining-brand-mismatches/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-29
- Next action: Start STEP-12-04.
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
