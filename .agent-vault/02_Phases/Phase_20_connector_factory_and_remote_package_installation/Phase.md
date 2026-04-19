---
note_type: phase
template_version: 2
contract_version: 1
title: Connector Factory and Remote Package Installation
phase_id: PHASE-20
status: in_progress
owner: coordinator
created: '2026-04-19'
updated: '2026-04-19'
depends_on:
  - '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]'
related_architecture:
  - '[[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004 Connector Contract and Capability Model]]'
  - '[[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]'
  - '[[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]'
related_decisions:
  - '[[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]'
  - '[[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 20 Connector Factory and Remote Package Installation

Use this note for a bounded phase of work in `02_Phases/`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Turn the shipped Phase 19 pluggability baseline into a real **connector package platform** built around a public connector factory contract.
- Make the same factory path usable by first-party bundled connectors and third-party developers, with **remote CLI installation** as the first management surface.
- Preserve the Electron privilege boundary by keeping installation, loading, and auth/session orchestration in the privileged host while exposing only safe high-level state elsewhere.

## Why This Phase Exists

- Phase 19 intentionally stopped at bundled catalog/install semantics and explicitly excluded remote marketplaces and dynamic plugin loading.
- The current repo has no public connector factory abstraction in `packages/connectors`; its SDK stops at base connector classes, while desktop main still owns catalog/install logic directly.
- Built-in connector metadata is still duplicated between `packages/connectors/src/{jira,outlook,teams}` and `packages/desktop/src/main/index.ts`, which is evidence that the external-developer extension path is not yet real.
- The repo already fetches and validates remote package metadata in development, but it does not define how executable connector packages are installed, loaded, compatibility-checked, or safely hosted.
- This phase is the smallest bounded milestone that upgrades “installable connectors” from catalog records into a durable host/plugin model without prematurely building a marketplace UI.

## Scope

- Define a stable public connector factory contract and package runtime shape in shared packages.
- Refactor bundled connectors so Jira, Outlook, and Teams prove the same factory and registration path third-party packages will use.
- Define remote package metadata, integrity fields, compatibility requirements, and a CLI-only install/remove/inspect lifecycle.
- Implement a managed package registry and a safe loading boundary that keeps install, verify, activate, load, and connect states distinct.
- Add automated coverage for compatibility checks, failed installs, cleanup, and built-in vs. external package parity.

## Non-Goals

- Building a remote marketplace UI, in-app package browser, or app-store-style review flow.
- Allowing unrestricted arbitrary code execution from the renderer or preload.
- Solving premium marketplace curation, billing, or trust distribution policy in this phase.
- Redesigning connector auth providers beyond the narrow host APIs needed to keep secrets in the privileged boundary.
- Supporting catalog-first package discovery in v1; CLI install defaults to an explicit package URL/reference only.

## Dependencies

- Depends on [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]] for truthful available/installed/connected state.
- Must stay aligned with [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004 Connector Contract and Capability Model]].
- Must preserve the privileged secret boundary in [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]].
- Must follow [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016]] for third-party execution isolation.
- Should follow the extensibility guardrails in [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]], especially least privilege and explicit install-time disclosure.

## Acceptance Criteria

- [x] A public connector factory contract exists in shared code and is documented clearly enough for third-party developers to target it.
- [x] Built-in connectors register through the same factory path as external packages instead of using a desktop-only special path.
- [x] Remote connector package metadata includes enough information for compatibility and integrity checks before activation.
- [x] A CLI-only install/remove/list/inspect lifecycle exists for explicit package URLs/references without requiring a new UI.
- [x] Third-party connector packages run in an isolated worker/subprocess boundary rather than inside Electron main.
- [x] Desktop main owns a managed connector package registry and exposes only safe high-level state to preload/renderer.
- [x] Automated validation covers manifest/package mismatch, integrity failure, compatibility failure, install cleanup, load failure, restart recovery, and install/load/connect state transitions.

## Phase-Wide Workflow Map

- **Step 01** freezes the public package contract: package export shape, factory interface, host context, lifecycle states, compatibility fields, and validation boundaries.
- **Step 02** proves the contract by moving bundled connectors onto the same shared registration path.
- **Step 03** defines the persistent package record and CLI lifecycle for explicit URL/reference installs.
- **Step 04** implements the host registry plus isolated worker/subprocess loader boundary in desktop main.
- **Step 05** adds the CLI management surface and locks the behavior down with unit, integration, e2e, and packaged regression coverage.

