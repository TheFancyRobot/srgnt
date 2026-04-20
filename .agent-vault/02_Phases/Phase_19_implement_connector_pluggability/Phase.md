---
note_type: phase
template_version: 2
contract_version: 1
title: Implement Connector Pluggability
phase_id: PHASE-19
status: shipped
owner: coordinator
created: '2026-04-16'
updated: '2026-04-19'
depends_on:
  - '[[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|PHASE-18 Real Semantic Search Runtime Integration]]'
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
  - '[[06_Shared_Knowledge/srgnt_framework_adr003_skill_manifest|ADR-003 Skill Manifest Contract]]'
  - '[[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004 Connector Contract]]'
related_decisions:
  - '[[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]'
related_bugs:
  - '[[03_Bugs/BUG-0016_migrateconnectorsettings-passes-unknown-ids-through-migration-filter|BUG-0016 migrateConnectorSettings passes unknown IDs through migration filter]]'
tags:
  - agent-vault
  - phase
---

# Phase 19 Implement Connector Pluggability

Use this note for a bounded phase of work in `02_Phases/`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Turn the desktop connector surface from a bundled-enabled toggle list into a true **catalog + install + connect** model.
- Preserve the local-first trust boundary: bundled connectors are discoverable by default, but **none are installed or usable until the user explicitly installs them**.
- Keep connector availability, installation, and live connection/auth state as separate concepts so Settings, the connector panel, and future auth flows can evolve cleanly.

## Why This Phase Exists

- The current repo already exposes richer connector list fields (`installed`, `available`) in some contracts and bridge types, but the source of truth is still inconsistent.
- Desktop settings still model connectors as three booleans (`jira`, `outlook`, `teams`), which collapses install state and connection state into one flag.
- The renderer still assumes the old enable/disable model, so the UI cannot honestly communicate “discoverable but not installed yet”.
- This phase is the smallest bounded milestone that makes the install-before-use rule real without introducing remote registries, live provider auth redesigns, or dynamic plugin loading.

## Scope

- Normalize bundled connector metadata into one discoverable catalog source that can power `listConnectors()` without implying installation.
- Replace boolean connector settings with explicit install-state persistence that keeps fresh workspaces empty by default.
- Add install/uninstall APIs in the desktop main process and make connect/disconnect semantics depend on installation instead of mutating installation state.
- Update renderer-facing contracts and UI surfaces so users can clearly distinguish **Available**, **Installed**, and **Connected** connectors.
- Add regression coverage for fresh-workspace defaults, legacy-settings migration, install/uninstall transitions, and install-before-use enforcement.

## Current Repo Baseline

- `packages/contracts/src/ipc/contracts.ts` already includes `installed` and `available` on `SConnectorListEntry`.
- `packages/desktop/src/main/index.ts`, `packages/desktop/src/preload/index.ts`, and `packages/desktop/src/renderer/env.d.ts` already expose those fields on connector list payloads.
- `packages/contracts/src/ipc/contracts.ts` and `packages/desktop/src/main/settings.ts` still persist connectors as boolean settings rather than explicit install state.
- `packages/desktop/src/main/index.ts` still treats `connect` and `disconnect` as the way connectors become “installed” or “not installed”.
- `packages/desktop/src/renderer/components/Settings.tsx`, `packages/desktop/src/renderer/components/ConnectorStatus.tsx`, `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.tsx`, and `packages/desktop/src/renderer/main.tsx` still reflect the old toggle-first model.

## Connector State Model

| State | Meaning | Source of truth |
| --- | --- | --- |
| **available** | A bundled connector exists in the local catalog and may be installed. | Bundled catalog / manifest-derived metadata |
| **installed** | The user has explicitly added the connector to this workspace. | Desktop settings / workspace config |
| **connected** | The installed connector currently has a live authenticated or synced session. | Main-process runtime/auth state |

**Invariant:** bundled catalog entries are `available = true`; fresh workspaces start with **zero installed connectors**; a connector must be installed before any connect/auth flow is allowed.

