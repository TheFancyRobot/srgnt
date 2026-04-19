---
note_type: decision
template_version: 2
contract_version: 1
title: Use runtime-owned local semantic search with worker-hosted bundled model and workspace-root derived index
decision_id: DEC-0015
status: accepted
decided_on: '2026-04-02'
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
supersedes: []
superseded_by: []
related_notes:
  - '[[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]'
  - '[[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]]'
  - '[[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|PHASE-16 Runtime Semantic Search Engine]]'
  - '[[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|PHASE-17 Desktop Semantic Search Integration]]'
  - '[[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]'
tags:
  - agent-vault
  - decision
  - semantic-search
---

# DEC-0015 - Use runtime-owned local semantic search with worker-hosted bundled model and workspace-root derived index

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- The repo needs a production-ready local semantic search subsystem for workspace markdown.
- The product already has explicit boundaries: `packages/runtime` owns shared product logic and `packages/desktop` owns privileged Electron wiring.
- The feature must work fully offline from first launch, bundle its embedding model, exclude `.agent-vault` completely, keep heavy work out of the renderer, and expose a safe API for a future titlebar search bar.
- Existing notes-search planning in Phase 14 already establishes strict workspace markdown read rules for hidden directories, symlinks, and internal paths. Semantic search must not fork those rules.

## Decision

- Core semantic search logic lives in `packages/runtime` behind Effect service tags and layers.
- `packages/desktop` hosts semantic search in a dedicated worker thread managed by the Electron main process. The renderer never loads models, touches Vectra directly, or crawls the filesystem.
- The default embedding runtime is local-only `@huggingface/transformers` configured with `env.allowRemoteModels = false` and a bundled on-disk model path.
- The default bundled model id is `Xenova/paraphrase-multilingual-MiniLM-L12-v2` unless Phase 15 packaging or performance validation disproves it. If the model changes later, the index manifest must force a rebuild rather than silently reusing vectors.
- The default semantic index root is `${workspaceRoot}/.srgnt-semantic-search/`. This directory is derived state, excluded from crawling and watchers, and safe to delete and rebuild.
- Semantic search indexes user-facing markdown only. It excludes `.agent-vault/`, `.command-center/`, hidden directories, symlinks, escaped paths, non-markdown files, and the semantic index directory itself.
- Search IPC stays narrow and typed. Desktop exposes high-level operations such as `init`, `enableForWorkspace`, `indexWorkspace`, `rebuildAll`, `search`, and status/reporting methods only.

## Alternatives Considered

- Run embedding and indexing in the Electron main process. Rejected because large local inference and indexing work can freeze the desktop shell and blur the privileged boundary.
- Use Electron `utilityProcess` from the start. Rejected for now because it adds more packaging and process-management complexity than needed before the runtime contract is stable.
- Load the model in the renderer. Rejected because it weakens the security boundary, increases renderer memory pressure, and conflicts with the no-raw-filesystem/no-raw-model-execution rule.
- Use a cloud embedding API or first-run model download. Rejected because the feature must be offline from first launch.
- Store the index under `.command-center/`. Rejected because the current request explicitly wants index data at the workspace root for now.

## Tradeoffs

- Pro: preserves the runtime-versus-desktop ownership split instead of embedding core logic in Electron-only code.
- Pro: keeps heavy work off the renderer and off the Electron UI thread.
- Pro: a hidden workspace-root index is easy to inspect, exclude, delete, and rebuild.
- Pro: local-only model configuration makes the offline guarantee explicit and testable.
- Con: worker-thread hosting introduces packaging and lifecycle work that a main-process spike would avoid.
- Con: Vectra keeps the index in memory, so corpus scope and cleanup rules must stay bounded and disciplined.
- Con: the chosen default model may still need to be superseded if packaged size, startup cost, or cross-platform behavior are not acceptable.

## Consequences

- Phase 15 must freeze corpus policy, chunking metadata, model asset placement, and manifest versioning before implementation spreads.
- Phase 16 must implement the runtime engine as Effect services with typed errors, batching, and rebuild-aware persistence.
- Phase 17 must add worker lifecycle, workspace switching, typed IPC, preload-safe APIs, and packaged offline validation.
- Any future move from worker threads to `utilityProcess`, or from the default model to a different bundled model, should create a superseding ADR rather than silently drifting.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]]
- Architecture: [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- Bug: [[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-04-02 - Created as `accepted` during semantic-search planning. The runtime-owned engine, worker-thread host, bundled local-only model path, and workspace-root derived index are now the planning baseline.
<!-- AGENT-END:decision-change-log -->
