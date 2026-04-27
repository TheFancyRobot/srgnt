# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- The repo already has a real Playwright + Electron harness, but the current follow-up work is still living only as a note inside a completed STEP-14-09 session. This step turns that informal handoff into executable backlog.
- The current UI coverage is strong on functional flows and DOM/style assertions, but it still lacks a deliberate coverage matrix for every user-facing surface and does not yet use stable screenshot baselines via `expect(...).toHaveScreenshot(...)`.
- This step reduces the risk that layout regressions, focus regressions, keyboard-navigation issues, and Electron-only rendering bugs slip past jsdom/Vitest tests.

## Prerequisites

- Read [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]] and [[02_Phases/Phase_14_notes_view/Steps/Step_10_autosave-hardening-conflict-recovery-e2e|STEP-14-10 Autosave Hardening + Conflict Recovery + E2E]] to understand the existing Electron E2E posture.
- Review [[05_Sessions/2026-04-12-072442-whole-workspace-markdown-search-with-bounded-indexing-team-lead|SESSION-2026-04-12-072442]] for the origin of this follow-up request.
- Use a shell that can launch Electron windows; if team spawning is needed, a terminal-adapter-backed environment is required because this shell returned `No terminal adapter detected`.
- Before changing tests, run from `packages/desktop/` or via workspace filters so build and Playwright commands resolve correctly.

## Relevant Code Paths

- `packages/desktop/playwright.config.ts` - Playwright runner configuration for Electron E2E.
- `packages/desktop/e2e/fixtures.ts` - shared Electron launch, temporary `userDataDir`, onboarding helper flows.
- `packages/desktop/e2e/app.spec.ts` - broad app-level Electron tests across onboarding, navigation, notes flows, search, slash commands, persistence, and renderer security.
- `packages/desktop/e2e/gfm-compliance.spec.ts` - visual/interaction coverage for markdown rendering behaviors in the real Electron renderer.
- `packages/desktop/e2e/packaged.spec.ts` - packaged Linux smoke test.
- `packages/desktop/package.json` - E2E scripts; note that `test:e2e` currently targets only `e2e/app.spec.ts`.
- `packages/desktop/src/renderer/components/**` and `packages/desktop/src/renderer/styles.css` - UI surfaces most likely to need screenshot baselines and richer interactive assertions.

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_11_add-playwright-electron-interactive-ui-validation-matrix-and-visual-regression-coverage|STEP-14-11 Add Playwright/Electron interactive UI validation matrix and visual regression coverage]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
