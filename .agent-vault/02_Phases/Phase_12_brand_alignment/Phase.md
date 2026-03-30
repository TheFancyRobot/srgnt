---
note_type: phase
template_version: 2
contract_version: 1
title: Brand Alignment
phase_id: PHASE-12
status: completed
owner: ''
created: '2026-03-29'
updated: '2026-03-29'
depends_on:
  - '[[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]'
related_architecture: '[[01_Architecture/System_Overview|System Overview]]'
related_decisions: []
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 12 Brand Alignment

Align the desktop app's visual identity — typography, color palette, logo, and iconography — with the canonical BRAND_GUIDE.md so the product looks and feels like the same brand as the website.

## Objective

- Make the desktop app visually consistent with `~/dev/srgnt-website/BRAND_GUIDE.md`: self-hosted Barlow + JetBrains Mono typography, luminous-violet accent palette over graphite/carbon surfaces, and the anaglyph "srgnt" wordmark in the titlebar.

## Why This Phase Exists

- The desktop app currently uses a different font stack (Sora / DM Sans), a different accent palette (warm amber/gold), and places the logo in the sidebar as a lightning-bolt icon. None of this matches the brand guide or the website.
- Shipping the product with a mismatched visual identity undermines trust and coherence. This phase corrects the divergence before the product reaches more users.
- The brand guide is a living document at `~/dev/srgnt-website/BRAND_GUIDE.md` — it must be referenced, not copied.

## Scope

- Self-host Barlow (400/500/600/700) and JetBrains Mono (400) woff2 fonts in the desktop app.
- Replace the entire CSS custom-property color system (brand palette, surfaces, text, borders, accents, shadows, status tones) to match the BRAND_GUIDE.
- Move the logo from the sidebar to the titlebar, rendering it as a JetBrains Mono text wordmark with the signature cyan/red anaglyph text-shadow.
- Audit and fix any hardcoded font-family or color values in components that bypass CSS variables.
- Verify and rebuild platform icon assets (ICO, ICNS, PNG) from the existing SVG sources.

## Non-Goals

- Adding new features, screens, or functionality.
- Redesigning layout structure, navigation hierarchy, or information architecture.
- Changing the dark/light mode toggle behavior or adding new theme variants.
- Touching sync, premium, or runtime code.

## Dependencies

- Depends on [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]] (product is shippable; now we dress it correctly).
- The canonical brand reference is `~/dev/srgnt-website/BRAND_GUIDE.md` — a symlink will be created inside this repo for convenience but the source file must not be copied.
- Font assets can be copied from `~/dev/srgnt-website/public/fonts/` (Barlow + JetBrains Mono woff2 files already exist there).
- This phase is logically positioned before PHASE-09 (Sync Preparation) in execution priority but does not block it.

## Acceptance Criteria

- [ ] Barlow and JetBrains Mono are self-hosted in the desktop app with correct @font-face declarations and all font-family references updated.
- [ ] The full CSS custom-property color system matches BRAND_GUIDE: graphite/carbon/ink surfaces, warm bone/stone text, luminous violet primary accent (#b794f6), steel blue secondary (#85acc6), branded semantic tones.
- [ ] The "srgnt" wordmark appears in the titlebar with the anaglyph text-shadow treatment, matching the website navbar.
- [ ] No component renders Sora, DM Sans, or the old amber/gold palette.
- [ ] Platform icon assets are verified against BRAND_GUIDE anaglyph spec and regenerated.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]
- Current phase status: planned
- Next phase: not planned yet.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- None yet.
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- None yet.
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_12_brand_alignment/Steps/Step_01_self-host-brand-fonts-and-update-typography-references|STEP-12-01 Self-host brand fonts and update typography references]]
- [ ] [[02_Phases/Phase_12_brand_alignment/Steps/Step_02_replace-color-system-with-brand-palette|STEP-12-02 Replace color system with brand palette]]
- [ ] [[02_Phases/Phase_12_brand_alignment/Steps/Step_03_move-anaglyph-logo-to-titlebar|STEP-12-03 Move anaglyph logo to titlebar]]
- [ ] [[02_Phases/Phase_12_brand_alignment/Steps/Step_04_sweep-components-for-remaining-brand-mismatches|STEP-12-04 Sweep components for remaining brand mismatches]]
- [ ] [[02_Phases/Phase_12_brand_alignment/Steps/Step_05_verify-app-icons-and-rebuild-platform-assets|STEP-12-05 Verify app icons and rebuild platform assets]]
<!-- AGENT-END:phase-steps -->

## Notes

- The BRAND_GUIDE is a living document at `~/dev/srgnt-website/BRAND_GUIDE.md`. It must be referenced (via symlink), never copied into the repo. If the guide changes, the desktop app should reflect those changes on the next branding pass.
- The website implementation at `~/dev/srgnt-website/src/` serves as the reference implementation for how brand tokens translate to code. Key files: `src/styles/global.css` (colors, fonts), `src/components/Nav.astro` (logo treatment).
- The existing icon.svg and logo-full.svg already use the correct anaglyph treatment (cyan #00B7FF / red #FF2A3D over JetBrains Mono 800). These should not need changes, only verification and platform icon rebuilds.
- Light mode palette: The brand guide is dark-first. The light mode should be a reasonable complement (high contrast, clean surfaces) but dark mode is the primary design surface.
- Parallel work map: Steps 01 and 02 can run in parallel (fonts and colors are independent). Step 03 depends on Step 01 (needs JetBrains Mono self-hosted for the titlebar logo). Step 04 depends on Steps 01 + 02. Step 05 depends on Step 02 (need final color decisions before verifying icons).
