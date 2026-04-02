---
note_type: bug
template_version: 2
contract_version: 1
title: 'RESEARCH: Query Engine Memory Scaling for Thousands of Documents'
bug_id: BUG-0001
status: closed
severity: sev-3
category: performance
reported_on: '2026-03-22'
fixed_on: '2026-04-02'
owner: ''
created: '2026-03-22'
updated: '2026-03-22'
related_notes:
  - '[[04_Decisions/DEC-0011|Decision DEC-0011 (SimpleQueryEngine choice)]]'
  - '[[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04]]'
  - '[[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem|STEP-03-05]]'
tags:
  - agent-vault
  - bug
  - research-needed
  - scaling
---

# BUG-0001 - RESEARCH: Query Engine Memory Scaling for Thousands of Documents

## Summary

The current SimpleQueryEngine + CanonicalStore design loads all entity metadata into memory. This works for hundreds to low thousands of entities, but will hit limits with large document counts (thousands+).

**Decision reference**: This was documented in DEC-0011 as a known tradeoff of the SimpleQueryEngine approach.

## Observed Behavior

- CanonicalStore holds all EntityEnvelope objects in a Map<string, EntityEnvelope>
- No pagination exists at the store level
- All entities are loaded at startup
- No disk-backed cold storage

## Expected Behavior

- App should handle thousands of documents without memory issues
- Lazy loading / on-demand fetching
- Disk-backed index for cold data
- Memory-bounded cache with eviction

## Suspected Root Cause

- Simplicity tradeoff made in DEC-0011 (Dataview extraction was rejected as too complex)
- In-memory design chosen for v1 simplicity
- No pagination or caching layer

## Reproduction Steps

- Open the runtime/query notes and inspect the current `CanonicalStore` / `SimpleQueryEngine` design assumptions.
- Reason about workloads with thousands of documents because the bug is presently a documented scaling risk rather than a reproduced end-user crash.

## Scope / Blast Radius

- Affects future large-workspace performance for runtime query/index work.
- Does not block the current v1 fixture-backed workflows at typical Phase 03 scale.

## Confirmed Root Cause

- Not yet confirmed. This note tracks a research-backed risk that was intentionally accepted in [[04_Decisions/DEC-0011|Decision DEC-0011 (SimpleQueryEngine choice)]].
Three scaling issues confirmed in the v1 in-memory design:

1. **Full-scan type lookups**: Both `CanonicalStore.findByType()` and `SimpleQueryEngine` query methods called `Array.from(entities.values()).filter(...)` on every type query — O(n) over all entities regardless of how many match the requested type.

2. **No pagination support**: `findEntitiesByType` and `listEntities` always materialized and returned all matching results with no limit/offset, forcing callers to hold entire result sets in memory.

3. **Unbounded growth**: No eviction mechanism existed. Every entity added was retained forever in memory with no capacity limit.

4. **Incorrect total reporting**: `SimpleQueryEngine.executeStructuredQuery` reported `total` after applying `limit`, making it impossible for callers to know the true result count for pagination UIs.

**Fix applied**: Added secondary type indexes (`Map<string, Set<string>>`) to both CanonicalStore and SimpleQueryEngine for O(1) type lookups. Added `PaginationOptions` (limit/offset) to store methods. Added LRU eviction with configurable `maxCapacity` using Map insertion-order semantics. Fixed query engine `total` to report pre-pagination count and added `offset` support to `DataviewQuery`.
Confirmed in code: the main remaining scaling bug was that paginated type queries still materialized all matching entities before slicing. `CanonicalStore.findByType()` built a full `results` array from the per-type index and only then applied pagination, and `SimpleQueryEngine.executeStructuredQuery()` did the same for `from` queries before applying `limit` / `offset`. That preserved O(n) memory growth for large typed result sets even when callers only requested a small page.

Fix applied on 2026-04-02:
- `CanonicalStore.findByType()` now walks the type index lazily and only collects the requested page window.
- `SimpleQueryEngine` now computes `total` from index metadata and, for unsorted typed queries, only materializes the requested page instead of the full match set.
- Regression tests now cover deep-offset pagination against thousands of typed entities in both the store and query engine.

## Workaround

- Keep current workspaces and fixture loads within the documented v1 scale expectations until a larger-store strategy is chosen.

## Permanent Fix Plan

- Use the research questions in this note to choose and implement the next-step storage/index strategy when scale pressure becomes real.

## Regression Coverage Needed

- Add workload-focused performance checks and representative large-workspace fixtures once a permanent storage/index strategy is implemented.

## Research Questions

1. **Lazy Loading**: Should entities be loaded on-demand rather than at startup?
   - Pro: Constant memory regardless of entity count
   - Con: First query is slower, need cache invalidation

2. **Pagination**: Should findEntitiesByType support limit/offset?
   - Pro: Simple to implement, predictable memory
   - Con: Cursor-based pagination more efficient for large offsets

3. **Disk-Backed Index**: Should we use SQLite/LevelDB instead of in-memory Map?
   - Pro: Persistent, queryable, bounded memory
   - Con: Adds native dependency, sync complexity

4. **Dataview Revisited**: Should we reconsider file-watching + on-disk index?
   - Pro: Already proven at scale in Obsidian ecosystem
   - Con: Complex, couples to filesystem events

5. **Memory Bounded Cache**: Should we add LRU eviction to CanonicalStore?
   - Pro: Simple to add, bounds memory growth
   - Con: Eviction policy needs careful design

## Suggested Approaches (Ordered by Effort)

### Low Effort
- Add pagination to `findEntitiesByType(..., { limit, offset })`
- Add LRU cache wrapper around CanonicalStore

### Medium Effort
- Replace Map with SQLite-backed store
- Add lazy loading with background refresh

### High Effort
- Implement full Dataview-style file watching
- Build cursor-based pagination
- Implement full query planner

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- [[04_Decisions/DEC-0011|Decision DEC-0011 (SimpleQueryEngine choice)]]
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04]]
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem|STEP-03-05]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-03-22 - Reported by user during review
<!-- AGENT-END:bug-timeline -->
