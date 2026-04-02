---
note_type: bug
template_version: 2
contract_version: 1
title: 'RESEARCH: Query Engine Memory Scaling for Thousands of Documents'
bug_id: BUG-0001
status: open
severity: sev-3
category: performance
reported_on: '2026-03-22'
fixed_on: ''
owner: ''
created: '2026-03-22'
updated: '2026-03-22'
related_notes:
  - '[[04_Decisions/DEC-0011|Decision DEC-0011 (SimpleQueryEngine choice)]]'
  - '[[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04]]'
  - '[[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem|STEP-03-05]]'
  - '[[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]'
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
- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-03-22 - Reported by user during review
<!-- AGENT-END:bug-timeline -->
