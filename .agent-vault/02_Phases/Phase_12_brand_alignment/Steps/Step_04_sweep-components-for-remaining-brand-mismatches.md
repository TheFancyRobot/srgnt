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

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: No renderer component contains hardcoded references to Sora, DM Sans, or the old amber/gold color values. Every brand-touching style flows through CSS variables or Tailwind utilities that resolve to the updated brand tokens. Button text contrast on the violet primary is verified.
- Parent phase: [[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]].

## Why This Step Exists

- Steps 01 and 02 update the centralized CSS variables and Tailwind config, but some components may bypass CSS variables with hardcoded font-family strings, inline styles, or direct hex color references. This sweep catches anything that was missed.
- The `.btn-primary` text color was previously `#0c1121` (dark text on amber). With a violet gradient background, white text may be needed for contrast. This step is the right place to verify and fix contrast issues introduced by the palette change.

## Prerequisites

- Steps 01 and 02 must be complete — the canonical fonts and colors are already in place. This step is about catching stragglers.

## Relevant Code Paths

- `packages/desktop/src/renderer/components/` — all `.tsx` files
- `packages/desktop/src/renderer/styles.css` — verify no remaining amber hex values
- `packages/desktop/tailwind.config.js` — verify color mappings
- Search targets: `Sora`, `DM Sans`, `#f0b429`, `#d49b0a`, `#b07b06`, `#8c5a09`, `#f5cb44`, `#fef9ec`, `240, 180, 41`, `brass`, `amber`, `gold` (any of these appearing in renderer code is a miss)

## Required Reading

- [[01_Architecture/System_Overview|System Overview]]
- `~/dev/srgnt-website/BRAND_GUIDE.md` — for reference when deciding replacement values
- `packages/desktop/src/renderer/styles.css` — the updated styles after Steps 01+02

## Execution Prompt

1. Run a comprehensive search across `packages/desktop/src/renderer/` for any remaining references to old brand values:
   - Font names: `Sora`, `DM Sans`
   - Amber hex values: `#fef9ec`, `#fcefc4`, `#f9df84`, `#f5cb44`, `#f0b429`, `#d49b0a`, `#b07b06`, `#8c5a09`, `#74480e`, `#623b11`, `#391e05`
   - Amber RGB: `240, 180, 41` or similar
   - Any inline `style=` attributes that set font-family or color directly
2. For each match, determine whether it should:
   - Be replaced with a CSS variable reference (preferred)
   - Be replaced with a Tailwind utility class
   - Be updated to the correct brand value
3. Specifically check `.btn-primary` text color. With a violet gradient background (#b794f6 → #9b7bda range), the text needs to be either white or very dark. Test contrast ratio — WCAG AA requires 4.5:1 for normal text. If `#0c1121` (near-black) doesn't meet contrast on violet, switch to `#ffffff` or `#0c0c10`.
4. Check `.card-brand`, `.badge-brand`, `.border-brand`, `.surface-brand` — these all referenced amber-derived values. Verify they now resolve to violet-derived values and still look intentional.
5. Check `.nav-item.active` — it used `--color-surface-brand` and `--color-text-brand`. Verify the active nav state still looks distinct and readable with the new palette.
6. Check the sidebar gradient-icon box (if it survived Step 03's logo removal). It used `from-srgnt-400 to-srgnt-600` which would now be violet. If the box was removed with the logo, confirm no orphan references remain.
7. Verify: build passes (`pnpm --filter desktop build`). Visually scan every screen for any remaining amber/gold artifacts or font mismatches.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-29
- Next action: Start STEP-12-04.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
