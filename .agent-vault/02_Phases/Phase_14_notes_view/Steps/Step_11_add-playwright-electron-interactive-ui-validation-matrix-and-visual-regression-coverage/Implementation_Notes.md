# Implementation Notes

- `packages/desktop/e2e/fixtures.ts` already provides a solid Electron harness: each test gets an isolated temporary `userDataDir`, launches Electron with `SRGNT_E2E=1` and `SRGNT_USER_DATA_PATH`, and exposes helpers for `waitForDesktopReady` and `completeOnboarding`.
- `packages/desktop/playwright.config.ts` is already suitable for CI smoke runs: retries in CI, traces on first retry, screenshots on failure, videos retained on failure.
- `pnpm --filter @srgnt/desktop exec playwright test --list` currently reports **44 tests across 3 spec files**: `app.spec.ts`, `gfm-compliance.spec.ts`, and `packaged.spec.ts`.
- `packages/desktop/package.json` under-runs the available suite today: `test:e2e` only executes `e2e/app.spec.ts`, so `gfm-compliance.spec.ts` and `packaged.spec.ts` are not part of the default E2E path.
- The existing suite already covers many Notes flows: tab indentation, live-preview toggle, arrow-key navigation, code block styling, note creation/autosave persistence, slash commands, wikilink navigation, search, and horizontal rules.
- The existing suite also covers broader app smoke areas: onboarding, cross-surface navigation, connector status toggling, terminal startup/CSP safety, settings persistence, crash diagnostics, preload API behavior, and packaged Linux launch.
- The current suite uses DOM/style assertions and artifact screenshots written with `page.screenshot(...)`, but it does **not** currently use Playwright screenshot baselines (`toHaveScreenshot`) for stable visual regression checks.
- Likely coverage gaps for a dedicated UI matrix remain around exact layout/styling verification for titlebar, side-panel variants, settings subpanels, Today panel, connector card layout, focus rings, spacing, and responsive/window-size behaviors.
- Use this step to decide whether screenshot assertions should be page-level, component-region-level, or both.

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_11_add-playwright-electron-interactive-ui-validation-matrix-and-visual-regression-coverage|STEP-14-11 Add Playwright/Electron interactive UI validation matrix and visual regression coverage]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
