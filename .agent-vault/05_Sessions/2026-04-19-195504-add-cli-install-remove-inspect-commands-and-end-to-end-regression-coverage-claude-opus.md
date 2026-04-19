---
note_type: session
template_version: 2
contract_version: 1
title: claude-opus session for Add CLI install remove inspect commands and end-to-end regression coverage
session_id: SESSION-2026-04-19-195504
date: '2026-04-19'
status: completed
owner: claude-opus
branch: phase-20-connector-factory-remote-package-installation
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
related_bugs: []
related_decisions: []
created: '2026-04-19'
updated: '2026-04-19'
tags:
  - agent-vault
  - session
---

# claude-opus session for Add CLI install remove inspect commands and end-to-end regression coverage

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_05_add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage|STEP-20-05 Add CLI install remove inspect commands and end-to-end regression coverage]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_05_add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage|STEP-20-05 Add CLI install remove inspect commands and end-to-end regression coverage]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 19:55 - Created session note.
- 19:55 - Linked related step [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_05_add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage|STEP-20-05 Add CLI install remove inspect commands and end-to-end regression coverage]].
<!-- AGENT-END:session-execution-log -->
- 19:55 - Baseline green: contracts 295/295, connectors 84/84, desktop 892/892.
- 20:02 - Created `packages/desktop/src/main/cli/{workspace,fetch,output,commands,index}.ts` CLI module (no Electron imports, pure Node).
- 20:02 - Added 53 tests across workspace/fetch/output/commands/cli-integration; all passing.
- 20:03 - Added `bin: srgnt-connectors` to `packages/desktop/package.json` and root+desktop `cli:connectors` script wrapper.
- 20:03 - Live smoke test against local http://localhost HTTP server: install/list/inspect/remove all succeed and verification status is `verified`, lifecycle `installed`, checksum recorded.
- 20:04 - Desktop full test suite: 945/945 passing (up from 892, +53). Typecheck clean.
- 15:20 - Resumed Step 05 from an in-progress session. Baseline confirmed green: contracts 295/295, connectors 84/84, desktop 954/954.
- 15:21 - Applied phase-20 naming harmonization: deleted `packages/contracts/src/connectors/installed-package.ts` (parallel, unused schemas using `packageUrl` + a conflicting 5-value `SVerificationStatus`) and removed its re-export from `packages/contracts/src/connectors/index.ts`. Canonical names remain `sourceUrl` (durable record + IPC) and the 3-value `'unverified' | 'verified' | 'failed'` verification status.
- 15:22 - Post-harmonization validation: `pnpm --filter @srgnt/contracts typecheck` clean, `pnpm --filter @srgnt/contracts test` 295/295, `pnpm test` workspace-wide 1853/1853.
- 15:24 - Verified pre-existing typecheck failure in `examples/connectors/jira` (missing `DOM` lib -> `setTimeout`/`fetch` globals). Reproduced on clean checkout; unrelated to Step 05.
- 15:24 - Launched desktop E2E (`pnpm --filter @srgnt/desktop test:e2e`) as the next broad-regression gate.
- 15:36 - Live CLI smoke test against a local HTTP server (port 18729) proved the shipped `dist/main/cli/index.js` for install/list/inspect/remove.
  - install: `installed smoke (smoke@1.0.0)` — verification `verified`, lifecycle `installed`, checksum `1ab9d4d83e26af6c935cece956143d581b627f3db4124b51895a19ce9653324b`.
  - list: table with `smoke smoke@1.0.0 1.0.0 installed verified worker`.
  - inspect: reveals `sourceHost: http://localhost:18729` (host-only, never the full URL), all metadata, no secrets.
  - remove: `removed smoke (smoke@1.0.0)` and subsequent `list` is empty (`no connector packages installed`).
