---
note_type: session
template_version: 2
contract_version: 1
title: claude-opus session for Implement a managed connector package registry and safe loader boundary in desktop main
session_id: SESSION-2026-04-19-193808
date: '2026-04-19'
status: completed
owner: claude-opus
branch: ''
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
related_bugs: []
related_decisions: '[[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]|[[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]'
created: '2026-04-19'
updated: '2026-04-19'
tags:
  - agent-vault
  - session
---

# claude-opus session for Implement a managed connector package registry and safe loader boundary in desktop main

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main|STEP-20-04 Implement a managed connector package registry and safe loader boundary in desktop main]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main|STEP-20-04 Implement a managed connector package registry and safe loader boundary in desktop main]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 19:38 - Created session note.
- 19:38 - Linked related step [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main|STEP-20-04 Implement a managed connector package registry and safe loader boundary in desktop main]].
<!-- AGENT-END:session-execution-log -->
- 19:45 - Baseline validation green: contracts 281, connectors 84, desktop 854 tests passing; desktop typecheck clean.
- 19:45 - Planned implementation split: contracts/connectors/loader-handshake.ts + desktop/src/main/connectors/{registry,loader,host}.ts + worker entrypoint + tests.
- 19:50 - Added `packages/contracts/src/connectors/loader-handshake.ts` + tests (14 tests).
- 19:52 - Added `packages/desktop/src/main/connectors/{registry,loader,host,worker-runtime,index}.ts` with focused unit tests (38 total).
- 19:55 - Wired `ConnectorPackageHost` into `main/index.ts` via `syncConnectorPackageHostFromSettings`; host runs with `nullSpawn` until Step 05 bundles the worker entrypoint.
- 19:56 - Deferred harmonizing `sourceUrl` vs `packageUrl` naming (flagged by Step 03 reviewer) to Step 05; would require touching just-shipped Step 03 tests and is non-blocking per phase notes.
- 19:58 - Validation run: contracts 295/295, connectors 84/84, desktop 892/892 (from 854), typecheck clean for contracts+desktop.
- 19:58 - Acceptance criteria covered: worker/subprocess isolation path (worker_threads + pluggable `SpawnRuntime`), managed registry in main only, high-level state projection, fail-closed handshake with timeout and error redaction, restart recovery, uninstall cleanup, spawn failure handling, capability subset validation.

## Findings

- Record important facts learned during the session.
- Promote durable information into architecture, bug, or decision notes when appropriate.
- The host currently uses `nullSpawn` as the active `SpawnRuntime`. Step 05 must either ship a real `connector-runtime-worker.js` bundle or swap to `createWorkerSpawn({ workerEntryPath })` when a CLI-installed package is activated.
- `packages/contracts/src/connectors/installed-package.ts` uses `packageUrl` while `package-registry.ts` uses `sourceUrl`. Phase notes flag this as non-blocking harmonization work; no harmonization done in Step 04 to avoid disturbing just-shipped Step 03 tests. Recommend the harmonization land early in Step 05 so CLI commands reference a single canonical field name.
- The `ConnectorPackageHost.internalRegistry()` / `internalLoadedHandle()` escape hatches exist for integration glue + future Step 05 CLI wiring; they should remain test-only surfaces until Step 05 adds its IPC handlers.
- Built-in connectors (jira/outlook/teams) from Phase 20 Step 02 continue to register through the shared `BuiltInConnectorRegistry` in `@srgnt/connectors` and do NOT pass through the new `ConnectorPackageHost`. This is intentional per DEC-0016 — the isolated boundary is the third-party default; first-party in-main execution is preserved during migration.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- None yet.
<!-- AGENT-END:session-changed-paths -->
- packages/contracts/src/connectors/loader-handshake.ts (new)
- packages/contracts/src/connectors/loader-handshake.test.ts (new)
- packages/contracts/src/connectors/index.ts (added loader-handshake export)
- packages/desktop/src/main/connectors/index.ts (new)
- packages/desktop/src/main/connectors/registry.ts (new)
- packages/desktop/src/main/connectors/registry.test.ts (new)
- packages/desktop/src/main/connectors/loader.ts (new)
- packages/desktop/src/main/connectors/loader.test.ts (new)
- packages/desktop/src/main/connectors/host.ts (new)
- packages/desktop/src/main/connectors/host.test.ts (new)
- packages/desktop/src/main/connectors/worker-runtime.ts (new)
- packages/desktop/src/main/connectors/integration.test.ts (new)
- packages/desktop/src/main/index.ts (wired `ConnectorPackageHost` seeding + restart recovery; no behavior change for Phase 19 built-ins)

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: not run yet
- Result: not run
- Notes: 
<!-- AGENT-END:session-validation-run -->
- Command: `pnpm --filter @srgnt/contracts test` — Result: 295/295 passing (14 new loader-handshake tests added).
- Command: `pnpm --filter @srgnt/connectors test` — Result: 84/84 passing (no regression).
- Command: `pnpm --filter @srgnt/desktop test` — Result: 892/892 passing (38 new tests added, 0 regressions from 854 baseline).
- Command: `pnpm --filter @srgnt/desktop typecheck` — Result: clean.
- Command: `pnpm --filter @srgnt/contracts build` — Result: clean (needed to regenerate dist for handshake schema).

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
- [ ] Continue [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main|STEP-20-04 Implement a managed connector package registry and safe loader boundary in desktop main]].
<!-- AGENT-END:session-follow-up-work -->
- [ ] Step 05: ship a bundled `connector-runtime-worker.js` entrypoint so `createWorkerSpawn` can actually load remote package artifacts.
- [ ] Step 05: harmonize `sourceUrl` vs `packageUrl` naming across installed-package CLI schemas and the durable `SInstalledConnectorPackage` record (non-blocking reviewer flag from Step 03).
- [ ] Step 05: add IPC channels (`connector:package:install/remove/inspect/list`) that call into `ConnectorPackageHost.activateAndLoad` / `uninstall` / `describeAll`. The contracts are already added in `ipc/contracts.ts`; the main-process handlers still need wiring.
- [ ] Step 05: add e2e coverage that exercises the install -> load -> connect path across the worker boundary end-to-end (currently covered only via stubbed `SpawnRuntime`).

## Completion Summary

- State what finished, what remains, and whether the session ended in a clean handoff state.
Completed STEP-20-04. The desktop host now owns a managed connector package registry and a fail-closed isolated loader boundary:

- New `packages/desktop/src/main/connectors/` module with three cooperating pieces — `ManagedPackageRegistry` (durable record mirror + persistence), `SafePackageLoader` (handshake-driven activation), and `ConnectorPackageHost` (orchestrator exposing only high-level state).
- New `packages/contracts/src/connectors/loader-handshake.ts` defines the host<->runtime handshake protocol with protocolVersion=1, connector/package identity fields, SDK compatibility, capability subset check, and structured failure codes.
- `main/index.ts` wires the host via `syncConnectorPackageHostFromSettings` so startup seeds from persisted `installedPackages`, applies restart recovery (loaded/connected/activated → installed), and flushes registry mutations back through `writeDesktopSettings`.
- Uses `node:worker_threads` via `createWorkerSpawn` as the production isolation boundary; a `nullSpawn` fallback fails closed until Step 05 ships the worker entrypoint bundle.

The session is complete and the step is fully implemented. Validation is green across contracts (295), connectors (84), and desktop (892 tests; 38 added) with typecheck clean. Handoff is clean — next agent runs Step 05 to add the CLI surface and bundle the real worker entrypoint.
