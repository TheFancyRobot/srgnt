---
note_type: bug
template_version: 2
contract_version: 1
title: Desktop dev startup is blocked by TypeScript errors in main-process test files
bug_id: BUG-0015
status: closed
severity: sev-3
category: logic
reported_on: '2026-04-13'
fixed_on: '2026-04-13'
owner: ''
created: '2026-04-13'
updated: '2026-04-13'
related_notes:
  - '[[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]'
  - '[[02_Phases/Phase_08_product_hardening/Steps/Step_01_ship-packaging-update-and-distribution-pipeline|STEP-08-01 Ship Packaging Update And Distribution Pipeline]]'
  - '[[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]]'
  - '[[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]]'
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_09_whole-workspace-markdown-search-with-bounded-indexing|STEP-14-09 Whole-workspace markdown search with bounded indexing]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[04_Decisions/DEC-0012_default-crash-reporting-to-local-only-redacted-logs|DEC-0012 Default crash reporting to local-only redacted logs]]'
  - '[[05_Sessions/2026-04-12-072442-whole-workspace-markdown-search-with-bounded-indexing-team-lead|SESSION-2026-04-12-072442 team-lead session for Whole-workspace markdown search with bounded indexing]]'
  - '[[05_Sessions/2026-04-13-042410-whole-workspace-markdown-search-with-bounded-indexing-team-lead|SESSION-2026-04-13-042410 team-lead session for Playwright UI testing follow-up from whole-workspace markdown search]]'
tags:
  - agent-vault
  - bug
---

# BUG-0015 - Desktop dev startup is blocked by TypeScript errors in main-process test files

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Desktop dev startup is blocked by TypeScript errors in main-process test files.
- Related notes: [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]], [[02_Phases/Phase_08_product_hardening/Steps/Step_01_ship-packaging-update-and-distribution-pipeline|STEP-08-01 Ship Packaging Update And Distribution Pipeline]], [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]], [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]], [[02_Phases/Phase_14_notes_view/Steps/Step_09_whole-workspace-markdown-search-with-bounded-indexing|STEP-14-09 Whole-workspace markdown search with bounded indexing]], [[01_Architecture/System_Overview|System Overview]], [[04_Decisions/DEC-0012_default-crash-reporting-to-local-only-redacted-logs|DEC-0012 Default crash reporting to local-only redacted logs]], [[05_Sessions/2026-04-12-072442-whole-workspace-markdown-search-with-bounded-indexing-team-lead|SESSION-2026-04-12-072442 team-lead session for Whole-workspace markdown search with bounded indexing]], [[05_Sessions/2026-04-13-042410-whole-workspace-markdown-search-with-bounded-indexing-team-lead|SESSION-2026-04-13-042410 team-lead session for Playwright UI testing follow-up from whole-workspace markdown search]].
- Running `pnpm dev` in `packages/desktop` fails before Electron starts because `build:main` type-checks test files and hits 18 TypeScript errors across `crash.test.ts`, `notes-ipc.test.ts`, `notes.test.ts`, and `pty/node-pty-service.test.ts`.
- The failures appear to be stale or inconsistent test typings rather than runtime application code errors, but they still block the desktop dev workflow completely.

## Observed Behavior

- `pnpm dev` in `packages/desktop` stops during `pnpm run build:main` and never launches Vite or Electron.
- `tsc -p tsconfig.main.json` reports 18 errors in four main-process test files.
- Representative failures:
  - `src/main/crash.test.ts`: missing `isOptedOut` property and nested telemetry properties inferred as `unknown`
  - `src/main/notes-ipc.test.ts`: incorrect tuple typing for `mockHandle.mock.calls.map(...)`
  - `src/main/notes.test.ts`: broken `vi.hoisted` mock shape plus unused imports
  - `src/main/pty/node-pty-service.test.ts`: invalid import of non-exported `PtyProcess` and many `spawn(...)` calls missing required `args` / `env` fields
- Because `pnpm dev` starts with `build:main`, the desktop app cannot be started in the normal local development path until these test-type errors are fixed or excluded from the build path.

## Expected Behavior

- `pnpm dev` should complete `build:main` and `build:preload`, start Vite, and then launch Electron normally.
- Main-process test files should either type-check cleanly under the current contracts or be excluded from the dev build path if that is the intended project policy.
- Changes to test files should never silently break the standard desktop developer startup flow.

## Reproduction Steps

1. From the repo root, run `pnpm --filter @srgnt/desktop dev` or from `packages/desktop`, run `pnpm dev`.
2. Wait for the `build:main` step (`tsc -p tsconfig.main.json`) to run.
3. Observe that the command exits with TypeScript errors before Vite or Electron starts.
4. Confirm the failing files are:
   - `src/main/crash.test.ts`
   - `src/main/notes-ipc.test.ts`
   - `src/main/notes.test.ts`
   - `src/main/pty/node-pty-service.test.ts`

## Scope / Blast Radius

- Affects the desktop package local developer workflow directly.
- Blocks any contributor trying to run the Electron app through the standard `pnpm dev` command.
- Touches crash-reporting tests, notes IPC/service tests, and PTY service tests, so the breakage crosses multiple main-process domains rather than one isolated feature.
- High workflow impact even if production bundles are otherwise healthy, because the default local startup path is unusable.

## Suspected Root Cause

