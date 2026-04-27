# Implementation Notes

- This service should return workspace-relative or canonical absolute paths consistently so later manifests and search results do not drift.
- Treat the semantic index directory itself as excluded from day one to avoid self-indexing loops.

## Related Notes

- Step: [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_02_implement-canonical-workspace-markdown-corpus-policy-and-exclusions|STEP-15-02 Implement canonical workspace markdown corpus policy and exclusions]]
- Phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]