## Non-Goals

- Shipping a remote connector marketplace, online discovery flow, or dynamic plugin downloader.
- Auto-installing, auto-enabling, or silently migrating fresh workspaces into installed connectors.
- Redesigning provider auth/session storage beyond the install-state boundary needed for this phase.
- Delivering connector update/version management beyond stable bundled metadata.
- Expanding beyond the current bundled connector set (`jira`, `outlook`, `teams`).

## Dependencies

- Depends on [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|PHASE-18 Real Semantic Search Runtime Integration]].
- Reuses the main/preload/renderer trust boundary established earlier in the desktop phases.
- Should stay aligned with [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004 Connector Contract and Capability Model]] and [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]].
- Must preserve the secret boundary described by [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]].

## Acceptance Criteria

- [ ] There is one clear bundled connector catalog source that can enumerate discoverable connectors without implying installation.
- [ ] Fresh workspace defaults install **no** connectors, and legacy settings migration preserves only explicit prior opt-ins.
- [ ] Main-process APIs support install and uninstall explicitly, and connect/disconnect no longer stand in for installation.
- [ ] Renderer contracts and UI surfaces expose the three-state model clearly: available, installed, connected.
- [ ] Automated coverage proves install-before-use, uninstall behavior, and no-default-installed onboarding defaults.
- [ ] Notes and step handoffs are explicit enough that execution can proceed without hidden context.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|PHASE-18 Real Semantic Search Runtime Integration]]
- Current phase status: done
- Next phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- Active milestone: all STEP-19 goals are now implemented and covered by regression tests.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Integration_Map|Integration Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- [[03_Bugs/BUG-0016_migrateconnectorsettings-passes-unknown-ids-through-migration-filter|BUG-0016 migrateConnectorSettings passes unknown IDs through migration filter]]
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_01_introduce-discoverable-connector-catalog-with-explicit-installable-manifest-records|STEP-19-01 Introduce discoverable connector catalog with explicit installable manifest records]] -- establish one bundled catalog source and make discoverability truthful; completed.
- [x] [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema|STEP-19-02 Separate connector availability from enabled state in desktop settings and settings schema]] -- persist installation explicitly while keeping fresh-workspace defaults empty.
- [x] [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03 Implement connector install/uninstall and availability APIs in main process]] -- add the runtime control plane for install-before-use and guarded connect/disconnect.
- [x] [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators|STEP-19-04 Update Settings and connector UI to show installable connectors + installed indicators]] -- refactor the visible connector surfaces to the new state model.
- [x] [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_05_align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model|STEP-19-05 Align preload bridge and renderer contracts with new connector pluggability model]] -- wire the new APIs and state transitions through preload and renderer orchestration.
- [x] [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults|STEP-19-06 Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults]] -- lock in the install-before-use invariant with tests.
<!-- AGENT-END:phase-steps -->

## Parallel Work Map

- Step 01 runs first because every later change needs one honest catalog source rather than scattered ad hoc metadata.
- Step 02 depends on Step 01 because install persistence must key off the finalized catalog identifiers and defaults.
- Step 03 depends on Step 02 because install/uninstall handlers must read and write the new settings shape.
- Step 04 depends on Step 03 because the UI should render real install semantics, not placeholders.
- Step 05 depends on Steps 03-04 because preload and renderer orchestration should wire the final APIs and final presentational contracts together in one pass.
- Step 06 runs last because tests should target the settled contract, persistence, main-process, preload, and renderer behavior rather than unstable intermediate shapes.

## Notes

- Treat the existing `installed` / `available` fields as **baseline that must be preserved**, not as proof that the phase is already complete.
- Favor a small number of explicit connector states over clever derived flags that hide install-before-use semantics.
- Keep secrets and provider session material in the privileged boundary; this phase is about installability, not exposing auth internals to the renderer.
- Do not default-install connectors for new workspaces, onboarding, or tests. Fresh means empty.