# Execution Brief

## Why This Step Exists

- Offline-from-first-launch is a hard product requirement. It is only real when packaged builds can locate and load the model with remote loading disabled.

## Prerequisites

- STEP-15-01 complete.

## Relevant Code Paths

- `packages/desktop/package.json`
- desktop build and packaging config under `packages/desktop/`
- runtime semantic-search model loader modules

## Execution Prompt

1. Add the local embedding runtime dependency and the chosen default model assets to the desktop packaging flow.
2. Configure local-only model resolution with remote loading disabled.
3. Ensure runtime can receive a packaged model path through config instead of hardcoding dev-only paths.
4. Add validation that fails clearly when model assets are missing or mismatched.
5. Add at least one packaged-build or simulated-offline test proving local-only resolution works.

## Related Notes

- Step: [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_04_bundle-the-offline-model-assets-and-add-local-only-model-resolution|STEP-15-04 Bundle the offline model assets and add local-only model resolution]]
- Phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]
