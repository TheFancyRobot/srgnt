---
note_type: phase
template_version: 2
contract_version: 1
title: Semantic Search Foundation
phase_id: PHASE-15
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-09'
depends_on:
  - '[[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]]'
  - '[[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]]'
related_architecture:
  - '[[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
  - '[[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]'
  - '[[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage and Persistence Model]]'
  - '[[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]'
related_decisions:
  - '[[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract]]'
  - '[[04_Decisions/DEC-0011_dec-0011-use-simplequeryengine-over-in-memory-canonicalstore-for-v1-query-index|DEC-0011 Use SimpleQueryEngine over in-memory CanonicalStore for v1 query/index]]'
  - '[[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Notes workspace boundary and cross-workspace navigation rules]]'
  - '[[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]'
related_bugs:
  - '[[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]'
tags:
  - agent-vault
  - phase
---

# Phase 15 Semantic Search Foundation

## Objective

- Freeze the subsystem contract, workspace-corpus policy, markdown chunking rules, and bundled-model packaging path so runtime implementation can proceed without architecture drift.
- Produce the code and durable notes needed to make semantic search an executable subsystem rather than an aspirational add-on.

## Why This Phase Exists

- The request crosses packaging, indexing, markdown semantics, and Electron privilege boundaries. If those constraints stay implicit, the implementation will fragment between runtime and desktop.
- Phase 14 already proved that whole-workspace markdown search and wikilink behavior need one central corpus policy. Semantic search must reuse that boundary instead of inventing a second crawler.
- The offline-from-first-launch requirement makes model bundling and local-only runtime configuration an early gating problem, not a late implementation detail.

## Scope

- Add the runtime and desktop contracts for semantic search configuration, IPC surface, domain types, and typed errors.
- Implement one canonical workspace markdown corpus policy that excludes `.agent-vault`, hidden/system paths, symlinks, escaped paths, and the semantic index directory itself.
- Implement markdown frontmatter parsing, title derivation, heading-first chunking, overlap splitting, and wikilink extraction in runtime-owned modules.
- Bundle the default multilingual model assets and prove local-only resolution with no remote model loading.
- Record the chosen runtime-versus-desktop hosting split and default index root in durable architecture and decision notes.

## Non-Goals

- Building the final renderer search UI.
- Implementing Vectra persistence, semantic retrieval, or Electron worker lifecycle in this phase.
- Indexing framework-managed data such as `.agent-vault` or `.command-center`.
- Mixing lexical Phase 14 notes search implementation details into the semantic engine contract beyond shared corpus rules.

## Dependencies

- Depends on [[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]] for the existing runtime package and query/index direction.
- Depends on [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]] for the clarified whole-workspace markdown inclusion and exclusion rules.
- Uses [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008]] as the persistence contract baseline.
- Uses [[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001]] as an explicit reminder that bounded corpus scope and rebuildable derived data matter.

## Acceptance Criteria

- [ ] Semantic-search architecture and ADR notes exist and define ownership, hosting, model, index-root, and exclusion rules.
- [ ] Runtime/domain contracts for semantic search are concrete enough that desktop integration can depend on them without guessing.
- [ ] One canonical workspace markdown corpus policy is defined for crawl, search, indexing, and watchers, with `.agent-vault` completely excluded.
- [ ] Markdown frontmatter parsing, title derivation, heading-aware chunking, overlap splitting, and wikilink extraction are implemented and test-covered in runtime-owned code.
- [ ] The default bundled model path is packaged and validated in local-only mode with no remote fallback.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|PHASE-16 Runtime Semantic Search Engine]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]
- [[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage and Persistence Model]]
- [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract]]
- [[04_Decisions/DEC-0011_dec-0011-use-simplequeryengine-over-in-memory-canonicalstore-for-v1-query-index|DEC-0011 Use SimpleQueryEngine over in-memory CanonicalStore for v1 query/index]]
- [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Notes workspace boundary and cross-workspace navigation rules]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- [[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_01_add-semantic-search-contracts-configuration-and-domain-errors|STEP-15-01 Add semantic search contracts, configuration, and domain errors]] -- unlocks the rest of the phase.
- [ ] [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_02_implement-canonical-workspace-markdown-corpus-policy-and-exclusions|STEP-15-02 Implement canonical workspace markdown corpus policy and exclusions]] -- can begin after Step 01.
- [ ] [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_03_implement-markdown-frontmatter-parsing-heading-aware-chunking-and-wikilink-extraction|STEP-15-03 Implement markdown frontmatter parsing, heading-aware chunking, and wikilink extraction]] -- depends on Steps 01-02.
- [ ] [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_04_bundle-the-offline-model-assets-and-add-local-only-model-resolution|STEP-15-04 Bundle the offline model assets and add local-only model resolution]] -- can run in parallel with Step 02 after Step 01.
- [ ] [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_02_gfm-compliance-test-suite|STEP-15-02 GFM Compliance Test Suite]]
<!-- AGENT-END:phase-steps -->

## Parallel Work Map

- Step 01 unlocks Steps 02 and 04.
- Step 03 depends on Steps 01-02 because chunk metadata and parser outputs must align with the canonical corpus policy.
- Step 04 must complete before Phase 16 Step 02 can finish local embedding integration.

## Notes

- Planning problem restatement: deliver a local semantic-search subsystem that is offline from first launch, consistent with current workspace markdown rules, and safe to expose through Electron without widening the renderer boundary.
- This is a new initiative, not a duplicate of the existing Phase 14 whole-workspace full-text search step. The two efforts share corpus policy and path exclusions but have different storage and ranking mechanics.
- Resolved from evidence: runtime owns engine logic, desktop owns Electron wiring, derived data must remain rebuildable, and `.agent-vault` must be excluded centrally rather than filtered late.
- Assumed with rationale: the default semantic index root is `${workspaceRoot}/.srgnt-semantic-search/` because the request wants workspace-root storage while existing architecture reserves `.command-center/` for framework-managed state.
- Assumed with rationale: `.command-center/` stays out of the semantic corpus even though the user only explicitly called out `.agent-vault`, because current Notes-workspace rules already exclude framework-managed hidden content and indexing it would weaken the user-content boundary.
- Assumed with rationale: the default bundled model is `Xenova/paraphrase-multilingual-MiniLM-L12-v2` via local-only `@huggingface/transformers` because it is small, multilingual, and compatible with bundled local model paths. If packaging or performance disproves this, supersede DEC-0015 rather than drifting silently.
- Pitfall notes: Vectra loads its index into memory, so bounded corpus scope, stale-vector cleanup, and rebuild-on-version-change must be explicit from day one.
