---
note_type: decision
template_version: 2
contract_version: 1
title: DEC-0011 Use SimpleQueryEngine over in-memory CanonicalStore for v1 query/index
decision_id: DEC-0011
status: accepted
decided_on: '2026-03-22'
owner: ''
created: '2026-03-22'
updated: '2026-03-22'
supersedes:
  - DEC-0007
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]]'
  - '[[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04]]'
  - '[[05_Sessions/2026-03-31-033706-add-ipc-channels-and-main-process-handlers-for-notes-file-operations-opencode|SESSION-2026-03-31-033706 OpenCode session for Add IPC channels and main process handlers for notes file operations]]'
tags:
  - agent-vault
  - decision
---

# DEC-0011 - Use SimpleQueryEngine over in-memory CanonicalStore for v1 query/index

## Status

- Current status: accepted.
- Supersedes: DEC-0007 (Dataview query engine direction).

## Context

DEC-0007 proposed using the Obsidian Dataview query engine extracted as a standalone library for querying markdown files. STEP-03-04 required a feasibility spike to confirm this approach. This decision records the spike findings and supersedes DEC-0007 for v1.

### Dataview Feasibility Spike Findings

1. **Dataview architecture:** Obsidian Dataview is tightly coupled to Obsidian's plugin runtime. Its core dependencies are:
   - `MetadataCache` - Obsidian's in-memory cache of vault metadata
   - `Vault` - Obsidian's file system abstraction
   - `App` - Obsidian's application context
   
2. **Standalone extraction reality:** There is no standalone `obsidian-dataview` npm package. The Dataview source code is designed as an Obsidian plugin, not a library. Extracting just the query engine would require:
   - Forking and rewriting the Dataview core
   - Implementing shims for MetadataCache, Vault, and App interfaces
   - Ongoing maintenance to track Dataview releases
   - Significant testing effort to ensure query equivalence

3. **Current codebase state:**
   - `SimpleQueryEngine` already exists in `packages/runtime/src/query/engine.ts`
   - Operates on in-memory `EntityEnvelope` objects from CanonicalStore
   - Supports DQL-like `FROM` queries and structured queries
   - Supports filtering, sorting, and pagination
   - Already has test coverage

4. **Alternative paths considered:**
   - Build a markdown file parser (gray-matter + frontmatter) and index files → adds complexity, still not Dataview
   - Use a simple in-memory index over CanonicalStore → already implemented, pragmatic for v1
   - Full Dataview extraction → high effort, high maintenance, not feasible for v1 timeline

## Decision

Use the **SimpleQueryEngine over in-memory CanonicalStore** as the v1 query/index approach. This means:

- Entities are stored in the CanonicalStore (in-memory Map)
- SimpleQueryEngine queries the CanonicalStore's EntityEnvelope objects
- No markdown file parsing or Dataview extraction for v1
- The markdown file layer is handled by workspace bootstrap (STEP-02-03) for persistence, but queries operate on the in-memory store

**Boundary of this decision:**
- This applies to v1 query/index needs (filter, sort, list by type)
- This does NOT preclude adding markdown-file-based indexing later if Dataview extraction becomes feasible
- The CanonicalStore remains the in-memory working set; markdown files are the persistence layer

## Alternatives Considered

1. **Dataview extraction (DEC-0007 direction):** Rejected — not feasible for v1. Dataview is tightly coupled to Obsidian APIs. Extraction would require significant fork effort and ongoing maintenance. Not practical given v1 timeline constraints.

2. **Gray-matter + custom indexer:** Building a markdown parser and custom query engine from scratch adds complexity without clear benefit over SimpleQueryEngine. Rejected for v1.

3. **SQLite/LevelDB:** These add a separate data store that must sync with markdown files. Adds complexity and sync drift risk. Not aligned with local-first philosophy. Rejected.

## Tradeoffs

- **Pro:** SimpleQueryEngine is already implemented and working
- **Pro:** Zero new dependencies (no Obsidian coupling, no markdown parsing libraries yet)
- **Pro:** In-memory queries are fast for typical workspace sizes
- **Pro:** Easy to reason about and debug
- **Con:** Entities must be loaded into CanonicalStore before they can be queried (not direct markdown file queries)
- **Con:** If CanonicalStore grows very large, query performance may degrade (mitigated by pagination)
- **Con:** Markdown files are not directly queryable (can only query entities that have been loaded)

## Consequences

- DEC-0007 is superseded for v1
- `packages/runtime/src/query/engine.ts` (SimpleQueryEngine) is the production query engine
- STEP-03-05 can proceed with SimpleQueryEngine as the foundation
- Future phases can revisit Dataview-style markdown file indexing if needed
- The workspace bootstrap (STEP-02-03 now complete) provides the disk layout; future work can add file-to-store loading if direct markdown querying becomes necessary

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]]
- STEP-03-04 spike: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04]]
- STEP-03-05 implementation: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem|STEP-03-05]]
- Phase 14 refinement session: [[05_Sessions/2026-03-31-033706-add-ipc-channels-and-main-process-handlers-for-notes-file-operations-opencode|SESSION-2026-03-31-033706 OpenCode session for Add IPC channels and main process handlers for notes file operations]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-21 - DEC-0007 created as proposed (Dataview direction)
- 2026-03-22 - DEC-0011 created as accepted, superseding DEC-0007. Dataview feasibility spike concluded extraction is not feasible for v1. SimpleQueryEngine over CanonicalStore is the practical path forward.
<!-- AGENT-END:decision-change-log -->
