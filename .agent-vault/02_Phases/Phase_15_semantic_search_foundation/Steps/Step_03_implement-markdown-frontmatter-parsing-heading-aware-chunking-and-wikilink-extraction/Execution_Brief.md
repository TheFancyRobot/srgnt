# Execution Brief

## Why This Step Exists

- Chunk shape is the semantic index contract. If title derivation, heading paths, or overlap rules drift later, vector persistence and rebuild behavior become brittle.

## Prerequisites

- STEP-15-01 and STEP-15-02 complete.

## Relevant Code Paths

- `packages/runtime/src/semantic-search/` (new)
- `packages/runtime/src/query/`
- `packages/runtime/src/workspace/`

## Execution Prompt

1. Parse YAML frontmatter when present and derive `title` from frontmatter `title` before falling back to the filename.
2. Split markdown by headings first and derive a stable `headingPath` for each chunk.
3. Split oversized sections again using configurable chunk size and overlap.
4. Extract wikilinks from chunk text and include them in metadata.
5. Compute deterministic content hashes and chunk ids from normalized metadata so stale-vector deletion is reliable.
6. Add tests for frontmatter title handling, heading-aware splitting, overlap behavior, and wikilink extraction.

## Related Notes

- Step: [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_03_implement-markdown-frontmatter-parsing-heading-aware-chunking-and-wikilink-extraction|STEP-15-03 Implement markdown frontmatter parsing, heading-aware chunking, and wikilink extraction]]
- Phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]
