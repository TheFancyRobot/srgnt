---
note_type: step
template_version: 2
contract_version: 1
title: Self-host brand fonts and update typography references
step_id: STEP-12-01
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

# Step 01 - Self-host brand fonts and update typography references

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: The desktop app self-hosts Barlow (400/500/600/700) and JetBrains Mono (400) woff2 fonts with proper @font-face declarations, and every font-family reference in CSS, Tailwind config, and component code uses the brand-correct stack (Barlow for display/body, JetBrains Mono for mono). Also create a symlink to the living BRAND_GUIDE.md.
- Parent phase: [[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]].

## Required Reading

- [[01_Architecture/System_Overview|System Overview]]
- `~/dev/srgnt-website/BRAND_GUIDE.md` — Typography direction section (lines 329-337)
- `~/dev/srgnt-website/src/styles/global.css` — @font-face declarations (lines 8-53) and CSS variable font stacks (lines 101-103)
- `packages/desktop/src/renderer/styles.css` — current font references
- `packages/desktop/tailwind.config.js` — current fontFamily config

## Companion Notes

- [[02_Phases/Phase_12_brand_alignment/Steps/Step_01_self-host-brand-fonts-and-update-typography-references/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_01_self-host-brand-fonts-and-update-typography-references/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_01_self-host-brand-fonts-and-update-typography-references/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_01_self-host-brand-fonts-and-update-typography-references/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-29
- Next action: Start STEP-12-01.
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