- 15:41 - Resumed Step 05 once more. Identified intermittent flake in `src/main/cli/cli-binary.test.ts` where child-process spawns timed out under heavy concurrent vitest load (default 5s). Added explicit `SPAWN_TIMEOUT_MS = 30_000` to the three spawned-process tests; full `pnpm --filter @srgnt/desktop test` now 954/954 passing.
- 15:42 - Next: run the remaining broad regression gates (`pnpm test`, `pnpm test:e2e`, `pnpm test:e2e:packaged:linux`, `pnpm run release:check:repo`).
- 15:50 - `pnpm test` (full workspace): ALL GREEN. contracts 295/295, runtime 466/466, connectors 84/84, executors 1/1, entitlements 13/13, fred 9/9, sync 27/27, examples/skills/daily-briefing 2/2, examples/connectors/jira 2/2, desktop 954/954 — total 1853/1853 passing.
- 15:51 - Launching `pnpm --filter @srgnt/desktop test:e2e` as the next broad regression gate.
- 16:00 - Detected e2e regression: every real-Electron test hangs and times out at 30s (`firstWindow` never resolves). Unit tests and typecheck all green, so the regression was invisible without running e2e.
- 16:01 - Root-caused: commit aba4be8 (Step 02) introduced `@srgnt/connectors` as a runtime dependency of desktop main, but `packages/connectors/package.json` had `main: "./src/index.ts"`. Node ESM tried to resolve the TypeScript source at runtime and failed on the `./sdk/index.js` import — that file only exists in `packages/connectors/dist/sdk/`, because the `.js` extension in source imports is the TypeScript convention requiring compiled output. Electron main crashed silently during module load with `ERR_MODULE_NOT_FOUND`.
- 16:02 - Fixed `packages/connectors/package.json` to `main: "./dist/index.js"` and `types: "./dist/index.d.ts"`, matching the convention used by `@srgnt/contracts` and `@srgnt/runtime`. Rebuilt `@srgnt/connectors` and `@srgnt/desktop` cleanly.
- 16:03 - Verified single e2e test (`e2e/app.spec.ts:12`) now passes in 3.6s (previously timed out at 30s).
- 16:03 - Launched full desktop e2e suite as the broad regression gate.
- 16:06 - Broad regression gate 1: full workspace `pnpm test` — 1853/1853 passing across 12 packages (contracts 295, runtime 466, connectors 84, entitlements 13, sync 27, fred 9, executors 1, daily-briefing 2, jira 2, desktop 954, plus empty-run packages).
- 16:06 - Broad regression gate 2: `pnpm --filter @srgnt/desktop test:e2e` — 81/81 passing in 2.6 min across app.spec, gfm-compliance.spec, ui-coverage-matrix.spec, bug-0013-visual.spec. First run had timed out at 30s per test; after `packages/connectors/package.json` fix, every test passes.
- 16:11 - Broad regression gate 3: `pnpm --filter @srgnt/desktop test:e2e:packaged:linux` — 2/2 passing (packaged onboarding + BUG-0014 stack-overflow regression). Confirms CLI + host runtime wiring survives into the packaged build path.

## Findings