- Test files drifted out of sync with current TypeScript types and module exports after recent coverage/test additions.
- At least one failure (`notes-ipc.test.ts`) aligns with the prior session note that a redundant subagent introduced a broken `notes-ipc.test.ts` and it had to be reverted, suggesting follow-on test churn in this area.
- The PTY contract appears to have become stricter (`args` and `env` now effectively required in the inferred test call sites), while the tests were not updated to construct valid spawn payloads.
- `build:main` is currently type-checking test files, so test-only typing regressions now break dev startup instead of being isolated to `vitest` / `typecheck` workflows.

## Confirmed Root Cause

- Not fully confirmed yet.
- Current evidence points to stale test typings and mock definitions, not application runtime code, based on the concrete compiler errors captured from `pnpm dev` / `tsc -p tsconfig.main.json`.
- The bug should remain in investigation until each failing file is reconciled against the current exported types and test-build policy.
**Root cause (confirmed)**: Two separate issues compounded:

1. **tsconfig.main.json included test files in the build path**. The `include` glob `src/main/**/*` matched `*.test.ts` files, which use vitest APIs not available in the production build. Test files should never be type-checked by the production tsconfig.

2. **Stale/inconsistent test typings across 4 files** from recent rapid development. The source code contracts (e.g. `PtyProcessOptions` schema defaults, `CrashReporter` interface vs concrete class, mock shapes) had drifted from what the tests assumed.

**Fixes applied**:

- **tsconfig.main.json**: Added `src/**/*.test.ts` and `src/**/*.spec.ts` to `exclude` array so `build:main` never type-checks test files.

- **crash.test.ts** (2 errors fixed):
  - Line 85: Cast `createCrashReporter()` to `ElectronCrashReporter` to access the concrete class's `isOptedOut` getter (not on the `CrashReporter` interface).
  - Line 159: Cast nested `properties.config` to `Record<string, unknown>` before accessing `session_id` (avoids `unknown` index error).

- **notes-ipc.test.ts** (1 error fixed):
  - Line 59: Changed `(call: [string]) => call[0]` to `(call) => call[0] as string` to match the actual 2-element tuple type of `mockHandle.mock.calls`.

- **notes.test.ts** (3 errors fixed):
  - Removed unused `ipcChannels` import.
  - Removed unused `registerNotesHandlers` import.
  - Fixed `vi.hoisted()` mock shape: returned `{ mockHandle, mockRemoveHandler }` and used them in a separate `vi.mock('electron', ...)` call, matching the working pattern from `notes-ipc.test.ts`.

- **node-pty-service.test.ts** (13 errors fixed):
  - Fixed import: `PtyProcess` imported from `./contracts.js` instead of `./session-manager.js` (not exported from there).
  - Added required `args: []` and `env: {}` fields to all 10 `service.spawn()` calls (the `PtyProcessOptions` schema makes these required in the output type).

**Verification**: `npx tsc -p tsconfig.main.json --noEmit` passes with 0 errors. All 647 tests pass across 40 test files.

## Workaround

- No safe project-approved workaround documented yet.
- A developer may be able to run narrower commands that do not type-check these files, but that does not restore the documented `pnpm dev` workflow and should not be treated as a fix.

## Permanent Fix Plan

- Fix the stale test typings and mocks in the four failing files.
- Reconcile PTY test payloads with the current spawn contract.
- Decide whether `build:main` should continue to include `*.test.ts` files; if yes, keep tests build-clean, and if not, update TS config boundaries explicitly.
- Validate with at least:
  - `pnpm --filter @srgnt/desktop dev`
  - `pnpm --filter @srgnt/desktop typecheck`
  - targeted Vitest coverage for the repaired files

## Regression Coverage Needed

- Add or keep a validation path that exercises the real desktop dev startup command, not only unit tests.
- Ensure future test additions in `src/main/**/*.test.ts` are covered by a typecheck path consistent with the repo's dev workflow.
- Consider a CI check that fails when `pnpm --filter @srgnt/desktop dev` bootstrap prerequisites are broken, or at minimum when `tsc -p tsconfig.main.json` fails because of test-only type drift.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]
- Also related: [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]]
- Steps: [[02_Phases/Phase_08_product_hardening/Steps/Step_01_ship-packaging-update-and-distribution-pipeline|STEP-08-01 Ship Packaging Update And Distribution Pipeline]], [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]], [[02_Phases/Phase_14_notes_view/Steps/Step_09_whole-workspace-markdown-search-with-bounded-indexing|STEP-14-09 Whole-workspace markdown search with bounded indexing]]
- Architecture: [[01_Architecture/System_Overview|System Overview]]
- Decision: [[04_Decisions/DEC-0012_default-crash-reporting-to-local-only-redacted-logs|DEC-0012 Default crash reporting to local-only redacted logs]]
- Sessions: [[05_Sessions/2026-04-12-072442-whole-workspace-markdown-search-with-bounded-indexing-team-lead|SESSION-2026-04-12-072442 team-lead session for Whole-workspace markdown search with bounded indexing]], [[05_Sessions/2026-04-13-042410-whole-workspace-markdown-search-with-bounded-indexing-team-lead|SESSION-2026-04-13-042410 team-lead session for Playwright UI testing follow-up from whole-workspace markdown search]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-13 - Reported.
<!-- AGENT-END:bug-timeline -->
- 2026-04-13 - Reported.
- 2026-04-13 - Fixed: excluded test files from tsconfig.main.json, fixed all 19 TS errors across 4 test files. Verified tsc passes and all 647 tests green.
