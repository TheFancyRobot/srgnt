# Execution Brief

## Why This Step Exists

- This step freezes the names, payloads, errors, and service boundaries that later steps must share.
- It prevents runtime and desktop from inventing competing models for status, search results, rebuild triggers, and feature enable behavior.

## Prerequisites

- Read the parent phase, [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]], and [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015]].

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts`
- `packages/contracts/src/workspace/layout.ts`
- `packages/runtime/src/index.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`

## Execution Prompt

1. Add runtime-owned semantic-search domain types covering chunk metadata, search results, index status, feature state, manifest versions, and typed domain errors.
2. Add `AppConfig` and semantic-search config schema entries for workspace root, index root, model asset path, chunk size, overlap, batch size, and corpus exclusions.
3. Add typed IPC contracts only for the desktop-facing operations the renderer should call later: `init`, `enableForWorkspace`, `indexWorkspace`, `rebuildAll`, `search`, and status reporting.
4. Keep the contract high-level. Do not expose raw file paths, Vectra primitives, or model-execution internals to the renderer.
5. Add focused schema and type tests so the rest of the initiative can depend on these contracts safely.

## Related Notes

- Step: [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_01_add-semantic-search-contracts-configuration-and-domain-errors|STEP-15-01 Add semantic search contracts, configuration, and domain errors]]
- Phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]
