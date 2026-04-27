# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- The existing SVG icons already use the anaglyph treatment with cyan (#00B7FF) and red (#FF2A3D) over JetBrains Mono, which appears correct per the brand guide. However, the platform-specific raster icons (ICO, ICNS, PNG) were generated from these SVGs at an earlier point and may need regenerating after any SVG tweaks.
- This is the final verification step — confirming icon consistency across the app, taskbar, dock, and installer before the phase is done.

## Prerequisites

- Step 02 must be complete — final color decisions are settled so we can verify icons don't conflict with the palette.
- The `icon-gen` package (v5.0.0) is available in devDependencies.
- JetBrains Mono must be available on the build machine for SVG-to-raster conversion (the font is referenced in the SVGs).

## Relevant Code Paths

- `packages/desktop/build/icon.svg` — the 1024x1024 app icon source (single "S" with anaglyph)
- `packages/desktop/build/logo-full.svg` — the 1600x600 full wordmark source ("srgnt" with anaglyph)
- `packages/desktop/scripts/build-icons.sh` — the script that generates platform icons
- `~/dev/srgnt-website/public/favicon.svg` — the website's favicon for comparison
- `~/dev/srgnt-website/BRAND_GUIDE.md` — Logo identity section (lines 305-311)

## Execution Prompt

1. Compare `icon.svg` against the BRAND_GUIDE Logo identity spec:
   - Cyan channel: should be `#00B7FF` at opacity `0.6` (currently `0.62` — decide if this is close enough or should be exactly `0.6`)
   - Red channel: should be `#FF2A3D` at opacity `0.6` (currently `0.62`)
   - Background: `#0c0c10` with rounded corners — check if this matches the brand base dark
   - Font: JetBrains Mono weight 800
   - If any values differ from the spec, update the SVG
2. Compare `logo-full.svg` against the same spec. Same checks.
3. Compare both against the website's `favicon.svg` for consistency. The favicon uses opacity `0.6` (matching spec) and fill `#F0EFEC` for main text vs `#F8F8F8` in the desktop icons — decide if these should be unified. The brand guide doesn't specify the base text color explicitly; `#F0EFEC` is closer to warm bone, `#F8F8F8` is near-white. Consider aligning to `#F0EFEC` or `#e2e0db` (the brand text color) for consistency.
4. Run the icon build script: `cd packages/desktop && bash scripts/build-icons.sh`
   - Verify it generates ICO (Windows), ICNS (macOS), and PNG files at the expected sizes
   - If the script fails due to missing JetBrains Mono on the build machine, note this as a known limitation (SVG text rendering depends on font availability in the rasterization tool)
5. Verify the generated icons visually — spot-check a few PNG sizes to confirm the anaglyph effect renders correctly at small sizes (16px, 32px may lose the effect; this is expected and acceptable).
6. Confirm the electron-builder config references the correct icon paths.

## Related Notes

- Step: [[02_Phases/Phase_12_brand_alignment/Steps/Step_05_verify-app-icons-and-rebuild-platform-assets|STEP-12-05 Verify app icons and rebuild platform assets]]
- Phase: [[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]]