## Shared Constraints and Invariants

- Installed, verified, activated, loaded, connected, and error are separate inspectable states.
- Third-party connector packages must never execute in renderer or preload.
- Third-party connector packages must not receive raw Electron, Node, filesystem, environment, or secret-store primitives.
- CLI v1 install uses an explicit package URL/reference only; catalog-driven discovery is future work.
- Validation must fail closed on package-id mismatch, integrity failure, runtime API mismatch, unsupported host SDK version, malformed entrypoint shape, interrupted install, or broken restart load.
- Uninstall must remove managed artifacts and clear runtime activation state; auth/session cleanup remains host-owned.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- Current phase status: in_progress
- Next phase: not planned yet.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[01_Architecture/System_Overview|System Overview]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_01_define-the-public-connector-factory-contract-and-package-runtime-shape|STEP-20-01 Define the public connector factory contract and package runtime shape]] -- freeze the SDK, host context, lifecycle, and package entrypoint before implementation drifts.
- [x] [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path|STEP-20-02 Refactor built-in connectors to register through the shared factory path]] -- prove the contract with first-party connectors and remove desktop-only duplication.
- [x] [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_03_specify-remote-connector-package-metadata-and-cli-install-lifecycle|STEP-20-03 Specify remote connector package metadata and CLI install lifecycle]] -- define explicit-URL package records, integrity checks, and management semantics.
- [x] [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main|STEP-20-04 Implement a managed connector package registry and safe loader boundary in desktop main]] -- add the host-side runtime and isolated loading path.
- [ ] [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_05_add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage|STEP-20-05 Add CLI install remove inspect commands and end-to-end regression coverage]] -- ship the CLI workflow and lock in the safety invariants with tests.
<!-- AGENT-END:phase-steps -->

## Notes

- This is a **new follow-on phase**, not a reopening of Phase 19. Phase 19 shipped its bounded outcome and should stay historically accurate.
- Evidence behind the phase shape:
  - `packages/connectors/src/sdk/connector.ts` has base connector classes but no public factory abstraction.
  - `packages/desktop/src/main/index.ts` still owns connector catalog/install logic and duplicates built-in connector metadata.
  - `packages/contracts/src/connectors/manifest.ts` validates manifest shape but not package/runtime compatibility or integrity metadata.
  - `packages/desktop/dev-connectors/` already provides a useful fixture shape for remote install experimentation.
- User-confirmed planning decisions captured during refinement:
  - remote **third-party** connector packages should run in a worker/subprocess isolation boundary;
  - CLI v1 install should default to an explicit package URL/reference only, not catalog-first discovery.
- Parallel work map: Step 01 must run first; Step 02 and Step 03 can overlap once the core factory contract is stable; Step 04 depends on Steps 02 and 03; Step 05 runs last.
- Implementation progress as of 2026-04-19: Steps 01, 02, 03, and 04 are complete. Step 05 is the next execution target. Reviewer noted a non-blocking naming inconsistency (`sourceUrl` vs `packageUrl`, checksum field naming) that should be harmonized early in Step 05; deferred from Step 04 to avoid disturbing just-shipped Step 03 tests.
- Validation map for implementers:
  - Step 01: `pnpm --filter @srgnt/connectors test`, `pnpm --filter @srgnt/contracts test`, plus both package typechecks.
  - Step 02: `pnpm --filter @srgnt/connectors test`, `pnpm --filter @srgnt/desktop test`, `pnpm --filter @srgnt/desktop test:e2e`.
  - Step 03: `pnpm --filter @srgnt/contracts test`, `pnpm --filter @srgnt/desktop test`, plus both package typechecks.
  - Step 04: `pnpm --filter @srgnt/desktop test`, `pnpm --filter @srgnt/desktop typecheck`, `pnpm --filter @srgnt/contracts test`, `pnpm --filter @srgnt/connectors test`.
  - Step 05: targeted desktop tests + `pnpm test`, `pnpm test:e2e`, `pnpm test:e2e:packaged:linux`, and `pnpm run release:check:repo` before marking the phase shippable.
