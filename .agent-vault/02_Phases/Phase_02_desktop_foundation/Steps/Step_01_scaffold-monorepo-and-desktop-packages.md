---
note_type: step
template_version: 2
contract_version: 1
title: Scaffold Monorepo And Desktop Packages
step_id: STEP-02-01
phase: '[[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - PHASE-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Scaffold Monorepo And Desktop Packages

Choose the initial workspace tooling and create the package skeleton for the desktop product.

## Purpose

- Establish the repo layout, package manager, and scripts that all later product code will use.
- Reserve stable homes for the Electron app, shared runtime packages, connectors, and examples.

## Why This Step Exists

- The repo is currently vault-only, so every later implementation step depends on a real package skeleton.
- Tooling choice is still open; this step must settle it once and document the validation commands everyone else will use.

## Prerequisites

- Read [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]].
- Read [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]].

## Relevant Code Paths

- `package.json`
- workspace config chosen here, such as `pnpm-workspace.yaml` or equivalent
- `packages/desktop/`
- `packages/contracts/`
- `packages/runtime/`
- `packages/connectors/`
- `packages/executors/`
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`

## Required Reading

- [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
- [[01_Architecture/Code_Map|Code Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Confirm the repo is still empty of product code and choose a workspace/tooling direction that fits Electron plus shared TypeScript packages.
2. Create the initial package skeleton and baseline scripts for install, typecheck, test, and desktop smoke validation.
3. Keep the layout aligned with Phase 01 contract homes and later runtime/connector phases.
4. Record the exact validation commands chosen here so later steps do not guess.
5. Validate by running the new workspace bootstrap commands and verifying the package graph matches the planned milestones.
6. Update notes with the chosen tooling, exact paths, and any deferred tooling decision.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Framework recommends a monorepo shape with app, connector, skill, executor, and docs packages.
- This is the step that should freeze the command names later steps use for validation.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `pnpm-workspace.yaml` defining workspace packages
- Root `package.json` with `pnpm` engine constraint and workspace scripts: `install`, `typecheck`, `test`, `desktop:dev` (smoke)
- `packages/contracts/package.json` + `tsconfig.json` (empty src/ with barrel export)
- `packages/runtime/package.json` + `tsconfig.json` (empty src/ with barrel export)
- `packages/desktop/package.json` + `tsconfig.json` with Electron dev dependency, React renderer dependencies, and placeholder `main/index.ts`, `preload/index.ts`, and `renderer/main.tsx`
- `packages/connectors/package.json` + `tsconfig.json` (empty src/ with barrel export)
- `examples/` directory with at least one placeholder README
- Root `tsconfig.base.json` with shared compiler options and project references
- Renderer stack frozen here for downstream consistency: `packages/desktop/renderer/` uses React + TypeScript. If implementation must deviate, record a decision note and update downstream step references before coding.

**Key decisions to apply:**
- DEC-0005 (pnpm as monorepo package manager) — this is the primary decision for this step
- DEC-0002 (TypeScript + Zod) — tsconfig and Zod dependency setup
- DEC-0004 (macOS + Windows + Linux) — Electron config must not assume a single OS

**Starting files:**
- Existing `.agent-vault/` vault (do not disturb)
- Existing root files (if any) — verify repo is vault-only before scaffolding

**Constraints:**
- Do NOT use npm, yarn, or bun — pnpm only (DEC-0005)
- Do NOT add any runtime application code — this step produces skeleton only
- Do NOT install Electron globally — workspace-local dev dependency only
- Do NOT create `apps/` top-level directory — use `packages/` per PHASE-01 monorepo layout

**Validation:**
1. `pnpm install` succeeds from repo root with no errors
2. `pnpm typecheck` (or `pnpm -r exec tsc --noEmit`) passes across all packages
3. `pnpm test` runs (even if zero tests, it should not error)
4. `pnpm --filter desktop dev` or equivalent starts Electron and shows a window (blank is fine)
5. `pnpm ls -r` shows the expected package graph: contracts, runtime, desktop, connectors

**Junior-readiness verdict:** PASS — well-scoped scaffolding step with clear deliverables, canonical package paths, and an explicit renderer-stack default for downstream notes.

## Human Notes

- Favor boring, well-supported tooling over novelty; later Electron and test ergonomics matter more than theoretical minimalism.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means later steps can point to exact package paths and exact validation commands.
- Validation target: install/typecheck/test/smoke scripts exist and run from the repo root.
