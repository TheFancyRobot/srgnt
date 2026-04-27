# Implementation Notes

- Keep result metadata aligned with the required chunk fields: `id`, `filePath`, `fileName`, `title`, `headingPath`, `chunkIndex`, `chunkText`, `wikilinks`, `mtimeMs`, `contentHash`, and `modelId`.
- Error types should distinguish configuration failure, model asset failure, index corruption, crawl-policy violation, and unsupported-file conditions.

## Related Notes

- Step: [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_01_add-semantic-search-contracts-configuration-and-domain-errors|STEP-15-01 Add semantic search contracts, configuration, and domain errors]]
- Phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]
