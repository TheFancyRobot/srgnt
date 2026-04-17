# Semantic Search Validation Documentation

## Overview

This document records the test coverage, residual risks, and known limitations for the semantic search subsystem implemented in Phase 17.

## Test Coverage

### Unit Tests

- `host.test.ts`: 26 tests covering SemanticSearchHost lifecycle, idempotent initialization, workspace switching, worker crash handling, auto-init search, and rebuild failure recovery
- `worker.test.ts`: 8 tests covering worker initialization, command routing, teardown, and unknown-command handling
- `status.test.ts`: 5 tests covering empty/indexing/error/completed status helper behavior
- `workspace-watcher.test.ts`: 9 tests covering watcher startup/cleanup, debounce behavior, rename add/unlink mapping, and excluded paths
- `ipc-handlers.test.ts`: 32 tests verifying IPC handler registration, schema parsing, channel synchronization, and renderer/main API alignment

### Integration Tests (E2E)

| Test File | Coverage |
|-----------|----------|
| `semantic-search-e2e.spec.ts` | Preload API access, search execution, result delivery, workspace switching, status reporting |
| `semantic-search-offline.e2e.spec.ts` | Offline execution checks, no external network calls, local model-path wiring smoke checks |
| `semantic-search-packaged.e2e.spec.ts` | Packaged build validation, worker thread startup smoke checks, packaged model-path wiring checks |
| `semantic-search-failure.e2e.spec.ts` | Corrupt index handling, missing workspace behavior, stale workspace cleanup, error-state shape |

### IPC Contract Tests

- `contracts.test.ts` (in @srgnt/contracts): Schema validation for all request/response types

## Residual Risks

### Performance Risks

1. **Large workspace indexing**: Initial indexing of workspaces with thousands of markdown files may take significant time. The 30-second timeout on worker requests may be insufficient for very large workspaces.

2. **Memory usage during batching**: The embedding service batches content through the transformers pipeline. Large batches may consume significant memory.

3. **Worker thread blocking**: While indexing/search runs in a worker thread, the main process still manages IPC communication. High-frequency search requests could queue up.

4. **File watcher debouncing**: The 500ms debounce window may not be optimal for all use cases. Rapid file changes during editing could trigger multiple reindex operations.

### Packaging Risks

1. **Model asset path**: The bundled model path (`node_modules/@huggingface/transformers/models/`) must exist in the packaged build. Electron-builder configuration must ensure these assets are included.

2. **Worker thread compatibility**: The `worker_threads` module may behave differently in packaged builds vs development. Testing in `semantic-search-packaged.e2e.spec.ts` validates this.

3. **Cross-platform worker threads**: Worker thread behavior may vary between Linux, macOS, and Windows. Current E2E tests only run on Linux.

### Offline Operation Risks

1. **Bundle completeness**: The `@huggingface/transformers` package must be fully bundled. If any dynamic imports or optional dependencies are missing, offline operation will fail.

2. **Model file availability**: The actual model files (`.safetensors` or `.bin`) must be present in the bundled assets. If the model download was incomplete, embeddings will fail.

3. **Current validation depth**: The offline and packaged E2E tests currently prove desktop-boundary wiring, no-external-network behavior, and local model-path configuration. They do **not** yet prove real embedding inference because the worker still falls back to a stub semantic-search service in this phase.

## Known Limitations

1. **Stubbed worker runtime in this phase**: The worker lifecycle and desktop integration are real, but the current worker still uses a stub semantic-search service rather than full embedding/index/query execution. Search and indexing boundary tests therefore validate contract shape and orchestration more than retrieval quality.

2. **No incremental file updates**: The current implementation triggers full reindex on any file change. A more sophisticated approach would track mtimes and content hashes.

3. **No search result ranking customization**: The `minScore` threshold is basic. Advanced ranking (combining semantic similarity with recency, file type, etc.) is not yet implemented.

4. **No index persistence inspection**: Users cannot inspect or manually manage the Vectra index. The `.srgnt-semantic-search` directory is opaque.

5. **No semantic search UI controls**: There's no UI for enabling/disabling semantic search, viewing indexing progress, or clearing the index. These operations are only available via IPC.

6. **Wikilink-aware search not implemented**: Search results don't currently boost matches that are referenced via wikilinks in the query document.

7. **Single-workspace index isolation**: If a user opens a different workspace, the index for the previous workspace is preserved on disk but not automatically loaded. Each workspace has independent indexing.

## Architecture Notes

### Worker Thread Model

```
Main Process                    Worker Thread
    |                               |
    |-- initialize() -------------->|
    |                               |-- Load runtime Effect layers
    |                               |-- Initialize embedding pipeline
    |<-- ready ----------------------|
    |                               |
    |-- indexWorkspace() ----------->|
    |                               |-- Run WorkspaceIndexer
    |<-- result --------------------|
    |                               |
    |-- search() ------------------->|
    |                               |-- Embed query
    |                               |-- Query Vectra
    |<-- results -------------------|
```

### Status State Machine

```
uninitialized --> initializing --> ready
                              \        |
                              error    +--> indexing --> ready
                                           \           |
                                           error ------+
```

## Running Tests

```bash
# Unit tests
pnpm --filter @srgnt/desktop test

# Integration tests (requires build)
pnpm --filter @srgnt/desktop test:e2e

# Packaged build tests (requires pack)
pnpm --filter @srgnt/desktop test:e2e:packaged:linux

# Full test suite
pnpm --filter @srgnt/desktop test:e2e:full
```

## Debugging

### Enable verbose logging

The semantic search host and worker emit structured logs with the prefix `[semantic-search-host]` and `[semantic-search-worker]`. Enable Electron's devtools to view these in the console.

### Check index state

The index state is stored in `.srgnt-semantic-search/` at the workspace root. The `manifest.json` file contains metadata about indexed files.

### Verify worker is running

Call `window.srgnt.semanticSearchStatus(workspaceRoot)` from the renderer console. If `state` is `'error'`, check the main process logs for worker errors.
