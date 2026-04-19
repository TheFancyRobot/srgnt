---
note_type: step
template_version: 2
contract_version: 1
title: Wire real worker configuration model asset resolution and derived index paths
step_id: STEP-18-02
phase: '[[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]]'
status: done
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - '[[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_01_replace-desktop-worker-stub-with-real-runtime-semantic-search-effect-layer|STEP-18-01]]'
  - '[[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_04_bundle-the-offline-model-assets-and-add-local-only-model-resolution|STEP-15-04]]'
related_sessions:
  - '[[05_Sessions/2026-04-16-182900-wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths-executor-1|SESSION-2026-04-16-182900 executor-1 session for Wire real worker configuration model asset resolution and derived index paths]]'
  - '[[05_Sessions/2026-04-16-183016-wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths-executor-1|SESSION-2026-04-16-183016 executor-1 session for Wire real worker configuration model asset resolution and derived index paths]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Wire real worker configuration model asset resolution and derived index paths

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Wire real worker configuration model asset resolution and derived index paths.
- Parent phase: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]].

## Why This Step Exists

- The real runtime engine is only trustworthy if the worker receives the same model path, workspace root, chunking limits, and derived index root that production desktop builds will use.
- This step prevents false-positive tests that only work with ad hoc or test-only configuration.

## Prerequisites

- STEP-18-01 complete.
- Understand Phase 15 model bundling and Phase 17 packaged validation behavior.

## Relevant Code Paths

- `packages/desktop/src/main/semantic-search/worker.ts`
- `packages/desktop/src/main/semantic-search/host.ts`
- `packages/runtime/src/semantic-search/config.ts`
- `packages/contracts/src/ipc/contracts.ts`
- packaged-path resolution code in `packages/desktop/src/main/`

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_01_replace-desktop-worker-stub-with-real-runtime-semantic-search-effect-layer|STEP-18-01]]

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-04-16
- Next action: Begin only after STEP-18-01 lands; then trace model/index path assembly from desktop bootstrap into worker config and make dev/packaged resolution explicit.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

### Refinement (readiness checklist pass)

**Exact outcome / success condition**
- Worker config is derived from real desktop state, not hard-coded defaults in `host.ts`.
- Model asset resolution works in both dev and packaged builds.
- Derived semantic index root is stable, workspace-scoped, and excluded from watcher crawl loops.
- Configuration mismatches surface as explicit errors instead of silently falling back to a fake service.

**Concrete starting points**
- Current config assembly in `packages/desktop/src/main/semantic-search/host.ts`.
- Worker config/type definitions in `packages/desktop/src/main/semantic-search/types.ts`.
- Runtime config expectations in `packages/runtime/src/semantic-search/config.ts`.
- Existing workspace-root switch logic in `packages/desktop/src/main/index.ts`.

**Implementation constraints / non-goals**
- Do not hardcode project-root-relative model paths without packaged guards.
- Keep the semantic index outside user content and outside watcher recursion.
- Do not add environment-variable-only configuration that production desktop builds cannot reproduce.

**Validation commands**
- `pnpm --filter @srgnt/desktop test -- semantic-search`
- `pnpm --filter @srgnt/desktop typecheck`
- `pnpm --filter @srgnt/desktop test:e2e:packaged:linux` if packaged path handling changes materially

**Edge cases / failure modes**
- Missing model assets in dev.
- Packaged asset path differs from unpacked dev path.
- Workspace root contains symlinks, spaces, or hidden directories.
- Index root already exists with stale manifest data from older builds.

**Security / performance judgment**
- Security: applicable — config must not leak raw asset paths to renderer APIs.
- Performance: applicable — path resolution should happen once on init, not on every query.

**Integration touchpoints**
- Phase 15 model bundling work
- Phase 17 packaged validation tests
- Workspace watcher exclusions in `workspace-watcher.ts`

**Readiness verdict**
- PASS — execution is clear once STEP-18-01 lands, but implementers must prove both dev and packaged path resolution explicitly.

## Human Notes

- Treat asset and index paths as part of the production contract. A "works on my machine" path hack fails this step even if tests pass locally.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-16 - [[05_Sessions/2026-04-16-182900-wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths-executor-1|SESSION-2026-04-16-182900 executor-1 session for Wire real worker configuration model asset resolution and derived index paths]] - Session created.
- 2026-04-16 - [[05_Sessions/2026-04-16-183016-wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths-executor-1|SESSION-2026-04-16-183016 executor-1 session for Wire real worker configuration model asset resolution and derived index paths]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
