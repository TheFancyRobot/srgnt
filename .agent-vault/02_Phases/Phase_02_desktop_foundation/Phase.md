---
note_type: phase
template_version: 2
contract_version: 1
title: Desktop Foundation
phase_id: PHASE-02
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-26'
depends_on:
  - PHASE-01
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
related_decisions:
  - '[[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]'
  - '[[04_Decisions/DEC-0004_target-macos-windows-linux-for-desktop-v1|DEC-0004 Target macOS + Windows + Linux for desktop v1]]'
  - '[[04_Decisions/DEC-0005_use-pnpm-as-monorepo-package-manager|DEC-0005 Use pnpm as monorepo package manager]]'
  - '[[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract for canonical workspace data]]'
  - '[[04_Decisions/DEC-0009_freeze-renderer-stack-and-routing-contract-for-desktop-v1|DEC-0009 Renderer stack and routing contract for desktop v1]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 02 Desktop Foundation

Turn the framing and contract decisions into the first runnable desktop product skeleton: repo tooling, Electron shell, narrow privileged boundary, and workspace bootstrap.

## Objective

- Stand up the monorepo and desktop shell foundation required for every later runtime, connector, and workflow phase without leaking secrets or privileged operations into the renderer.

## Why This Phase Exists

- The framework's Milestone 1 requires an Electron shell, secure local boundary, layout/navigation skeleton, and workspace persistence model before deep workflow logic begins.
- This phase is where the planning-only repo turns into an executable desktop workspace with a real shell, package tooling, and renderer boundary.

## Scope

- Choose and scaffold the repo workspace tooling, packages, and baseline scripts.
- Implement Electron main, renderer, and preload boundaries with narrow typed IPC.
- Define the local workspace bootstrap layout and persistence contracts that preserve the local-first file-backed source of truth.
- Add layout, navigation, settings, and integrations shells so later phases attach to a stable desktop surface.

## Non-Goals

- Building real connectors, runtime orchestration, or the flagship workflow logic.
- Shipping packaging, updater, or sync features beyond the interfaces they constrain.

## Dependencies

- Depends on [[02_Phases/Phase_01_foundation_contracts/Phase|PHASE-01 Foundation Contracts]].
- [[06_Shared_Knowledge/srgnt_one_pager|srgnt One Pager]] and [[06_Shared_Knowledge/v1_wedge_definition|V1 Wedge Definition]] capture the command-center workflow and local-first trust-boundary constraints this shell must support.
- `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` defines the desktop-first shell, main-process trust boundary, and local-first workspace requirement.
- `[[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]` keeps the package layout and shell choices aligned with the later product architecture.

## Acceptance Criteria

- [x] A concrete repo/package skeleton exists for Electron app code, shared packages, and future connector/runtime work.
- [x] The renderer can only reach privileged capabilities through typed, narrow IPC contracts.
- [x] A workspace bootstrap and persistence layout exists that honors the local-first, file-backed source-of-truth requirement.
- [x] Manual smoke validation exists for opening the shell, loading the base navigation, and exercising the privileged boundary safely.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_01_foundation_contracts/Phase|PHASE-01 Foundation Contracts]]
- Current phase status: partial
- Next phase: [[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Integration_Map|Integration Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]
- [[04_Decisions/DEC-0004_target-macos-windows-linux-for-desktop-v1|DEC-0004 Target macOS + Windows + Linux for desktop v1]]
- [[04_Decisions/DEC-0005_use-pnpm-as-monorepo-package-manager|DEC-0005 Use pnpm as monorepo package manager]]
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract for canonical workspace data]]
- [[04_Decisions/DEC-0009_freeze-renderer-stack-and-routing-contract-for-desktop-v1|DEC-0009 Renderer stack and routing contract for desktop v1]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- No linked bug notes yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_02_desktop_foundation/Steps/Step_01_scaffold-monorepo-and-desktop-packages|STEP-02-01 Scaffold Monorepo And Desktop Packages]] - Start here; chooses tooling and creates the package skeleton that later steps rely on.
- [x] [[02_Phases/Phase_02_desktop_foundation/Steps/Step_02_implement-electron-shell-and-preload-boundary|STEP-02-02 Implement Electron Shell And Preload Boundary]] - Depends on Step 01.
- [x] [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts|STEP-02-03 Define Local Workspace Layout And Persistence Contracts]] - Depends on Step 01; can run in parallel with Step 02 if ownership stays separated.
- [x] [[02_Phases/Phase_02_desktop_foundation/Steps/Step_04_add-navigation-skeleton-and-settings-surfaces|STEP-02-04 Add Navigation Skeleton And Settings Surfaces]] - Depends on Steps 02-03.
<!-- AGENT-END:phase-steps -->

## Notes

- The monorepo, Electron shell, preload boundary, renderer stack, top-level navigation surfaces, and workspace bootstrap now exist and are exercised by root build and test commands.
- IPC channel naming is aligned with the shared contracts, and packaging prebuilds now generate desktop assets before release packaging runs.
- Workspace bootstrap is implemented at `packages/runtime/src/workspace/bootstrap.ts` with full test coverage (10 tests).
- **DEC-0008 dependency:** DEC-0008 (file-backed record contract) is still `proposed`. The bootstrap implementation is compatible with whatever DEC-0008 finalizes.
