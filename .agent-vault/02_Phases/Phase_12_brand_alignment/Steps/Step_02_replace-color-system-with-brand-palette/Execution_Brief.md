# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

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

## Related Notes

- Step: [[02_Phases/Phase_12_brand_alignment/Steps/Step_02_replace-color-system-with-brand-palette|STEP-12-02 Replace color system with brand palette]]
- Phase: [[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]]