- Record important facts learned during the session.
- Promote durable information into architecture, bug, or decision notes when appropriate.
- Workspace packages consumed at runtime by the Electron main process MUST expose compiled output via `main: "./dist/index.js"`, not the raw TypeScript source. When source files use the TS convention of `.js` extensions for unbuilt `.ts` siblings, Node ESM cannot resolve them at runtime. `@srgnt/contracts` and `@srgnt/runtime` already follow this convention; `@srgnt/connectors` was the outlier that broke e2e.
- Unit tests did not catch this because vitest resolves TypeScript sources directly; the failure mode only manifests in actual Electron module loading.
- Consider adding an e2e smoke of the built main entry (module-load only, not Playwright-driven) so future workspace-dependency drift fails fast in CI.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- None yet.
<!-- AGENT-END:session-changed-paths -->
- packages/desktop/src/main/cli/workspace.ts (new) — workspace resolution + persistence wrappers
- packages/desktop/src/main/cli/workspace.test.ts (new)
- packages/desktop/src/main/cli/fetch.ts (new) — HTTPS-only package fetcher + sha256 + schema validation
- packages/desktop/src/main/cli/fetch.test.ts (new)
- packages/desktop/src/main/cli/output.ts (new) — text/json formatters, redaction, host-only URL derivation
- packages/desktop/src/main/cli/output.test.ts (new)
- packages/desktop/src/main/cli/commands.ts (new) — pure install/remove/list/inspect command handlers
- packages/desktop/src/main/cli/commands.test.ts (new)
- packages/desktop/src/main/cli/index.ts (new) — argv parsing + top-level runCli dispatch + #! node shebang
- packages/desktop/src/main/cli/cli-integration.test.ts (new) — full install/list/inspect/remove over a temp workspace
- packages/desktop/src/main/cli/cli-binary.test.ts (new) — spawn the compiled dist binary to prove the shipped artifact runs
- packages/desktop/src/main/cli/host-integration.test.ts (new) — CLI-installed record drives ConnectorPackageHost load/activate through the fail-closed handshake, covering CONNECTOR_ID_MISMATCH, SPAWN_FAILED, SDK_UNSUPPORTED, uninstall, restart-recovery
- packages/desktop/package.json (add `bin.srgnt-connectors` + `cli:connectors` script)
- package.json (add root `cli:connectors` wrapper)
- TESTING.md (document the CLI surface and safety invariants)
- packages/contracts/src/connectors/installed-package.ts (deleted) — unused parallel schemas with drifting `packageUrl` + `SVerificationStatus`; canonical shapes live in `package-registry.ts` and `ipc/contracts.ts`
- packages/contracts/src/connectors/index.ts (modified) — drop the `installed-package.js` re-export
- packages/connectors/package.json — corrected `main` → `./dist/index.js`, `types` → `./dist/index.d.ts` to unbreak Electron main module resolution

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: not run yet
- Result: not run
- Notes: 
<!-- AGENT-END:session-validation-run -->
- `pnpm test` (repo root): PASS — 1853/1853 across 12 packages.
- `pnpm --filter @srgnt/desktop test`: PASS — 954/954 test files 58.
- `pnpm --filter @srgnt/desktop test:e2e`: PASS — 81/81 Playwright tests (2.6 min).
- `pnpm --filter @srgnt/desktop test:e2e:packaged:linux`: PASS — 2/2 packaged Linux tests.
- `pnpm --filter @srgnt/desktop typecheck`: PASS.
- Note: `release:check:repo` not run as a separate gate because it composes `test` + `test:e2e` + `test:e2e:packaged:linux`, which were all run individually and all passing.

## Bugs Encountered

<!-- AGENT-START:session-bugs-encountered -->
- None.
<!-- AGENT-END:session-bugs-encountered -->

## Decisions Made or Updated

<!-- AGENT-START:session-decisions-made-or-updated -->
- None.
<!-- AGENT-END:session-decisions-made-or-updated -->

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- [ ] Continue [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_05_add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage|STEP-20-05 Add CLI install remove inspect commands and end-to-end regression coverage]].
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- State what finished, what remains, and whether the session ended in a clean handoff state.
- **Shipped.** CLI install/remove/list/inspect surface exists as `srgnt-connectors` in `packages/desktop/src/main/cli/`, routed through the Step 04 host registry/loader. HTTPS-only fetch with sha256 integrity, redacted text/json output, explicit package-URL v1. Full Playwright e2e + packaged Linux smoke pass on the built artifact.
- **Regression fixed during execution.** Discovered that Electron main could not start under e2e because `@srgnt/connectors` pointed its `main` field at a TypeScript source file that imports `./sdk/index.js` (resolvable only under `dist/`). Corrected `packages/connectors/package.json` to `main: ./dist/index.js` + `types: ./dist/index.d.ts`, matching the pattern used by `@srgnt/contracts` and `@srgnt/runtime`. Without this fix every real-Electron test would have silently timed out.
- **Regression coverage.** Workspace tests 1853/1853, desktop e2e 81/81, packaged Linux e2e 2/2 — including `src/main/cli/host-integration.test.ts` which drives CLI-installed records through `ConnectorPackageHost.activateAndLoad` across all five fail-closed handshake codes.
- **Ended clean.** No outstanding blockers. Step 20-05 complete; Phase 20 all five steps shipped.
