# Implementation Notes

- Preserve source `mtimeMs` separately from the content hash so unchanged timestamp-only files and hash-only changes can both be reasoned about explicitly.
- Do not log full chunk bodies by default.

## Related Notes

- Step: [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_03_implement-markdown-frontmatter-parsing-heading-aware-chunking-and-wikilink-extraction|STEP-15-03 Implement markdown frontmatter parsing, heading-aware chunking, and wikilink extraction]]
- Phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]
