---
note_type: step
template_version: 2
contract_version: 1
title: Implement Canonical Store And Manifest Loaders
step_id: STEP-03-01
phase: '[[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]'
status: complete
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-02-04
related_sessions: '[[05_Sessions/2026-03-22-170211-implement-canonical-store-and-manifest-loaders-opencode|SESSION-2026-03-22-170211]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Implement Canonical Store And Manifest Loaders

Turn the contract-only entity, skill, and connector definitions into executable shared runtime code.

## Purpose

- Load canonical entities and manifests through one runtime path used by connectors, workflows, and executors.
- Establish the first real shared packages behind the shell.

## Why This Step Exists

- The contracts phase is only useful if the runtime can actually consume those contracts.
- Later approval, artifact, and connector work all depend on a single store and manifest-loading path.

## Prerequisites

- Complete [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]].
- Read the finalized Phase 01 contracts and worked examples.

## Relevant Code Paths

- `packages/contracts/`
- `packages/runtime/`
- `packages/executors/`
- sample manifests and fixtures created in Phase 01

## Required Reading

- [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
- [[02_Phases/Phase_01_foundation_contracts/Phase|PHASE-01 Foundation Contracts]]
- [[01_Architecture/System_Overview|System Overview]]

## Execution Prompt

1. Implement runtime packages that load canonical entities, skill manifests, and connector manifests from the contract locations frozen earlier.
2. Keep loaders strict enough to catch contract drift early.
3. Ensure the runtime can operate on local workspace state without provider-specific code paths.
4. Add targeted tests or fixtures that prove the runtime can load the Phase 01 examples end-to-end.
5. Validate with targeted loader tests plus the workspace typecheck command from Phase 02.
6. Update notes with the exact runtime modules created and any contract gap discovered.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner:
- Last touched: 2026-03-22
- Next action: None — step is complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- This step should consume Phase 01 contracts as-is; if loaders need schema changes, push those back into the contract notes.
### Refinement (readiness checklist pass)

**Dependency check:** `depends_on` now points to `STEP-02-04`, which is the Phase 02 checkpoint that proves the desktop shell, workspace contract, and renderer scaffolding all exist before runtime implementation begins.

**Exact outcome:**
- `packages/runtime/src/store/` — canonical entity store module that loads, validates, and indexes entities from workspace markdown files
- `packages/runtime/src/loaders/manifest.ts` — manifest loader for skill manifests and connector manifests, parsing YAML frontmatter + body against Zod schemas from contracts
- `packages/runtime/src/loaders/entity.ts` — entity loader that reads markdown files from the workspace artifacts directory and produces typed entity objects
- `packages/contracts/src/manifests/` — Zod schemas for skill manifest and connector manifest shapes (if not already in Phase 01)
- Test fixtures in `packages/runtime/test/fixtures/` — at least one valid skill manifest, one valid connector manifest, one valid entity file, one intentionally invalid file (for error path testing)
- All loaders consume workspace paths from the layout defined in STEP-02-03

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — all parsing must go through Zod schemas; runtime errors on invalid manifests, not silent coercion
- DEC-0007 (Dataview query engine) — loaders read markdown + YAML frontmatter, which is the same format Dataview will later query. Loader output shapes should be compatible with what a query engine would index.
- DEC-0005 (pnpm) — packages/runtime imports packages/contracts as a workspace dependency

**Starting files:**
- Completed PHASE-02: workspace layout, desktop shell, contracts package with Zod schemas
- Phase 01 contract definitions and worked examples

**Constraints:**
- Do NOT embed connector-specific or executor-specific logic in the base loaders
- Do NOT use a database — loaders read directly from the filesystem (markdown files)
- Do NOT skip Zod validation for "known good" files — every load path must validate
- Do NOT import Electron APIs — runtime package must be Electron-agnostic (pure Node.js)

**Validation:**
1. `pnpm test --filter runtime` passes with loader tests covering: valid manifest, valid entity, invalid manifest (expect error), missing file (expect error)
2. `pnpm typecheck` passes across contracts + runtime
3. Loader output types match the Zod schema inferred types exactly (no `as any` casts)
4. A fixture test loads a Phase 01 example contract end-to-end and produces a typed object
5. Runtime package has zero Electron imports (grep check)

**Junior-readiness verdict:** PASS — the dependency metadata now matches the prerequisite text. The step itself is well-scoped (loaders + validation), and the implementer needs access to Phase 01 contract schemas and STEP-02-03's workspace layout.

## Human Notes

- Do not let connector- or executor-specific shortcuts leak into the base loader path.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-170211-implement-canonical-store-and-manifest-loaders-opencode|SESSION-2026-03-22-170211 opencode session for Implement Canonical Store And Manifest Loaders]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the shared runtime can load real manifests and canonical fixtures.
- Validation target: example contracts parse and register without custom escape hatches.
