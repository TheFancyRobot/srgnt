---
note_type: phase
template_version: 2
contract_version: 1
title: Runtime Foundation
phase_id: PHASE-03
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-26'
depends_on:
  - PHASE-02
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
related_decisions:
  - '[[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]'
  - '[[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007 Use Dataview query engine over markdown files as local data layer]]'
  - '[[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract for canonical workspace data]]'
  - '[[04_Decisions/DEC-0011_dec-0011-use-simplequeryengine-over-in-memory-canonicalstore-for-v1-query-index|DEC-0011 DEC-0011 Use SimpleQueryEngine over in-memory CanonicalStore for v1 query/index]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 03 Runtime Foundation

Build the shared local runtime that sits behind the desktop shell: canonical store, manifests, approvals, artifacts, runs, executor abstraction, and query/index direction.

## Objective

- Deliver the reusable runtime packages and storage/query decisions that connectors and workflows depend on, while preserving the local-first workspace as the source of truth.

## Why This Phase Exists

- The framework's Milestone 2 and desktop technical design call out canonical entities, manifests, capabilities, run history, executor abstraction, and a derived metadata/index layer as foundational subsystems.
- If these contracts stay only on paper, later connector and workflow phases will fork their own local models and make sync/security preparation harder.

## Scope

- Implement canonical entity storage and manifest loading in shared packages.
- Add capability resolution, policy enforcement, and approval-state handling.
- Implement artifact registry, run history, and executor request/result plumbing.
- Decide the local query/index direction, including any Dataview reuse audit, and record the result durably.

## Non-Goals

- Shipping provider connectors or end-user workflow screens.
- Introducing remote databases, sync services, or premium AI orchestration.

## Dependencies

- [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]] must establish the package skeleton, shell boundary, and workspace bootstrap first.
- [[06_Shared_Knowledge/srgnt_one_pager|srgnt One Pager]] and [[06_Shared_Knowledge/v1_wedge_definition|V1 Wedge Definition]] freeze the local-first base-product scope and the daily command-center outputs the runtime must support.
- `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` defines the runtime responsibilities, hybrid persistence model, artifact model, and query/index constraint.
- Phase 01 contracts remain the schema source of truth for the runtime implementation.

## Acceptance Criteria

- [x] Shared runtime code can load the Phase 01 sample manifests and canonical entity contracts without provider-specific escape hatches.
- [x] Artifact and run-history models exist and support approvals and executor abstraction.
- [x] Policy/capability enforcement is explicit and reusable by connectors, workflows, and terminal launches.
- [x] A durable decision exists for the local query/index direction, including whether any Dataview reuse is viable.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]]
- Current phase status: partial
- Next phase: [[02_Phases/Phase_04_first_integrations/Phase|PHASE-04 First Integrations]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Integration_Map|Integration Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]
- [[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007 Use Dataview query engine over markdown files as local data layer]]
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract for canonical workspace data]]
- [[04_Decisions/DEC-0011_dec-0011-use-simplequeryengine-over-in-memory-canonicalstore-for-v1-query-index|DEC-0011 DEC-0011 Use SimpleQueryEngine over in-memory CanonicalStore for v1 query/index]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- No linked bug notes yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_03_runtime_foundation/Steps/Step_01_implement-canonical-store-and-manifest-loaders|STEP-03-01 Implement Canonical Store And Manifest Loaders]] - Start here; turns the Phase 01 schemas into executable shared packages.
- [x] [[02_Phases/Phase_03_runtime_foundation/Steps/Step_02_implement-capability-policy-and-approval-model|STEP-03-02 Implement Capability Policy And Approval Model]] - Depends on Step 01.
- [x] [[02_Phases/Phase_03_runtime_foundation/Steps/Step_03_implement-artifact-registry-run-history-and-executor-contracts|STEP-03-03 Implement Artifact Registry Run History And Executor Contracts]] - Depends on Steps 01-02.
- [ ] [[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04 Decide Query Index Strategy And Dataview Feasibility]] - Depends on Step 01; can run in parallel with Step 02. Research spike only — produces a feasibility verdict and DEC note.
- [ ] [[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem|STEP-03-05 Implement Query Index Subsystem]] - Depends on Steps 01 and 04. Blocked until STEP-03-04 DEC note is recorded and senior-reviewed. Production query/index implementation.
<!-- AGENT-END:phase-steps -->

## Notes

- Runtime packages now provide canonical store, manifest loaders, policy checks, artifact registry, run history, and a basic query engine with automated tests.
- The current implementation is in-memory and lightweight, proving the package seams without full file-backed runtime (deferred to future phases).
- DEC-0011 (accepted) supersedes DEC-0007: Dataview extraction is not feasible for v1. SimpleQueryEngine over in-memory CanonicalStore is the production query approach.
- Steps 01-05 are complete: canonical store, manifest loaders, policy engine, artifact registry, run history, Dataview feasibility spike (DEC-0011), and query index subsystem (SimpleQueryEngine) all implemented with tests.
- The implementations are **in-memory only** (Map-based). File-backed persistence is deferred — the workspace bootstrap from STEP-02-03 provides the disk I/O foundation, and later persistence can be layered in without changing store interfaces.
