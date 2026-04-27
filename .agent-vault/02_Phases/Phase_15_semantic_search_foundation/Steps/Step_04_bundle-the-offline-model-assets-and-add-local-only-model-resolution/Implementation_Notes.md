# Implementation Notes

- Keep model id, asset path, and expected embedding dimension in the manifest/config contract so later rebuild logic can detect incompatibility.
- If the default model proves too large or unstable in packaged validation, record a superseding decision rather than silently swapping it.

## Related Notes

- Step: [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_04_bundle-the-offline-model-assets-and-add-local-only-model-resolution|STEP-15-04 Bundle the offline model assets and add local-only model resolution]]
- Phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]
