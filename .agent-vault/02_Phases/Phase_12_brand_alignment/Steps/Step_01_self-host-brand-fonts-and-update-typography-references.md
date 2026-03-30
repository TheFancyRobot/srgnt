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

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: The desktop app self-hosts Barlow (400/500/600/700) and JetBrains Mono (400) woff2 fonts with proper @font-face declarations, and every font-family reference in CSS, Tailwind config, and component code uses the brand-correct stack (Barlow for display/body, JetBrains Mono for mono). Also create a symlink to the living BRAND_GUIDE.md.
- Parent phase: [[02_Phases/Phase_12_brand_alignment/Phase|Phase 12 brand alignment]].

## Why This Step Exists

- The desktop app currently uses Sora (display) and DM Sans (body), neither of which appear in the BRAND_GUIDE. The brand specifies Barlow for all heading and body text, with JetBrains Mono for code/labels/logo.
- Fonts are currently assumed to be system-installed, which means they may not render at all on machines without those fonts. Self-hosting eliminates this fragility.
- This is a foundational step — Step 03 (titlebar logo) needs JetBrains Mono reliably loaded, and Step 04 (component sweep) needs the font stacks already correct.

## Prerequisites

- Font files exist at `~/dev/srgnt-website/public/fonts/`:
  - `barlow-latin-400-normal.woff2`
  - `barlow-latin-500-normal.woff2`
  - `barlow-latin-600-normal.woff2`
  - `barlow-latin-700-normal.woff2`
  - `jetbrains-mono-latin-400-normal.woff2`
- The BRAND_GUIDE lives at `~/dev/srgnt-website/BRAND_GUIDE.md`.
- No prior steps required.

## Relevant Code Paths

- `packages/desktop/src/renderer/styles.css` — body font-family (line 114), .btn font-family (line 152), .input font-family (line 262), .section-heading font-family (line 455), .font-display utility (line 573), .font-mono-data utility (line 577)
- `packages/desktop/tailwind.config.js` — fontFamily config (lines 74-78)
- `packages/desktop/src/renderer/` — new `fonts/` directory for woff2 files
- `~/dev/srgnt-website/src/styles/global.css` (lines 8-53) — reference @font-face declarations to mirror
- `~/dev/srgnt-website/BRAND_GUIDE.md` (lines 329-337) — typography direction spec

## Required Reading

- [[01_Architecture/System_Overview|System Overview]]
- `~/dev/srgnt-website/BRAND_GUIDE.md` — Typography direction section (lines 329-337)
- `~/dev/srgnt-website/src/styles/global.css` — @font-face declarations (lines 8-53) and CSS variable font stacks (lines 101-103)
- `packages/desktop/src/renderer/styles.css` — current font references
- `packages/desktop/tailwind.config.js` — current fontFamily config

## Execution Prompt

1. Read `~/dev/srgnt-website/BRAND_GUIDE.md` (Typography direction section) and `~/dev/srgnt-website/src/styles/global.css` (@font-face declarations) before making changes.
2. Create a symlink at `docs/BRAND_GUIDE.md` → `~/dev/srgnt-website/BRAND_GUIDE.md`. Add it to `.gitignore` if needed (symlink targets outside the repo should not be committed as-is; consider a relative path if the repos are siblings, e.g., `../../srgnt-website/BRAND_GUIDE.md`).
3. Copy the five woff2 font files from `~/dev/srgnt-website/public/fonts/` into `packages/desktop/src/renderer/fonts/` (create the directory).
4. Add @font-face declarations to the top of `packages/desktop/src/renderer/styles.css` (inside `@layer base`, before `:root`), mirroring the pattern in the website's global.css. Use `font-display: swap` for all faces.
5. Update `packages/desktop/tailwind.config.js` fontFamily:
   - `display`: `['Barlow', 'ui-sans-serif', 'system-ui', 'sans-serif']`
   - `sans`: `['Barlow', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif']`
   - `mono`: `['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Fira Code', 'monospace']`
6. Update all hardcoded font-family declarations in styles.css:
   - `body` (line 114): change `'DM Sans'` → `'Barlow'`
   - `.btn` (line 152): change `'DM Sans'` → `'Barlow'`
   - `.input` (line 262): change `'DM Sans'` → `'Barlow'`
   - `.section-heading` (line 455): change `'Sora', 'DM Sans'` → `'Barlow'`
   - `.font-display` (line 573): change `'Sora', 'DM Sans'` → `'Barlow'`
7. Verify: run `pnpm --filter desktop build` (or the renderer dev server) and confirm fonts load without 404s. Check that JetBrains Mono still renders in mono contexts and Barlow renders for body/heading text.
8. Search the entire renderer source for any remaining references to `Sora` or `DM Sans` and remove them.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-29
- Next action: Start STEP-12-01.
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
