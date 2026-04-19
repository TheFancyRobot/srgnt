/**
 * @vitest-environment node
 * 
 * Worker tests that mock Effect.runPromise to avoid complex layer composition.
 * These tests verify the worker message protocol without needing the full
 * semantic search service layer construction.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Effect, Layer, Context } from 'effect';

// Create mock tags using Context.Tag
const createMockTag = (key: string) => Context.Tag(key);

// Create mock tags for all services
const mockTags = {
  AppConfig: createMockTag('srgnt/AppConfig'),
  EmbeddingService: createMockTag('srgnt/EmbeddingService'),
  MarkdownChunker: createMockTag('srgnt/MarkdownChunker'),
  IndexStateStore: createMockTag('srgnt/IndexStateStore'),
  VectraStore: createMockTag('srgnt/VectraStore'),
  WorkspaceIndexer: createMockTag('srgnt/WorkspaceIndexer'),
  SemanticSearchService: createMockTag('srgnt/SemanticSearchService'),
};

// Stub implementations
const stubs = {
  AppConfig: {
    getConfig: () => Effect.succeed({
      workspaceRoot: '/workspace',
      indexRoot: '/workspace/.srgnt',
      modelAssetPath: '/models',
      chunkSize: 1000,
      overlap: 200,
      batchSize: 32,
      exclusions: [] as readonly string[],
    }),
    getCorpusPolicyConfig: () => Effect.succeed({
      workspaceRoot: '/workspace',
      exclusions: [] as readonly string[],
      maxFileSizeBytes: 5 * 1024 * 1024,
      acceptedExtensions: ['.md', '.markdown'] as readonly string[],
    }),
  },
  SemanticSearchService: {
    init: () => Effect.void,
    indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
    removeFile: () => Effect.void,
    rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    search: () => Effect.succeed([]),
    getFeatureState: () => Effect.succeed('uninitialized' as const),
  },
  EmbeddingService: {
    initialize: () => Effect.void,
    embedText: () => Effect.succeed({ modelId: 'stub', embedding: [], dimension: 0 }),
    embedBatch: () => Effect.succeed([{ modelId: 'stub', embedding: [], dimension: 0 }]),
    dispose: () => Effect.void,
  },
  MarkdownChunker: { chunkFile: () => Effect.succeed([]), chunkFiles: () => Effect.succeed([]) },
  IndexStateStore: {
    loadManifest: () => Effect.succeed(null),
    saveManifest: () => Effect.void,
    getFileStatus: () => Effect.succeed({ isIndexed: false, chunkCount: 0 }),
    removeFile: () => Effect.void,
    clearManifest: () => Effect.void,
  },
  VectraStore: {
    openIndex: () => Effect.void,
    addItems: () => Effect.void,
    query: () => Effect.succeed([]),
    removeByPath: () => Effect.void,
    clearIndex: () => Effect.void,
    dispose: () => Effect.void,
  },
  WorkspaceIndexer: {
    indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
    removeFile: () => Effect.void,
    rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
  },
};

// Create layers from mock tags with stub implementations
const mockLayers = {
  AppConfigLayer: Layer.succeed(mockTags.AppConfig, stubs.AppConfig),
  EmbeddingServiceLayer: Layer.succeed(mockTags.EmbeddingService, stubs.EmbeddingService),
  MarkdownChunkerLayer: Layer.succeed(mockTags.MarkdownChunker, stubs.MarkdownChunker),
  IndexStateStoreLayer: Layer.succeed(mockTags.IndexStateStore, stubs.IndexStateStore),
  VectraStoreLayer: Layer.succeed(mockTags.VectraStore, stubs.VectraStore),
  WorkspaceIndexerLayer: Layer.succeed(mockTags.WorkspaceIndexer, stubs.WorkspaceIndexer),
  SemanticSearchServiceLayer: Layer.succeed(mockTags.SemanticSearchService, stubs.SemanticSearchService),
};

// Mock the entire @srgnt/runtime module
vi.mock('@srgnt/runtime', () => ({
  AppConfigTag: mockTags.AppConfig,
  AppConfigLayer: mockLayers.AppConfigLayer,
  EmbeddingServiceTag: mockTags.EmbeddingService,
  EmbeddingServiceLayer: mockLayers.EmbeddingServiceLayer,
  MarkdownChunkerTag: mockTags.MarkdownChunker,
  MarkdownChunkerLayer: mockLayers.MarkdownChunkerLayer,
  IndexStateStoreTag: mockTags.IndexStateStore,
  IndexStateStoreLayer: mockLayers.IndexStateStoreLayer,
  VectraStoreTag: mockTags.VectraStore,
  VectraStoreLayer: mockLayers.VectraStoreLayer,
  WorkspaceIndexerTag: mockTags.WorkspaceIndexer,
  WorkspaceIndexerLayer: mockLayers.WorkspaceIndexerLayer,
  SemanticSearchServiceTag: mockTags.SemanticSearchService,
  SemanticSearchServiceLayer: mockLayers.SemanticSearchServiceLayer,
}));

const postMessage = vi.fn();
let messageHandler: ((msg: Record<string, unknown>) => Promise<void> | void) | null = null;

vi.mock('node:worker_threads', () => ({
  parentPort: {
    on: vi.fn((event: string, handler: (msg: Record<string, unknown>) => Promise<void> | void) => {
      if (event === 'message') {
        messageHandler = handler;
      }
    }),
    postMessage,
  },
}));

describe('semantic-search worker', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    messageHandler = null;
    await import('./worker.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function send(msg: Record<string, unknown>) {
    if (!messageHandler) {
      throw new Error('worker message handler not registered');
    }
    await messageHandler(msg);
  }

  const config = {
    workspaceRoot: '/workspace',
    indexRoot: '/workspace/.srgnt-semantic-search',
    modelAssetPath: '/models',
    chunkSize: 1000,
    overlap: 200,
    batchSize: 32,
    exclusions: ['.agent-vault'],
  };
  it('tears down and rejects later work until reinitialized', async () => {
    await send({ type: 'init', id: 'init-1', config });
    postMessage.mockClear();

    await send({ type: 'teardown', id: 'teardown-1' });
    expect(postMessage).toHaveBeenCalledWith({
      type: 'result',
      id: 'teardown-1',
      data: { success: true },
    });

    postMessage.mockClear();
    await send({ type: 'search', id: 'search-2', query: 'after teardown' });
    expect(postMessage).toHaveBeenCalledWith({
      type: 'error',
      id: 'search-2',
      error: 'Service not initialized',
    });
  });

  it('responds with an unknown command error', async () => {
    await send({ type: 'mystery', id: 'bad-1' });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'error',
      id: 'bad-1',
      error: 'Unknown command: mystery',
    });
  });
});