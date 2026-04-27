---
note_type: step
template_version: 2
contract_version: 1
title: Verify app icons and rebuild platform assets
step_id: STEP-12-05
phase: '[[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]]'
status: completed
owner: ''
created: '2026-03-29'
updated: '2026-03-29'
depends_on:
  - STEP-12-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Verify app icons and rebuild platform assets

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: The SVG icon sources (`icon.svg`, `logo-full.svg`) are verified against BRAND_GUIDE anaglyph spec. Platform-specific icon assets (ICO, ICNS, PNG at all required sizes) are regenerated from the verified SVGs. The website favicon.svg is compared for consistency.
- Parent phase: [[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]].

## Required Reading

- [[01_Architecture/System_Overview|System Overview]]
- `~/dev/srgnt-website/BRAND_GUIDE.md` — Logo identity section (lines 305-311): cyan rgba(0, 183, 255, 0.6), red rgba(255, 42, 61, 0.6)
- `packages/desktop/build/icon.svg` — verify the anaglyph color values and opacities match the spec
- `packages/desktop/scripts/build-icons.sh` — understand the generation pipeline

## Companion Notes

- [[02_Phases/Phase_12_brand_alignment/Steps/Step_05_verify-app-icons-and-rebuild-platform-assets/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_05_verify-app-icons-and-rebuild-platform-assets/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_05_verify-app-icons-and-rebuild-platform-assets/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_12_brand_alignment/Steps/Step_05_verify-app-icons-and-rebuild-platform-assets/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-29
- Next action: Start STEP-12-05.
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
