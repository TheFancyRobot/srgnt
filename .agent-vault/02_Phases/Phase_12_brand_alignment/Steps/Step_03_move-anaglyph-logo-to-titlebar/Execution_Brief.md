# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- The desktop app currently places a lightning-bolt icon in an amber gradient box in the sidebar, which matches neither the brand guide nor the website. The brand identity is the "srgnt" text wordmark with the anaglyph 3D effect.
- Moving the logo to the titlebar matches standard desktop app patterns (VS Code, Slack, etc.) and frees sidebar space. The website's Nav.astro shows the exact CSS implementation to mirror.

## Prerequisites

- Step 01 must be complete — JetBrains Mono must be self-hosted and loading correctly for the titlebar text to render with the correct font.
- The Titlebar component already exists at `packages/desktop/src/renderer/components/Titlebar.tsx` with an empty left drag area that can host the logo.

## Relevant Code Paths

- `packages/desktop/src/renderer/components/Titlebar.tsx` — add the logo to the left side of the titlebar
- `packages/desktop/src/renderer/components/Navigation.tsx` (lines 155-170) — remove the brand header block (lightning bolt + "srgnt" text + date)
- `packages/desktop/src/renderer/styles.css` — add new `.titlebar-logo` CSS class with anaglyph text-shadow
- `~/dev/srgnt-website/src/components/Nav.astro` (lines 137-155) — reference implementation of the anaglyph CSS effect

## Execution Prompt

1. Read the website's `Nav.astro` (lines 137-155) to understand the anaglyph CSS pattern. The key is a multi-layer `text-shadow`:
   - Cyan layer: `rgba(0, 183, 255, 0.7)` offset `-2px 0`
   - Red layer: `rgba(255, 42, 61, 0.7)` offset `2px 0`
   - Hover: increase opacity to `0.75`
2. In `Titlebar.tsx`, replace the empty left spacer (`<div className="flex-1 h-full" />`) with a logo element:
   - Add a `<span>` or `<div>` with class `titlebar-logo no-drag` containing the text "srgnt"
   - The element should be left-aligned with small left padding (~12px)
   - The remaining space should still be a drag region
   - Keep the right-side window controls unchanged
3. In `styles.css`, add a `.titlebar-logo` class:
   - `font-family: 'JetBrains Mono', ui-monospace, monospace`
   - `font-weight: 700`
   - `font-size: 0.875rem` (14px — scaled down from website's 1.5rem to fit the 36px titlebar)
   - `letter-spacing: -0.03em`
   - `color: var(--color-text-primary)`
   - `text-shadow: -2px 0 rgba(0, 183, 255, 0.7), 2px 0 rgba(255, 42, 61, 0.7)`
   - `transition: text-shadow 200ms ease`
   - Hover state: increase shadow opacity to `0.75`
   - Cursor: `default` (it's a title, not a link)
4. In `Navigation.tsx`, remove the brand header block (lines 156-170) — the entire `<div className="p-4 pb-3 border-b border-border-muted">` containing the logo icon, "srgnt" text, and date. If the date display is still wanted somewhere, it can be moved to the main content area or kept as a small element in the sidebar, but the brand logo block must go.
5. Verify: the titlebar should now show "srgnt" on the left with the anaglyph glow effect, window controls on the right, and the sidebar should start directly with navigation items.
6. Check that the `.drag-region` behavior is preserved — the titlebar should still be draggable except over the logo text and window control buttons.
7. Run any existing Titlebar or Navigation tests to confirm nothing breaks.

## Related Notes

- Step: [[02_Phases/Phase_12_brand_alignment/Steps/Step_03_move-anaglyph-logo-to-titlebar|STEP-12-03 Move anaglyph logo to titlebar]]
- Phase: [[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]]
