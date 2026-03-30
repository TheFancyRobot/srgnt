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

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Every CSS custom property in the desktop app's color system matches the BRAND_GUIDE palette. Dark mode uses graphite/carbon/ink surfaces, warm bone/stone text, luminous violet primary accent (#b794f6), steel blue secondary (#85acc6), and branded semantic tones. Light mode is updated to complement the brand direction. The `srgnt-*` Tailwind color scale is rewritten from amber/gold to a violet scale.
- Parent phase: [[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]].

## Why This Step Exists

- The desktop app currently uses a warm amber/gold ("brass insignia") palette with deep navy surfaces. The BRAND_GUIDE specifies luminous violet accent over graphite/carbon/ink surfaces with warm bone/stone text. Every surface, text color, border, shadow, and accent in the app is wrong.
- Colors are the single largest visual contributor to brand perception. Until the palette is correct, nothing else looks right.
- Can run in parallel with Step 01 (fonts) since CSS variables and font declarations don't interfere.

## Prerequisites

- No prior steps required — this can start immediately or in parallel with Step 01.
- Read the BRAND_GUIDE color direction and the website's CSS before editing.

## Relevant Code Paths

- `packages/desktop/src/renderer/styles.css` — ALL CSS custom properties (lines 6-141): `:root` (light mode), `.dark` (dark mode), `::selection`, `.dark ::selection`, `.surface-gradient`, `.dark .surface-gradient`, `--shadow-glow`
- `packages/desktop/tailwind.config.js` — `colors.srgnt` scale (lines 10-22), status color mappings
- `~/dev/srgnt-website/src/styles/global.css` (lines 57-99) — reference dark mode color implementation

## Required Reading

- [[01_Architecture/System_Overview|System Overview]]
- `~/dev/srgnt-website/BRAND_GUIDE.md` — Color direction section (lines 315-327) and Visual direction section (lines 276-302)
- `~/dev/srgnt-website/src/styles/global.css` — CSS variable color definitions (lines 57-99): the website's dark palette is the canonical reference implementation
- `packages/desktop/src/renderer/styles.css` — current color system to understand what needs replacing

## Execution Prompt

1. Read the BRAND_GUIDE Color direction (lines 315-327) and the website's global.css color variables (lines 57-99) before editing.
2. Rewrite the `--color-srgnt-*` brand palette in `:root` from amber/gold to a luminous violet scale. Generate a full 50-950 scale centered on `#b794f6` (500). The scale should feel cohesive — lighter tints toward white/lavender, darker shades toward deep purple/indigo.
3. Rewrite dark mode (`.dark`) CSS variables to match the BRAND_GUIDE:
   - Surfaces: `--color-surface-primary: #0c0c10`, `--color-surface-secondary: #131318`, `--color-surface-tertiary: #1b1b22`, `--color-surface-elevated: #1b1b22` (or slightly lighter), `--color-surface-brand: rgba(183, 148, 246, 0.06)`
   - Text: `--color-text-primary: #e2e0db`, `--color-text-secondary: #b0ada4`, `--color-text-tertiary` (slightly dimmer than secondary), `--color-text-brand: #b794f6`
   - Borders: derive from surface tones (e.g., `#2a2a34` for default, slightly darker for muted, slightly lighter for strong, `rgba(183, 148, 246, 0.25)` for brand)
   - Status: success `#7bb88e`, warning `#e0b45e`, danger `#ec8e84` (per BRAND_GUIDE semantic tones)
4. Update light mode `:root` variables to complement the brand. Use clean neutral surfaces (white / warm off-white) with the violet accent as the primary color. Ensure sufficient contrast for accessibility.
5. Update `--shadow-glow` from amber-based to violet-based: e.g., `0 0 24px rgba(183, 148, 246, 0.15)`.
6. Update `::selection` colors to use the violet palette instead of amber.
7. Update `.surface-gradient` and `.dark .surface-gradient` to use the new surface tones with a subtle violet tint instead of amber.
8. Update `.btn-primary` gradient if it references `srgnt-500`/`srgnt-600` — the gradient will automatically pick up new colors via CSS variables, but verify the text color on primary buttons has adequate contrast against violet (may need white text instead of dark).
9. Verify: run the dev server and visually confirm dark mode surfaces are graphite (not navy), text is warm (not blue-gray), accent is violet (not amber). Check buttons, cards, badges, nav items, focus rings, and status indicators all look correct.
10. Search the entire styles.css for any remaining hardcoded amber/gold hex values (e.g., `#f0b429`, `#d49b0a`, `240, 180, 41`) and replace with violet equivalents.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-29
- Next action: Start STEP-12-02.
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
