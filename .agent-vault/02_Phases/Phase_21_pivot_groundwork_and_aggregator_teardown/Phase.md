---
note_type: phase
template_version: 2
contract_version: 1
title: Pivot Groundwork and Aggregator Teardown
phase_id: PHASE-21
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]'
related_architecture:
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
related_decisions:
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 21 Pivot Groundwork and Aggregator Teardown

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and complete the Pivot Groundwork and Aggregator Teardown milestone.
- Cleanly exit the aggregator product: remove connectors/executors/sync/entitlements/fred and all aggregator UI/IPC/CLI while keeping the desktop shell, terminal, notes, and E2E infrastructure green.
- Land the pivot's foundations: workspace v2 layout, contracts v2 domain skeleton (Project / Session / HarnessDefinition) on `effect/Schema`, and modularized main-process services.
- Re-point repo docs and vault architecture notes to the ACP command-center direction; tag `v0-aggregator-final` so the aggregator era stays findable.

## Why This Phase Exists

- Capture the next bounded milestone after [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]].

## Scope

- Add the concrete work items for this milestone.
- Create step notes as execution becomes clearer.
- Land the uncommitted in-flight diff (onboarding `secondaryAction`, connector catalog URL handling, `build:deps`) as final aggregator-era housekeeping, then tag `v0-aggregator-final`.
- Delete `packages/connectors`, `packages/executors`, `packages/sync`, `packages/entitlements`, `packages/fred`, `examples/`, `packages/desktop/dev-connectors/`, the connector CLI (`srgnt-connectors` bin + `src/main/cli`), connector host/IPC in desktop main, and aggregator views (TodayView, CalendarView, ConnectorStatus) with their tests and E2E specs.
- Slim `packages/runtime`: remove workflows/daily-briefing, connector loaders, query engine, launch templates, runs-history; keep workspace, store patterns, logs, approvals + policy, semantic-search source.
- Remove the bundled embedding model from `electron-builder` `extraResources` (semantic-search source stays; model returns when transcript search ships).
- Modularize `packages/desktop/src/main/index.ts` (1,340 lines, 45 IPC handlers) into per-service modules (settings, notes, pty, updater, workspace) now that connector code is gone.
- Implement workspace v2 bootstrap (`projects/`, `groups/templates/`, `harnesses.json`, `settings.json`) replacing the PARA-style aggregator layout; pre-release product — no data migration.
- Create contracts v2 domain skeleton (Project, Session, SessionEvent envelope, HarnessDefinition) on `effect/Schema`, migrating off deprecated `@effect/schema` 0.75.
- Rewrite README.md and AGENTS.md product framing; re-point vault home/architecture notes (System_Overview, Integration_Map, Domain_Model) to the new direction.

## Non-Goals

- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.
- Building any ACP/harness functionality in this phase — teardown and foundations only.
- Migrating aggregator user data (pre-release product; workspace v2 may break format freely).
- Rewriting the shell layout, brand, notes editor, or terminal — the preserved "feel" is a hard keep.
- Deleting semantic-search source code (only the bundled model leaves packaged artifacts).
- Renaming the repo, packages scope (`@srgnt/*`), or brand.

## Dependencies

- Depends on [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]].
- Must stay aligned with [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] and [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]].
- Requires the in-flight working-tree diff to land first (Step 01) so deletion starts from a clean, tagged baseline.

## Acceptance Criteria

- [ ] Scope is concrete and linked to the right durable notes.
- [ ] Step notes exist for the first executable work units.
- [ ] Validation and documentation expectations are explicit.
- [ ] `v0-aggregator-final` tag exists after the in-flight diff lands; pivot commits start after it.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` pass with the five remaining packages (tsconfig, contracts, runtime, desktop + placeholder-free graph); deleted packages leave no references.
- [ ] App boots to the slim shell (layout, titlebar, notes, terminal, settings, onboarding) with no aggregator views, IPC channels, or CLI bins.
- [ ] Workspace v2 bootstrap creates the new layout; contracts v2 Project/Session/SessionEvent/HarnessDefinition schemas exist on `effect/Schema` with tests; `@effect/schema` dependency is gone.
- [ ] `main/index.ts` is a thin composition root delegating to per-service modules.
- [ ] Packaged artifact no longer bundles the embedding model; README/AGENTS describe the ACP command-center product.
- [ ] Vault: home + architecture notes re-pointed; DEC-0017 accepted; Roadmap shows phases 21–29.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|PHASE-22 ACP Core Package and Pi Integration Spike]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- None yet.
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final|STEP-21-01 Land in-flight housekeeping diff and tag v0-aggregator-final]]
- [ ] [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces|STEP-21-02 Delete aggregator packages UI IPC and CLI surfaces]]
- [ ] [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]]
- [ ] [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton|STEP-21-04 Bootstrap workspace v2 layout and contracts v2 domain skeleton]]
- [ ] [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes|STEP-21-05 Rewrite repo docs and re-point vault architecture notes]]
<!-- AGENT-END:phase-steps -->

## Notes

- Add architecture, bug, and decision links as the milestone becomes more concrete.
- Use the `Steps/` directory for the first executable units instead of expanding this note too far.
- Driven by [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]]. The full reviewed pivot plan (vision, architecture, decision log D1–D21) was produced 2026-07-10; phases 21–29 encode it.
- Step order: land+tag first (Step 01), then deletion (Step 02) before foundations (Steps 03–04) so new code never references dead packages; docs/vault re-point (Step 05) last. Steps 03 and 04 can overlap once deletion lands.
- Evidence for teardown targets: `packages/{connectors,executors,sync,entitlements,fred}`, `packages/desktop/src/main/{cli,connectors}`, `dev-connectors/`, TodayView/CalendarView/ConnectorStatus components, workspace bootstrap's PARA dirs (`Daily/`, `People/`, `Meetings/`…), `srgnt-connectors` bin in desktop package.json, `extraResources` model entry.
- Keep-list is a hard constraint: LayoutContext/ActivityBar/Navigation/SidePanel/Titlebar, NotesView + notes IPC, TerminalPanel + pty service, Settings/Onboarding frameworks, updater, crash reporting, Playwright infra.
- Validation: `pnpm typecheck && pnpm test && pnpm test:e2e` after each step; packaged smoke (`test:e2e:packaged:linux`) at phase exit.
