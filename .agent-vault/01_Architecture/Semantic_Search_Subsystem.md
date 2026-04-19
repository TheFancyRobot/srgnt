---
note_type: architecture
template_version: 2
contract_version: 1
title: Semantic Search Subsystem
architecture_id: "ARCH-0007"
status: active
owner: ""
reviewed_on: "2026-04-02"
created: "2026-04-02"
updated: "2026-04-02"
related_notes:
  - "[[01_Architecture/System_Overview|System Overview]]"
  - "[[01_Architecture/Integration_Map|Integration Map]]"
  - "[[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]"
  - "[[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]]"
  - "[[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]"
tags:
  - agent-vault
  - architecture
  - semantic-search
---

# Semantic Search Subsystem

## Purpose

- Explain the local semantic search subsystem for workspace markdown retrieval.
- Answer where parsing, embedding, vector storage, indexing, lifecycle, and Electron boundaries belong.

## Overview

- Semantic search is a local-first derived index over supported workspace markdown files.
- `packages/runtime` owns the corpus rules, markdown parsing/chunking, wikilink extraction, embedding abstraction, bundled-model inference integration, Vectra persistence, persistent index state, indexing orchestration, and retrieval APIs.
- `packages/desktop` owns worker lifecycle, workspace-root wiring, feature enable/disable entry points, filesystem watching, typed IPC handlers, and the preload-safe renderer bridge.
- The renderer must never receive raw filesystem or model execution primitives. It consumes only high-level search and indexing methods.
- The index is derived state, rebuildable from workspace markdown, and stored under a dedicated hidden directory at the workspace root so it stays outside `.command-center/` while remaining easy to inspect, delete, or rebuild.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- `AppConfig` - runtime configuration for workspace root, semantic index root, model asset path, chunking limits, and feature defaults.
- Workspace markdown corpus policy - one canonical inclusion/exclusion service for crawl, search, indexing, and watchers.
- `MarkdownChunker` - parses frontmatter, derives titles, splits by headings first, and further splits oversized sections with overlap.
- Wikilink extraction - derives `[[wikilink]]` references from chunk text for retrieval metadata and future graph-aware ranking.
- `EmbeddingService` - local-only, bundled-model embedding boundary that hides runtime details from the rest of the engine.
- `IndexStateStore` - persistent manifest of file mtimes, content hashes, model id, chunk ids, and index version used for incremental indexing.
- `VectraStore` - Vectra-backed chunk vector persistence plus metadata-based delete and query operations.
- `WorkspaceIndexer` - orchestrates initial indexing, reindexing, file removal, stale cleanup, rebuilds, and watcher-triggered updates.
- `SemanticSearchService` - public runtime API exposing `init`, `indexWorkspace`, `reindexFile`, `removeFile`, `rebuildAll`, `search`, and feature enable/disable helpers.
- Desktop semantic search host - Electron main owned worker lifecycle, workspace switch teardown, status reporting, and safe IPC exposure.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- `packages/runtime/src/semantic-search/` - planned home for runtime-owned semantic search modules.
- `packages/runtime/src/workspace/` - existing workspace bootstrap and path-layout helpers that semantic search must align with.
- `packages/contracts/src/ipc/contracts.ts` - typed IPC request and response definitions for desktop exposure.
- `packages/contracts/src/workspace/layout.ts` - workspace root conventions that must stay compatible with semantic index placement.
- `packages/desktop/src/main/` - privileged Electron host for worker startup, file watching, workspace switching, and IPC registration.
- `packages/desktop/src/preload/index.ts` - sandbox-safe bridge exposing only narrow semantic search methods.
- `packages/desktop/src/renderer/env.d.ts` - renderer-facing API typing for future titlebar search integration.
- `${workspaceRoot}/.srgnt-semantic-search/` - planned default index root containing Vectra data, manifests, and derived state.
- Bundled model assets under the packaged desktop app resources - local-only model files resolved by desktop and passed to runtime config.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- Semantic search must work fully offline from first launch. No first-run model download, cloud fallback, or remote embedding API is allowed.
- `.agent-vault/` must be excluded completely from crawling, chunking, embedding, search results, caches, and watchers.
- Hidden directories, symlinks, escaped paths, and the semantic index directory itself must also be excluded centrally.
- The workspace remains the source of truth. Vectors, manifests, and caches are derived acceleration data only.
- Model identity, chunking strategy, and index schema version must be part of the persistent manifest so incompatible changes trigger rebuilds instead of undefined behavior.
- Heavy embedding and indexing work must stay off the renderer and off the Electron UI thread.
- Search result payloads should remain minimal: score, chunk metadata, safe snippet text, and workspace-relative identifiers where practical.
- The subsystem must stay Effect-first: explicit service tags, layers, typed errors, and lifecycle boundaries rather than ad hoc singletons.

## Failure Modes

- Model asset path is missing or packaged incorrectly, causing offline startup failure.
- Corpus rules drift between search, wikilinks, and watchers, causing missing or inconsistent results.
- The worker is not torn down on workspace switch, leaking results or stale vectors across workspaces.
- Index manifests become incompatible with a new model id or chunking strategy but are reused accidentally.
- The crawler indexes the semantic index directory, `.agent-vault`, or hidden/system paths, creating privacy leaks or self-indexing loops.
- File deletes, renames, or exclusion-rule changes leave stale vectors searchable.
- Vectra corruption or partial writes leave the index unreadable without a clean rebuild path.
- CPU-heavy inference runs on the Electron main thread and freezes the desktop shell.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]
- [[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage and Persistence Model]]
- [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract]]
- [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Notes workspace boundary and cross-workspace navigation rules]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]
- [[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]
- [[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]]
- [[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|PHASE-16 Runtime Semantic Search Engine]]
- [[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|PHASE-17 Desktop Semantic Search Integration]]
<!-- AGENT-END:architecture-related-notes -->
