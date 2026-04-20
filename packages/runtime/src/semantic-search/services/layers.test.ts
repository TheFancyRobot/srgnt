import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Effect, Layer } from 'effect';
import * as fs from 'fs/promises';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { SearchOptions, IndexManifest } from '../types.js';
import type { EmbeddingResult } from '../embedding-service.js';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';
import {
  AppConfigTag,
  EmbeddingServiceTag,
  MarkdownChunkerTag,
  IndexStateStoreTag,
  VectraStoreTag,
  WorkspaceIndexerTag,
  SemanticSearchServiceTag,
} from './tags.js';
import {
  AppConfigLayer,
  EmbeddingServiceLayer,
  MarkdownChunkerLayer,
  IndexStateStoreLayer,
  VectraStoreLayer,
  WorkspaceIndexerLayer,
  SemanticSearchServiceLayer,
} from './layers.js';
import { SemanticSearchError, ModelAssetError, IndexCorruptionError } from '../errors.js';
import type { AppConfigService } from './types.js';

// --- Mock embedding-service module ---
// The real layer imports createEmbeddingPipeline, embedText, embedBatch.
// We mock them to control pipeline creation and embedding generation.

const mockPipeline = vi.fn();

vi.mock('../embedding-service.js', () => ({
  createEmbeddingPipeline: vi.fn(),
  embedText: vi.fn(),
  embedBatch: vi.fn(),
  EXPECTED_EMBEDDING_DIMENSION: 384,
  DEFAULT_MODEL_ID: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
}));

// Import the mocked functions after vi.mock setup
import {
  createEmbeddingPipeline,
  embedText as rawEmbedText,
  embedBatch as rawEmbedBatch,
} from '../embedding-service.js';

const mockedCreatePipeline = vi.mocked(createEmbeddingPipeline);
const mockedEmbedText = vi.mocked(rawEmbedText);
const mockedEmbedBatch = vi.mocked(rawEmbedBatch);

function makeFakePipeline(): FeatureExtractionPipeline {
  return vi.fn() as unknown as FeatureExtractionPipeline;
}

// Helper to run an Effect with a given layer.
function runWithLayer<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  layer: Layer.Layer<R, never, never>,
): Promise<A> {
  const program = Effect.provide(effect, layer);
  return Effect.runPromise(program as Effect.Effect<A, never, never>);
}

/** Build a test AppConfig layer that provides the given modelAssetPath */
function testAppConfigLayer(modelAssetPath = '/fake/model/path') {
  return Layer.succeed(AppConfigTag, {
    getConfig: () =>
      Effect.succeed({
        workspaceRoot: '',
        indexRoot: '',
        modelAssetPath,
        chunkSize: 1000,
        overlap: 200,
        batchSize: 32,
        exclusions: [] as readonly string[],
      }),
    getCorpusPolicyConfig: () =>
      Effect.succeed({
        workspaceRoot: '',
        exclusions: [] as readonly string[],
        maxFileSizeBytes: 5 * 1024 * 1024,
        acceptedExtensions: ['.md', '.markdown'],
      }),
  } satisfies AppConfigService);
}

/** Build the full test layer: EmbeddingServiceLayer + test AppConfig */
function testLayer(modelAssetPath = '/fake/model/path') {
  return Layer.provide(EmbeddingServiceLayer, testAppConfigLayer(modelAssetPath));
}

describe('AppConfigLayer', () => {
  it('provides getConfig returning default config', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(AppConfigTag);
        return yield* _(svc.getConfig());
      }),
      AppConfigLayer,
    );
    expect(result.workspaceRoot).toBe('');
    expect(result.chunkSize).toBe(1000);
    expect(result.overlap).toBe(200);
    expect(result.batchSize).toBe(32);
  });

  it('provides getCorpusPolicyConfig returning default policy', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(AppConfigTag);
        return yield* _(svc.getCorpusPolicyConfig());
      }),
      AppConfigLayer,
    );
    expect(result.maxFileSizeBytes).toBe(5 * 1024 * 1024);
    expect(result.acceptedExtensions).toEqual(['.md', '.markdown']);
  });
});

describe('EmbeddingServiceLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- initialize ---

  it('initialize creates pipeline via createEmbeddingPipeline and caches it', async () => {
    const fakePipeline = makeFakePipeline();
    mockedCreatePipeline.mockResolvedValueOnce({
      pipeline: fakePipeline,
      modelId: 'test-model-id',
    });

    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);
        yield* _(svc.initialize());
      }),
      testLayer(),
    );

    expect(mockedCreatePipeline).toHaveBeenCalledOnce();
    expect(mockedCreatePipeline).toHaveBeenCalledWith({
      modelAssetPath: '/fake/model/path',
    });
  });

  it('initialize maps ModelAssetError from createEmbeddingPipeline', async () => {
    mockedCreatePipeline.mockRejectedValueOnce(
      new ModelAssetError({ message: 'Model directory does not exist', assetPath: '/bad/path' }),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);
        return yield* _(Effect.either(svc.initialize()));
      }),
      testLayer('/bad/path'),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('ModelAssetError');
      expect(result.left.message).toContain('Model directory does not exist');
    }
  });

  it('initialize wraps non-ModelAssetError errors', async () => {
    mockedCreatePipeline.mockRejectedValueOnce(new Error('unexpected crash'));

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);
        return yield* _(Effect.either(svc.initialize()));
      }),
      testLayer(),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('ModelAssetError');
      expect(result.left.message).toContain('Failed to create embedding pipeline');
    }
  });

  // --- embedText ---

  it('embedText fails before initialize with not-initialized error', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);
        return yield* _(Effect.either(svc.embedText('test')));
      }),
      testLayer(),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('ModelAssetError');
      expect(result.left.message).toContain('not initialized');
    }
  });

  it('embedText succeeds after initialize, wrapping rawEmbedText', async () => {
    const fakePipeline = makeFakePipeline();
    mockedCreatePipeline.mockResolvedValueOnce({
      pipeline: fakePipeline,
      modelId: 'test-model',
    });

    const fakeResult: EmbeddingResult = {
      modelId: 'test-model',
      embedding: new Array(384).fill(0.1),
      dimension: 384,
    };
    mockedEmbedText.mockResolvedValueOnce(fakeResult);

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);
        yield* _(svc.initialize());
        return yield* _(svc.embedText('hello world'));
      }),
      testLayer(),
    );

    expect(result).toEqual(fakeResult);
    expect(mockedEmbedText).toHaveBeenCalledOnce();
    expect(mockedEmbedText).toHaveBeenCalledWith('hello world', fakePipeline, 'test-model');
  });

  it('embedText maps ModelAssetError from raw function', async () => {
    const fakePipeline = makeFakePipeline();
    mockedCreatePipeline.mockResolvedValueOnce({
      pipeline: fakePipeline,
      modelId: 'test-model',
    });
    mockedEmbedText.mockRejectedValueOnce(
      new ModelAssetError({ message: 'unexpected dimension', assetPath: 'test-model' }),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);
        yield* _(svc.initialize());
        return yield* _(Effect.either(svc.embedText('test')));
      }),
      testLayer(),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('ModelAssetError');
      expect(result.left.message).toContain('unexpected dimension');
    }
  });

  it('embedText wraps non-ModelAssetError from raw function', async () => {
    const fakePipeline = makeFakePipeline();
    mockedCreatePipeline.mockResolvedValueOnce({
      pipeline: fakePipeline,
      modelId: 'test-model',
    });
    mockedEmbedText.mockRejectedValueOnce(new Error('random failure'));

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);
        yield* _(svc.initialize());
        return yield* _(Effect.either(svc.embedText('test')));
      }),
      testLayer(),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('ModelAssetError');
      expect(result.left.message).toContain('Embedding generation failed');
    }
  });

  // --- embedBatch ---

  it('embedBatch fails before initialize with not-initialized error', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);
        return yield* _(Effect.either(svc.embedBatch(['a', 'b'])));
      }),
      testLayer(),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('ModelAssetError');
      expect(result.left.message).toContain('not initialized');
    }
  });

  it('embedBatch succeeds after initialize, wrapping rawEmbedBatch', async () => {
    const fakePipeline = makeFakePipeline();
    mockedCreatePipeline.mockResolvedValueOnce({
      pipeline: fakePipeline,
      modelId: 'test-model',
    });

    const fakeResults: EmbeddingResult[] = [
      { modelId: 'test-model', embedding: new Array(384).fill(0.2), dimension: 384 },
      { modelId: 'test-model', embedding: new Array(384).fill(0.3), dimension: 384 },
    ];
    mockedEmbedBatch.mockResolvedValueOnce(fakeResults);

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);
        yield* _(svc.initialize());
        return yield* _(svc.embedBatch(['text one', 'text two']));
      }),
      testLayer(),
    );

    expect(result).toEqual(fakeResults);
    expect(mockedEmbedBatch).toHaveBeenCalledOnce();
    expect(mockedEmbedBatch).toHaveBeenCalledWith(['text one', 'text two'], fakePipeline, 'test-model');
  });

  it('embedBatch maps ModelAssetError from raw function', async () => {
    const fakePipeline = makeFakePipeline();
    mockedCreatePipeline.mockResolvedValueOnce({
      pipeline: fakePipeline,
      modelId: 'test-model',
    });
    mockedEmbedBatch.mockRejectedValueOnce(
      new ModelAssetError({ message: 'batch dimension error', assetPath: 'test-model' }),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);
        yield* _(svc.initialize());
        return yield* _(Effect.either(svc.embedBatch(['a'])));
      }),
      testLayer(),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('ModelAssetError');
      expect(result.left.message).toContain('batch dimension error');
    }
  });

  // --- dispose ---

  it('dispose clears pipeline so subsequent embedText fails', async () => {
    const fakePipeline = makeFakePipeline();
    mockedCreatePipeline.mockResolvedValueOnce({
      pipeline: fakePipeline,
      modelId: 'test-model',
    });

    const fakeResult: EmbeddingResult = {
      modelId: 'test-model',
      embedding: new Array(384).fill(0.5),
      dimension: 384,
    };
    mockedEmbedText.mockResolvedValueOnce(fakeResult);

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);

        // Initialize → embedText works
        yield* _(svc.initialize());
        const before = yield* _(svc.embedText('works'));
        expect(before).toEqual(fakeResult);

        // Dispose → embedText fails
        yield* _(svc.dispose());
        return yield* _(Effect.either(svc.embedText('fails')));
      }),
      testLayer(),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('ModelAssetError');
      expect(result.left.message).toContain('not initialized');
    }
  });

  it('dispose then reinitialize works', async () => {
    const fakePipeline1 = makeFakePipeline();
    const fakePipeline2 = makeFakePipeline();
    mockedCreatePipeline.mockResolvedValueOnce({
      pipeline: fakePipeline1,
      modelId: 'model-v1',
    });
    mockedCreatePipeline.mockResolvedValueOnce({
      pipeline: fakePipeline2,
      modelId: 'model-v2',
    });

    const fakeResult: EmbeddingResult = {
      modelId: 'model-v2',
      embedding: new Array(384).fill(0.7),
      dimension: 384,
    };
    mockedEmbedText.mockResolvedValueOnce(fakeResult);

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);

        // First init
        yield* _(svc.initialize());
        yield* _(svc.dispose());

        // Second init with fresh pipeline
        yield* _(svc.initialize());
        return yield* _(svc.embedText('after reinit'));
      }),
      testLayer(),
    );

    expect(result.modelId).toBe('model-v2');
    expect(mockedCreatePipeline).toHaveBeenCalledTimes(2);
    expect(mockedEmbedText).toHaveBeenCalledWith('after reinit', fakePipeline2, 'model-v2');
  });

  // --- idempotent initialize ---

  it('calling initialize twice overwrites the cached pipeline', async () => {
    const fakePipeline1 = makeFakePipeline();
    const fakePipeline2 = makeFakePipeline();
    mockedCreatePipeline.mockResolvedValueOnce({
      pipeline: fakePipeline1,
      modelId: 'model-v1',
    });
    mockedCreatePipeline.mockResolvedValueOnce({
      pipeline: fakePipeline2,
      modelId: 'model-v2',
    });

    const fakeResult: EmbeddingResult = {
      modelId: 'model-v2',
      embedding: new Array(384).fill(0.9),
      dimension: 384,
    };
    mockedEmbedText.mockResolvedValueOnce(fakeResult);

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(EmbeddingServiceTag);
        yield* _(svc.initialize());
        yield* _(svc.initialize()); // second init overwrites
        return yield* _(svc.embedText('test'));
      }),
      testLayer(),
    );

    // Second pipeline should be used
    expect(mockedCreatePipeline).toHaveBeenCalledTimes(2);
    expect(result.modelId).toBe('model-v2');
  });
});

describe('MarkdownChunkerLayer', () => {
  it('chunkFile returns chunks for valid markdown', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(MarkdownChunkerTag);
        return yield* _(svc.chunkFile(
          { workspaceRelativePath: 'test.md', content: '# Hello\nWorld content here', mtimeMs: 1000 },
          { chunkSize: 1000, overlap: 200 },
        ));
      }),
      MarkdownChunkerLayer,
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.workspaceRelativePath).toBe('test.md');
    expect(result[0]!.title).toBe('test');
    expect(result[0]!.mtimeMs).toBe(1000);
  });

  it('chunkFile returns empty array for empty content', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(MarkdownChunkerTag);
        return yield* _(svc.chunkFile(
          { workspaceRelativePath: 'empty.md', content: '   ', mtimeMs: 0 },
          { chunkSize: 1000, overlap: 200 },
        ));
      }),
      MarkdownChunkerLayer,
    );
    expect(result).toEqual([]);
  });

  it('chunkFile fails for unsupported extension', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(MarkdownChunkerTag);
        return yield* _(Effect.either(svc.chunkFile(
          { workspaceRelativePath: 'test.txt', content: 'hello', mtimeMs: 0 },
          { chunkSize: 1000, overlap: 200 },
        )));
      }),
      MarkdownChunkerLayer,
    );
    expect(result._tag).toBe('Left');
  });

  it('chunkFiles returns combined chunks for multiple files', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(MarkdownChunkerTag);
        return yield* _(svc.chunkFiles(
          [
            { workspaceRelativePath: 'a.md', content: 'Content A', mtimeMs: 0 },
            { workspaceRelativePath: 'b.md', content: 'Content B', mtimeMs: 0 },
          ],
          { chunkSize: 1000, overlap: 200 },
        ));
      }),
      MarkdownChunkerLayer,
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    const paths = result.map((c) => c.workspaceRelativePath);
    expect(paths).toContain('a.md');
    expect(paths).toContain('b.md');
  });
});

describe('IndexStateStoreLayer', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'index-state-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('loadManifest returns null when no manifest exists', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(IndexStateStoreTag);
        return yield* _(svc.loadManifest(tmpDir));
      }),
      IndexStateStoreLayer,
    );
    expect(result).toBeNull();
  });

  it('saveManifest creates manifest directory and file', async () => {
    const manifest: IndexManifest = {
      modelId: 'test-model',
      version: '1',
      chunkIds: ['chunk-1', 'chunk-2'],
      contentHashes: ['hash-1', 'hash-2'],
    };

    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(IndexStateStoreTag);
        yield* _(svc.saveManifest(tmpDir, manifest));
      }),
      IndexStateStoreLayer,
    );

    const manifestPath = path.join(tmpDir, '.srgnt-semantic-search', 'manifest.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    expect(JSON.parse(content)).toEqual(manifest);
  });

  it('saveManifest then loadManifest roundtrip works', async () => {
    const manifest: IndexManifest = {
      modelId: 'test-model',
      version: '2',
      chunkIds: ['a', 'b', 'c'],
      contentHashes: ['h1', 'h2', 'h3'],
    };

    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(IndexStateStoreTag);
        yield* _(svc.saveManifest(tmpDir, manifest));
        return yield* _(svc.loadManifest(tmpDir));
      }),
      IndexStateStoreLayer,
    );

    const manifestPath = path.join(tmpDir, '.srgnt-semantic-search', 'manifest.json');
    const loaded = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    expect(loaded).toEqual(manifest);
  });

  it('getFileStatus returns unindexed status when file-index missing', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(IndexStateStoreTag);
        return yield* _(svc.getFileStatus(tmpDir, 'notes/test.md'));
      }),
      IndexStateStoreLayer,
    );
    expect(result.isIndexed).toBe(false);
    expect(result.chunkCount).toBe(0);
  });

  it('getFileStatus returns indexed status with chunkCount from file-index', async () => {
    const fileIndexPath = path.join(tmpDir, '.srgnt-semantic-search', 'file-index.json');
    await fs.mkdir(path.dirname(fileIndexPath), { recursive: true });
    await fs.writeFile(
      fileIndexPath,
      JSON.stringify({
        'notes/test.md': {
          chunkIds: ['c1', 'c2'],
          contentHashes: ['h1', 'h2'],
          mtimeMs: 12345,
          indexedAt: '2026-04-01T00:00:00.000Z',
        },
      }),
      'utf-8',
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(IndexStateStoreTag);
        return yield* _(svc.getFileStatus(tmpDir, 'notes/test.md'));
      }),
      IndexStateStoreLayer,
    );
    expect(result.isIndexed).toBe(true);
    expect(result.chunkCount).toBe(2);
    expect(result.lastIndexedAt).toBe('2026-04-01T00:00:00.000Z');
  });

  it('removeFile removes entry from file-index and updates manifest', async () => {
    const manifest: IndexManifest = {
      modelId: 'model',
      version: '1',
      chunkIds: ['c1', 'c2', 'c3'],
      contentHashes: ['h1', 'h2', 'h3'],
    };
    const manifestPath = path.join(tmpDir, '.srgnt-semantic-search', 'manifest.json');
    const fileIndexPath = path.join(tmpDir, '.srgnt-semantic-search', 'file-index.json');
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');
    await fs.writeFile(
      fileIndexPath,
      JSON.stringify({
        'notes/a.md': { chunkIds: ['c1', 'c2'], contentHashes: ['h1', 'h2'], mtimeMs: 100, indexedAt: 't1' },
        'notes/b.md': { chunkIds: ['c3'], contentHashes: ['h3'], mtimeMs: 200, indexedAt: 't2' },
      }),
      'utf-8',
    );

    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(IndexStateStoreTag);
        yield* _(svc.removeFile(tmpDir, 'notes/a.md'));
      }),
      IndexStateStoreLayer,
    );

    const loadedManifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    expect(loadedManifest.chunkIds).toEqual(['c3']);
    expect(loadedManifest.contentHashes).toEqual(['h3']);

    const loadedFileIndex = JSON.parse(await fs.readFile(fileIndexPath, 'utf-8'));
    expect(loadedFileIndex['notes/a.md']).toBeUndefined();
    expect(loadedFileIndex['notes/b.md']).toBeDefined();
  });

  it('removeFile succeeds when file not in index (no-op)', async () => {
    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(IndexStateStoreTag);
        yield* _(svc.removeFile(tmpDir, 'nonexistent.md'));
      }),
      IndexStateStoreLayer,
    );
    // No error thrown, directory still exists
    expect(await fs.stat(tmpDir)).toBeTruthy();
  });

  it('clearManifest deletes manifest directory', async () => {
    const manifestDir = path.join(tmpDir, '.srgnt-semantic-search');
    await fs.mkdir(manifestDir, { recursive: true });
    await fs.writeFile(path.join(manifestDir, 'manifest.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(manifestDir, 'file-index.json'), '{}', 'utf-8');

    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(IndexStateStoreTag);
        yield* _(svc.clearManifest(tmpDir));
      }),
      IndexStateStoreLayer,
    );

    await expect(fs.stat(manifestDir)).rejects.toThrow();
  });

  it('clearManifest succeeds when no manifest exists (no-op)', async () => {
    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(IndexStateStoreTag);
        yield* _(svc.clearManifest(tmpDir));
      }),
      IndexStateStoreLayer,
    );
    expect(await fs.stat(tmpDir)).toBeTruthy();
  });
});

// --- Mock vectra module ---
// Mirrors the full public surface of `vectra@0.9.0` LocalIndex so tests fail
// loudly with a meaningful assertion if production adds a new call path,
// instead of silently throwing a `TypeError: fn is not a function`.
const mockLocalIndexInstance = {
  // Getters on the real class. Kept as plain strings here because the mock is
  // never type-checked against `LocalIndex<T>`; the goal is behavioural parity.
  folderPath: '/mock/folder',
  indexName: 'index',
  // Mutation / lifecycle
  beginUpdate: vi.fn(),
  cancelUpdate: vi.fn(),
  createIndex: vi.fn(),
  deleteIndex: vi.fn(),
  endUpdate: vi.fn(),
  isIndexCreated: vi.fn(),
  // Item CRUD
  deleteItem: vi.fn(),
  getItem: vi.fn(),
  insertItem: vi.fn(),
  upsertItem: vi.fn(),
  // Read-only queries
  getIndexStats: vi.fn(),
  listItems: vi.fn(),
  listItemsByMetadata: vi.fn(),
  queryItems: vi.fn(),
};

vi.mock('vectra', () => {
  return {
    LocalIndex: vi.fn(() => mockLocalIndexInstance),
  };
});

describe('VectraStoreLayer', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vectra-test-'));
    vi.clearAllMocks();
    mockLocalIndexInstance.isIndexCreated.mockResolvedValue(false);
    mockLocalIndexInstance.createIndex.mockResolvedValue(undefined);
    mockLocalIndexInstance.deleteIndex.mockResolvedValue(undefined);
    mockLocalIndexInstance.beginUpdate.mockResolvedValue(undefined);
    mockLocalIndexInstance.endUpdate.mockResolvedValue(undefined);
    mockLocalIndexInstance.cancelUpdate.mockReturnValue(undefined);
    mockLocalIndexInstance.insertItem.mockResolvedValue(undefined);
    mockLocalIndexInstance.upsertItem.mockResolvedValue(undefined);
    mockLocalIndexInstance.deleteItem.mockResolvedValue(undefined);
    mockLocalIndexInstance.getItem.mockResolvedValue(undefined);
    mockLocalIndexInstance.queryItems.mockResolvedValue([]);
    mockLocalIndexInstance.listItems.mockResolvedValue([]);
    mockLocalIndexInstance.listItemsByMetadata.mockResolvedValue([]);
    mockLocalIndexInstance.getIndexStats.mockResolvedValue({ version: 1, metadata_config: {}, items: 0 });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('openIndex creates LocalIndex at indexRoot/vectors and calls createIndex when not existing', async () => {
    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        yield* _(svc.openIndex(tmpDir));
      }),
      VectraStoreLayer,
    );

    expect(mockLocalIndexInstance.isIndexCreated).toHaveBeenCalledOnce();
    expect(mockLocalIndexInstance.createIndex).toHaveBeenCalledOnce();
    expect(mockLocalIndexInstance.createIndex).toHaveBeenCalledWith({
      version: 1,
      metadata_config: { indexed: ['workspaceRelativePath'] },
    });
  });

  it('openIndex skips createIndex when index already exists', async () => {
    mockLocalIndexInstance.isIndexCreated.mockResolvedValue(true);

    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        yield* _(svc.openIndex(tmpDir));
      }),
      VectraStoreLayer,
    );

    expect(mockLocalIndexInstance.createIndex).not.toHaveBeenCalled();
  });

  it('openIndex is idempotent for the same indexRoot', async () => {
    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        yield* _(svc.openIndex(tmpDir));
        yield* _(svc.openIndex(tmpDir)); // Second call should be no-op
      }),
      VectraStoreLayer,
    );

    // LocalIndex constructor called once, isIndexCreated checked once
    expect(mockLocalIndexInstance.isIndexCreated).toHaveBeenCalledOnce();
  });

  it('openIndex fails with IndexCorruptionError on FS error', async () => {
    mockLocalIndexInstance.isIndexCreated.mockRejectedValue(new Error('disk error'));

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        return yield* _(Effect.either(svc.openIndex(tmpDir)));
      }),
      VectraStoreLayer,
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('IndexCorruptionError');
      expect(result.left.message).toContain('openIndex');
    }
  });

  it('addItems calls insertItem with correct metadata shape', async () => {
    const chunk = {
      id: 'chunk-1',
      workspaceRelativePath: 'notes/test.md',
      fileName: 'test.md',
      title: 'Test Note',
      headingPath: ['H1', 'H2'],
      chunkIndex: 0,
      chunkText: 'Hello world content',
      wikilinks: ['link-a'],
      mtimeMs: 12345,
      contentHash: 'abc123',
      modelId: 'test-model',
    };
    const embedding = [0.1, 0.2, 0.3];

    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        yield* _(svc.openIndex(tmpDir));
        yield* _(svc.addItems([{ chunk, embedding }]));
      }),
      VectraStoreLayer,
    );

    expect(mockLocalIndexInstance.beginUpdate).toHaveBeenCalledOnce();
    expect(mockLocalIndexInstance.endUpdate).toHaveBeenCalledOnce();
    expect(mockLocalIndexInstance.insertItem).toHaveBeenCalledOnce();
    expect(mockLocalIndexInstance.insertItem).toHaveBeenCalledWith({
      id: 'chunk-1',
      vector: [0.1, 0.2, 0.3],
      metadata: {
        workspaceRelativePath: 'notes/test.md',
        fileName: 'test.md',
        title: 'Test Note',
        headingPath: JSON.stringify(['H1', 'H2']),
        chunkIndex: 0,
        chunkText: 'Hello world content',
        wikilinks: JSON.stringify(['link-a']),
        mtimeMs: 12345,
        contentHash: 'abc123',
        modelId: 'test-model',
      },
    });
  });

  it('addItems fails with IndexCorruptionError when no index open', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        return yield* _(Effect.either(svc.addItems([{ chunk: {} as any, embedding: [] }])));
      }),
      VectraStoreLayer,
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('IndexCorruptionError');
      expect(result.left.message).toContain('no index open');
    }
  });

  it('query maps vectra results to SearchResult[] with score, chunk, snippet', async () => {
    mockLocalIndexInstance.queryItems.mockResolvedValueOnce([
      {
        item: {
          id: 'chunk-1',
          vector: [0.1, 0.2],
          norm: 1.0,
          metadata: {
            workspaceRelativePath: 'notes/test.md',
            fileName: 'test.md',
            title: 'Test',
            headingPath: JSON.stringify(['H1']),
            chunkIndex: 0,
            chunkText: 'A'.repeat(300), // 300 chars — snippet should be first 200
            wikilinks: JSON.stringify([]),
            mtimeMs: 100,
            contentHash: 'hash1',
            modelId: 'model-v1',
          },
        },
        score: 0.95,
      },
    ]);

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        yield* _(svc.openIndex(tmpDir));
        const opts: SearchOptions = { query: 'test', maxResults: 5, minScore: 0.5 };
        return yield* _(svc.query([0.1, 0.2, 0.3], opts));
      }),
      VectraStoreLayer,
    );

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(0.95);
    expect(result[0].chunk.id).toBe('chunk-1');
    expect(result[0].chunk.workspaceRelativePath).toBe('notes/test.md');
    expect(result[0].chunk.headingPath).toEqual(['H1']);
    expect(result[0].chunk.wikilinks).toEqual([]);
    expect(result[0].snippet).toHaveLength(200);
    expect(mockLocalIndexInstance.queryItems).toHaveBeenCalledWith([0.1, 0.2, 0.3], 5);
  });

  it('query fails with IndexCorruptionError when no index open', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        const opts: SearchOptions = { query: 'test', maxResults: 10, minScore: 0.5 };
        return yield* _(Effect.either(svc.query([1, 2, 3], opts)));
      }),
      VectraStoreLayer,
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('IndexCorruptionError');
      expect(result.left.message).toContain('no index open');
    }
  });

  it('removeByPath deletes items matching workspaceRelativePath', async () => {
    mockLocalIndexInstance.listItemsByMetadata.mockResolvedValueOnce([
      { id: 'c1', metadata: { workspaceRelativePath: 'notes/a.md' }, vector: [], norm: 1 },
      { id: 'c2', metadata: { workspaceRelativePath: 'notes/a.md' }, vector: [], norm: 1 },
    ]);

    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        yield* _(svc.openIndex(tmpDir));
        yield* _(svc.removeByPath('notes/a.md'));
      }),
      VectraStoreLayer,
    );

    expect(mockLocalIndexInstance.listItemsByMetadata).toHaveBeenCalledWith({
      workspaceRelativePath: { $eq: 'notes/a.md' },
    });
    expect(mockLocalIndexInstance.deleteItem).toHaveBeenCalledTimes(2);
    expect(mockLocalIndexInstance.deleteItem).toHaveBeenCalledWith('c1');
    expect(mockLocalIndexInstance.deleteItem).toHaveBeenCalledWith('c2');
  });

  it('removeByPath is a no-op when no items match', async () => {
    mockLocalIndexInstance.listItemsByMetadata.mockResolvedValueOnce([]);

    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        yield* _(svc.openIndex(tmpDir));
        yield* _(svc.removeByPath('nonexistent.md'));
      }),
      VectraStoreLayer,
    );

    expect(mockLocalIndexInstance.deleteItem).not.toHaveBeenCalled();
  });

  it('removeByPath skips when no index open', async () => {
    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        yield* _(svc.removeByPath('test.md'));
      }),
      VectraStoreLayer,
    );
    // No error, no vectra calls
    expect(mockLocalIndexInstance.listItemsByMetadata).not.toHaveBeenCalled();
  });

  it('dispose clears the index cache', async () => {
    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(VectraStoreTag);
        yield* _(svc.openIndex(tmpDir));
        yield* _(svc.dispose());
        // After dispose, addItems should fail (no index open)
        return yield* _(Effect.either(svc.addItems([{ chunk: {} as any, embedding: [] }])));
      }),
      VectraStoreLayer,
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('IndexCorruptionError');
      expect(result.left.message).toContain('no index open');
    }
  });
});

describe('mockLocalIndexInstance drift guard', () => {
  // Ensures the Vectra mock stays in sync with the real LocalIndex surface so
  // production calling a new method does not silently throw TypeError in tests.
  it('covers every public LocalIndex method exposed by vectra', async () => {
    const real = await vi.importActual<typeof import('vectra')>('vectra');
    const proto = real.LocalIndex.prototype as Record<string, unknown>;
    // Members TypeScript marks protected/private but that still live on the
    // prototype. Our production code cannot call these, so the mock does not
    // need to shadow them.
    const nonPublic = new Set(['loadIndexData', 'addItemToUpdate']);
    const publicMethods = Object.getOwnPropertyNames(proto).filter((name) => {
      if (name === 'constructor') return false;
      if (name.startsWith('_')) return false;
      if (nonPublic.has(name)) return false;
      const descriptor = Object.getOwnPropertyDescriptor(proto, name);
      // Skip getters — the mock holds plain fields for those.
      if (descriptor?.get) return false;
      return typeof proto[name] === 'function';
    });

    for (const method of publicMethods) {
      expect(
        (mockLocalIndexInstance as Record<string, unknown>)[method],
        `mockLocalIndexInstance is missing method "${method}" — update the mock so tests can observe calls to it`,
      ).toBeDefined();
    }
  });
});

// --- WorkspaceIndexerLayer tests ---
// The real WorkspaceIndexerLayer requires 5 service dependencies.
// We build a test layer with all mocks.

import { collectCorpusFiles as rawCollectCorpusFiles } from '../corpus-policy.js';
import { computeContentHash as rawComputeContentHash } from '../markdown-chunker.js';

vi.mock('../corpus-policy.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../corpus-policy.js')>();
  return {
    ...mod,
    collectCorpusFiles: vi.fn(),
  };
});

vi.mock('../markdown-chunker.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../markdown-chunker.js')>();
  return {
    ...mod,
    computeContentHash: vi.fn(),
  };
});

const mockedCollectCorpusFiles = vi.mocked(rawCollectCorpusFiles);
const mockedComputeContentHash = vi.mocked(rawComputeContentHash);

describe('WorkspaceIndexerLayer', () => {
  let testTmpDir: string | undefined;

  afterEach(() => {
    vi.restoreAllMocks();
    if (testTmpDir) {
      rmSync(testTmpDir, { recursive: true, force: true });
      testTmpDir = undefined;
    }
  });

  it('indexWorkspace processes files from corpus', async () => {
    // Create a real temp workspace with a file
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ws-idx-test-'));
    const workspaceDir = path.join(testTmpDir, 'workspace');
    mkdirSync(workspaceDir, { recursive: true });
    await fs.writeFile(path.join(workspaceDir, 'test.md'), '# Test\nSome content');

    mockedCollectCorpusFiles.mockResolvedValueOnce([
      { absolutePath: path.join(workspaceDir, 'test.md'), relativePath: 'test.md', size: 100, mtimeMs: 1000 },
    ]);
    mockedComputeContentHash.mockReturnValue('new-hash-unique');

    // Build test layer pointing at real workspace
    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot: workspaceDir,
        indexRoot: path.join(testTmpDir!, 'index'),
        modelAssetPath: '/fake/model',
        chunkSize: 1000,
        overlap: 200,
        batchSize: 32,
        exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot: workspaceDir,
        exclusions: [],
        maxFileSizeBytes: 5 * 1024 * 1024,
        acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: new Array(384).fill(0.1), dimension: 384 }),
      embedBatch: () => Effect.succeed([{ modelId: 'test-model', embedding: new Array(384).fill(0.1), dimension: 384 }]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockChunker = Layer.succeed(MarkdownChunkerTag, {
      chunkFile: () => Effect.succeed([{
        id: 'test-chunk-id', workspaceRelativePath: 'test.md', fileName: 'test.md',
        title: 'Test', headingPath: [] as string[], chunkIndex: 0, chunkText: 'Some content',
        wikilinks: [] as string[], mtimeMs: 1000, contentHash: 'abc123', modelId: 'test-model',
      }]),
      chunkFiles: () => Effect.succeed([]),
    } satisfies import('./types.js').MarkdownChunkerService);

    const fullLayer = Layer.provide(
      WorkspaceIndexerLayer,
      Layer.mergeAll(
        mockAppConfig,
        Layer.provide(IndexStateStoreLayer, mockAppConfig),
        mockEmbedding,
        mockChunker,
        Layer.provide(VectraStoreLayer, mockAppConfig),
      ),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(WorkspaceIndexerTag);
        return yield* _(svc.indexWorkspace());
      }),
      fullLayer,
    );

    expect(result.filesProcessed).toBe(1);
    expect(result.chunksCreated).toBe(1);
  });

  it('removeFile fails with IndexCorruptionError on an empty Vectra store', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ws-idx-test-'));
    const workspaceDir = path.join(testTmpDir, 'workspace');
    mkdirSync(workspaceDir, { recursive: true });

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot: workspaceDir, indexRoot: path.join(testTmpDir!, 'index'),
        modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot: workspaceDir, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void, embedText: () => Effect.succeed({ modelId: 'm', embedding: [], dimension: 0 }),
      embedBatch: () => Effect.succeed([]), dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockChunker = Layer.succeed(MarkdownChunkerTag, {
      chunkFile: () => Effect.succeed([]), chunkFiles: () => Effect.succeed([]),
    } satisfies import('./types.js').MarkdownChunkerService);

    const fullLayer = Layer.provide(
      WorkspaceIndexerLayer,
      Layer.mergeAll(
        mockAppConfig,
        Layer.provide(IndexStateStoreLayer, mockAppConfig),
        mockEmbedding,
        mockChunker,
        Layer.provide(VectraStoreLayer, mockAppConfig),
      ),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(WorkspaceIndexerTag);
        return yield* _(Effect.either(svc.removeFile('test.md')));
      }),
      fullLayer,
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(IndexCorruptionError);
    }
  });

  it('reindexFile fails for non-existent file', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ws-idx-test-'));

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot: testTmpDir!, indexRoot: path.join(testTmpDir!, 'index'),
        modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot: testTmpDir!, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void, embedText: () => Effect.succeed({ modelId: 'm', embedding: [], dimension: 0 }),
      embedBatch: () => Effect.succeed([]), dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockChunker = Layer.succeed(MarkdownChunkerTag, {
      chunkFile: () => Effect.succeed([]), chunkFiles: () => Effect.succeed([]),
    } satisfies import('./types.js').MarkdownChunkerService);

    const fullLayer = Layer.provide(
      WorkspaceIndexerLayer,
      Layer.mergeAll(
        mockAppConfig,
        Layer.provide(IndexStateStoreLayer, mockAppConfig),
        mockEmbedding,
        mockChunker,
        Layer.provide(VectraStoreLayer, mockAppConfig),
      ),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(WorkspaceIndexerTag);
        return yield* _(Effect.either(svc.reindexFile('nonexistent.md')));
      }),
      fullLayer,
    );

    expect(result._tag).toBe('Left');
  });

  it('reindexFile succeeds for existing file', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ws-idx-test-'));
    const workspaceDir = path.join(testTmpDir!, 'workspace');
    mkdirSync(workspaceDir, { recursive: true });
    // Create a real file to reindex
    await fs.writeFile(path.join(workspaceDir, 'existing.md'), '# Existing\n\nContent', 'utf-8');

    // Set up vectra mocks for this test
    mockLocalIndexInstance.isIndexCreated.mockResolvedValue(false);
    mockLocalIndexInstance.createIndex.mockResolvedValue(undefined);
    mockLocalIndexInstance.beginUpdate.mockResolvedValue(undefined);
    mockLocalIndexInstance.endUpdate.mockResolvedValue(undefined);
    mockLocalIndexInstance.insertItem.mockResolvedValue(undefined);
    mockLocalIndexInstance.listItemsByMetadata.mockResolvedValue([]);
    mockLocalIndexInstance.deleteItem.mockResolvedValue(undefined);

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot: workspaceDir, indexRoot: path.join(testTmpDir!, 'index'),
        modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot: workspaceDir, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: new Array(384).fill(0.1), dimension: 384 }),
      embedBatch: () => Effect.succeed([{ modelId: 'test-model', embedding: new Array(384).fill(0.1), dimension: 384 }]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockChunker = Layer.succeed(MarkdownChunkerTag, {
      chunkFile: () => Effect.succeed([{
        id: 'chunk-reindex', workspaceRelativePath: 'existing.md', fileName: 'existing.md',
        title: 'Existing', headingPath: [] as string[], chunkIndex: 0, chunkText: 'Content',
        wikilinks: [] as string[], mtimeMs: 1000, contentHash: 'hash-reindex', modelId: 'test-model',
      }]),
      chunkFiles: () => Effect.succeed([]),
    } satisfies import('./types.js').MarkdownChunkerService);

    const fullLayer = Layer.provide(
      WorkspaceIndexerLayer,
      Layer.mergeAll(
        mockAppConfig,
        Layer.provide(IndexStateStoreLayer, mockAppConfig),
        mockEmbedding,
        mockChunker,
        Layer.provide(VectraStoreLayer, mockAppConfig),
      ),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(WorkspaceIndexerTag);
        return yield* _(svc.reindexFile('existing.md'));
      }),
      fullLayer,
    );

    expect(result.chunksCreated).toBe(1);
  });

  it('rebuildAll clears and reindexes empty workspace', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ws-idx-test-'));
    const workspaceDir = path.join(testTmpDir, 'workspace');
    mkdirSync(workspaceDir, { recursive: true });

    mockedCollectCorpusFiles.mockResolvedValueOnce([]);

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot: workspaceDir, indexRoot: path.join(testTmpDir!, 'index'),
        modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot: workspaceDir, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void, embedText: () => Effect.succeed({ modelId: 'm', embedding: [], dimension: 0 }),
      embedBatch: () => Effect.succeed([]), dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockChunker = Layer.succeed(MarkdownChunkerTag, {
      chunkFile: () => Effect.succeed([]), chunkFiles: () => Effect.succeed([]),
    } satisfies import('./types.js').MarkdownChunkerService);

    const fullLayer = Layer.provide(
      WorkspaceIndexerLayer,
      Layer.mergeAll(
        mockAppConfig,
        Layer.provide(IndexStateStoreLayer, mockAppConfig),
        mockEmbedding,
        mockChunker,
        Layer.provide(VectraStoreLayer, mockAppConfig),
      ),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(WorkspaceIndexerTag);
        return yield* _(svc.rebuildAll());
      }),
      fullLayer,
    );

    expect(result).toEqual({ filesProcessed: 0, chunksCreated: 0 });
  });

  it('rebuildAll processes corpus files', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ws-idx-test-'));
    const workspaceDir = path.join(testTmpDir!, 'workspace');
    mkdirSync(workspaceDir, { recursive: true });
    // Create a real markdown file
    await fs.writeFile(path.join(workspaceDir, 'test.md'), '# Test\n\nContent here.', 'utf-8');

    mockedCollectCorpusFiles.mockResolvedValueOnce([
      { absolutePath: path.join(workspaceDir, 'test.md'), relativePath: 'test.md', size: 100, mtimeMs: 1000 },
    ]);

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot: workspaceDir, indexRoot: path.join(testTmpDir!, 'index'),
        modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot: workspaceDir, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: new Array(384).fill(0.1), dimension: 384 }),
      embedBatch: () => Effect.succeed([{ modelId: 'test-model', embedding: new Array(384).fill(0.1), dimension: 384 }]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockChunker = Layer.succeed(MarkdownChunkerTag, {
      chunkFile: () => Effect.succeed([{
        id: 'test-chunk-id', workspaceRelativePath: 'test.md', fileName: 'test.md',
        title: 'Test', headingPath: [] as string[], chunkIndex: 0, chunkText: 'Some content',
        wikilinks: [] as string[], mtimeMs: 1000, contentHash: 'abc123', modelId: 'test-model',
      }]),
      chunkFiles: () => Effect.succeed([]),
    } satisfies import('./types.js').MarkdownChunkerService);

    const fullLayer = Layer.provide(
      WorkspaceIndexerLayer,
      Layer.mergeAll(
        mockAppConfig,
        Layer.provide(IndexStateStoreLayer, mockAppConfig),
        mockEmbedding,
        mockChunker,
        Layer.provide(VectraStoreLayer, mockAppConfig),
      ),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(WorkspaceIndexerTag);
        return yield* _(svc.rebuildAll());
      }),
      fullLayer,
    );

    expect(result.filesProcessed).toBe(1);
    expect(result.chunksCreated).toBe(1);
  });
});

describe('SemanticSearchServiceLayer', () => {
  let testTmpDir: string | undefined;

  afterEach(() => {
    if (testTmpDir) {
      rmSync(testTmpDir, { recursive: true, force: true });
      testTmpDir = undefined;
    }
  });

  // Helper to build test layer for SemanticSearchService with all dependencies
  function buildSemanticSearchTestLayer(workspaceRoot: string, indexRoot: string) {
    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot,
        indexRoot,
        modelAssetPath: '/fake/model',
        chunkSize: 1000,
        overlap: 200,
        batchSize: 32,
        exclusions: [] as readonly string[],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot,
        exclusions: [] as readonly string[],
        maxFileSizeBytes: 5 * 1024 * 1024,
        acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: new Array(384).fill(0.1), dimension: 384 }),
      embedBatch: () => Effect.succeed([{ modelId: 'test-model', embedding: new Array(384).fill(0.1), dimension: 384 }]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed([]),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed(null),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: false, chunkCount: 0 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: () => Effect.void,
      rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    } satisfies import('./types.js').WorkspaceIndexerService);

    return Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(
        mockAppConfig,
        mockEmbedding,
        mockVectraStore,
        mockIndexState,
        mockWorkspaceIndexer,
      ),
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- init ---

  it('init initializes embedding, opens Vectra, runs first-time index if no manifest', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const testLayer = buildSemanticSearchTestLayer(workspaceRoot, indexRoot);

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        return yield* _(svc.getFeatureState());
      }),
      testLayer,
    );

    expect(result).toBe('ready');
  });

  it('init skips first-time index if manifest exists', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    // Mock IndexStateStore to return an existing manifest
    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot,
        indexRoot,
        modelAssetPath: '/fake/model',
        chunkSize: 1000,
        overlap: 200,
        batchSize: 32,
        exclusions: [] as readonly string[],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot,
        exclusions: [] as readonly string[],
        maxFileSizeBytes: 5 * 1024 * 1024,
        acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: new Array(384).fill(0.1), dimension: 384 }),
      embedBatch: () => Effect.succeed([{ modelId: 'test-model', embedding: new Array(384).fill(0.1), dimension: 384 }]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed([]),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      // Return existing manifest
      loadManifest: () => Effect.succeed({ modelId: 'test-model', version: '1', chunkIds: ['existing-chunk'], contentHashes: ['hash'] }),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: true, chunkCount: 1 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      // This should NOT be called if manifest exists
      indexWorkspace: () => Effect.succeed({ filesProcessed: 999, chunksCreated: 999 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: () => Effect.void,
      rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        return yield* _(svc.getFeatureState());
      }),
      testLayer,
    );

    expect(result).toBe('ready');
  });

  it('init is idempotent — second call is no-op', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const testLayer = buildSemanticSearchTestLayer(testTmpDir!, path.join(testTmpDir!, 'index'));

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        yield* _(svc.init()); // Second call
        return yield* _(svc.getFeatureState());
      }),
      testLayer,
    );

    expect(result).toBe('ready');
  });

  it('init transitions state: uninitialized → initializing → ready', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const testLayer = buildSemanticSearchTestLayer(testTmpDir!, path.join(testTmpDir!, 'index'));

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        const before = yield* _(svc.getFeatureState());
        expect(before).toBe('uninitialized');
        yield* _(svc.init());
        const after = yield* _(svc.getFeatureState());
        return after;
      }),
      testLayer,
    );

    expect(result).toBe('ready');
  });

  it('init sets state to error on failure', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot, indexRoot, modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      // initialize fails
      initialize: () => Effect.fail(new ModelAssetError({ message: 'Model init failed', assetPath: '/fake/model' })),
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: [], dimension: 384 }),
      embedBatch: () => Effect.succeed([]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed([]),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed(null),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: false, chunkCount: 0 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: () => Effect.void,
      rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        const initResult = yield* _(Effect.either(svc.init()));
        expect(initResult._tag).toBe('Left');
        return yield* _(svc.getFeatureState());
      }),
      testLayer,
    );

    expect(result).toBe('error');
  });

  // --- getFeatureState ---

  it('getFeatureState returns uninitialized before init', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const testLayer = buildSemanticSearchTestLayer(testTmpDir!, path.join(testTmpDir!, 'index'));

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        return yield* _(svc.getFeatureState());
      }),
      testLayer,
    );

    expect(result).toBe('uninitialized');
  });

  // --- search ---

  it('search returns empty array if state is not ready', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const testLayer = buildSemanticSearchTestLayer(testTmpDir!, path.join(testTmpDir!, 'index'));

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        // Don't call init — state is 'uninitialized'
        return yield* _(svc.search('test query'));
      }),
      testLayer,
    );

    expect(result).toEqual([]);
  });

  it('search returns results when state is ready', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot, indexRoot, modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: new Array(384).fill(0.5), dimension: 384 }),
      embedBatch: () => Effect.succeed([{ modelId: 'test-model', embedding: [], dimension: 384 }]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockSearchResult = {
      score: 0.85,
      chunk: {
        id: 'chunk-1',
        workspaceRelativePath: 'test.md',
        fileName: 'test.md',
        title: 'Test Document',
        headingPath: [] as string[],
        chunkIndex: 0,
        chunkText: 'This is test content for search results.',
        wikilinks: [] as string[],
        mtimeMs: 1000,
        contentHash: 'hash1',
        modelId: 'test-model',
      },
      snippet: 'This is test content for search results.',
    };

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed([mockSearchResult]),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed({ modelId: 'test-model', version: '1', chunkIds: ['chunk-1'], contentHashes: ['hash1'] }),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: true, chunkCount: 1 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: () => Effect.void,
      rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        return yield* _(svc.search('test query'));
      }),
      testLayer,
    );

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(0.85);
    expect(result[0].chunk.id).toBe('chunk-1');
  });

  it('search filters results by minScore', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot, indexRoot, modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: new Array(384).fill(0.5), dimension: 384 }),
      embedBatch: () => Effect.succeed([]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockSearchResults = [
      { score: 0.95, chunk: { id: 'chunk-1', workspaceRelativePath: 'test.md', fileName: 'test.md', title: 'Test', headingPath: [] as string[], chunkIndex: 0, chunkText: 'High score content', wikilinks: [] as string[], mtimeMs: 1000, contentHash: 'h1', modelId: 'test-model' }, snippet: 'High score content' },
      { score: 0.40, chunk: { id: 'chunk-2', workspaceRelativePath: 'test.md', fileName: 'test.md', title: 'Test', headingPath: [] as string[], chunkIndex: 1, chunkText: 'Low score content', wikilinks: [] as string[], mtimeMs: 1000, contentHash: 'h2', modelId: 'test-model' }, snippet: 'Low score content' },
    ];

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed(mockSearchResults),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed({ modelId: 'test-model', version: '1', chunkIds: ['chunk-1', 'chunk-2'], contentHashes: ['h1', 'h2'] }),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: true, chunkCount: 2 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: () => Effect.void,
      rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        // Request minScore: 0.5, which should filter out chunk-2 (score: 0.40)
        return yield* _(svc.search('test query', { minScore: 0.5 }));
      }),
      testLayer,
    );

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(0.95);
  });

  it('search limits results by maxResults', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot, indexRoot, modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: new Array(384).fill(0.5), dimension: 384 }),
      embedBatch: () => Effect.succeed([]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockSearchResults = [
      { score: 0.90, chunk: { id: 'chunk-1', workspaceRelativePath: 'test.md', fileName: 'test.md', title: 'Test', headingPath: [] as string[], chunkIndex: 0, chunkText: 'Result 1', wikilinks: [] as string[], mtimeMs: 1000, contentHash: 'h1', modelId: 'test-model' }, snippet: 'Result 1' },
      { score: 0.85, chunk: { id: 'chunk-2', workspaceRelativePath: 'test.md', fileName: 'test.md', title: 'Test', headingPath: [] as string[], chunkIndex: 1, chunkText: 'Result 2', wikilinks: [] as string[], mtimeMs: 1000, contentHash: 'h2', modelId: 'test-model' }, snippet: 'Result 2' },
      { score: 0.80, chunk: { id: 'chunk-3', workspaceRelativePath: 'test.md', fileName: 'test.md', title: 'Test', headingPath: [] as string[], chunkIndex: 2, chunkText: 'Result 3', wikilinks: [] as string[], mtimeMs: 1000, contentHash: 'h3', modelId: 'test-model' }, snippet: 'Result 3' },
    ];

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed(mockSearchResults),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed({ modelId: 'test-model', version: '1', chunkIds: ['c1', 'c2', 'c3'], contentHashes: ['h1', 'h2', 'h3'] }),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: true, chunkCount: 3 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: () => Effect.void,
      rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        return yield* _(svc.search('test query', { maxResults: 2 }));
      }),
      testLayer,
    );

    expect(result).toHaveLength(2);
  });

  it('search fails open — returns empty array on VectraStore error', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot, indexRoot, modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: [], dimension: 384 }),
      embedBatch: () => Effect.succeed([]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      // query fails
      query: () => Effect.fail(new IndexCorruptionError({ message: 'Vectra error' })),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed({ modelId: 'test-model', version: '1', chunkIds: ['c1'], contentHashes: ['h1'] }),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: true, chunkCount: 1 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: () => Effect.void,
      rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        return yield* _(svc.search('test query'));
      }),
      testLayer,
    );

    // Should return empty array (fail open) instead of throwing
    expect(result).toEqual([]);
  });

  // --- indexWorkspace ---

  it('indexWorkspace requires ready state', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const testLayer = buildSemanticSearchTestLayer(testTmpDir!, path.join(testTmpDir!, 'index'));

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        // Don't init — state is 'uninitialized'
        return yield* _(Effect.either(svc.indexWorkspace()));
      }),
      testLayer,
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(SemanticSearchError);
      expect(result.left.message).toContain('invalid state');
    }
  });

  it('indexWorkspace delegates to WorkspaceIndexer and tracks state', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot, indexRoot, modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: [], dimension: 384 }),
      embedBatch: () => Effect.succeed([]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed([]),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed({ modelId: 'test-model', version: '1', chunkIds: [], contentHashes: [] }),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: false, chunkCount: 0 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      indexWorkspace: () => Effect.succeed({ filesProcessed: 5, chunksCreated: 10 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: () => Effect.void,
      rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        return yield* _(svc.indexWorkspace());
      }),
      testLayer,
    );

    expect(result.filesProcessed).toBe(5);
    expect(result.chunksCreated).toBe(10);
  });

  it('indexWorkspace sets state to error if delegated indexing fails', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot, indexRoot, modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: [], dimension: 384 }),
      embedBatch: () => Effect.succeed([]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed([]),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed({ modelId: 'test-model', version: '1', chunkIds: [], contentHashes: [] }),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: false, chunkCount: 0 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      indexWorkspace: () => Effect.fail(new SemanticSearchError({ message: 'index failed' })),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: () => Effect.void,
      rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        const indexResult = yield* _(Effect.either(svc.indexWorkspace()));
        const stateAfter = yield* _(svc.getFeatureState());
        return { indexResult, stateAfter };
      }),
      testLayer,
    );

    expect(result.indexResult._tag).toBe('Left');
    expect(result.stateAfter).toBe('error');
  });

  // --- reindexFile ---

  it('reindexFile requires ready state', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const testLayer = buildSemanticSearchTestLayer(testTmpDir!, path.join(testTmpDir!, 'index'));

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        // Don't init — state is 'uninitialized'
        return yield* _(Effect.either(svc.reindexFile('test.md')));
      }),
      testLayer,
    );

    expect(result._tag).toBe('Left');
  });

  // --- removeFile ---

  it('removeFile requires ready state', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const testLayer = buildSemanticSearchTestLayer(testTmpDir!, path.join(testTmpDir!, 'index'));

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        // Don't init — state is 'uninitialized'
        return yield* _(Effect.either(svc.removeFile('test.md')));
      }),
      testLayer,
    );

    expect(result._tag).toBe('Left');
  });

  // --- rebuildAll ---

  it('rebuildAll requires ready state and transitions to indexing then back', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot, indexRoot, modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: [], dimension: 384 }),
      embedBatch: () => Effect.succeed([]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed([]),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed({ modelId: 'test-model', version: '1', chunkIds: [], contentHashes: [] }),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: false, chunkCount: 0 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      rebuildAll: () => Effect.succeed({ filesProcessed: 3, chunksCreated: 6 }),
      indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: () => Effect.void,
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        const rebuildResult = yield* _(svc.rebuildAll());
        const stateAfter = yield* _(svc.getFeatureState());
        return { rebuildResult, stateAfter };
      }),
      testLayer,
    );

    expect(result.rebuildResult.filesProcessed).toBe(3);
    expect(result.stateAfter).toBe('ready');
  });

  it('rebuildAll sets state to error if delegated rebuild fails', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot, indexRoot, modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: [], dimension: 384 }),
      embedBatch: () => Effect.succeed([]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed([]),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed({ modelId: 'test-model', version: '1', chunkIds: [], contentHashes: [] }),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: false, chunkCount: 0 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      rebuildAll: () => Effect.fail(new SemanticSearchError({ message: 'rebuild failed' })),
      indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: () => Effect.void,
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        const rebuildResult = yield* _(Effect.either(svc.rebuildAll()));
        const stateAfter = yield* _(svc.getFeatureState());
        return { rebuildResult, stateAfter };
      }),
      testLayer,
    );

    expect(result.rebuildResult._tag).toBe('Left');
    expect(result.stateAfter).toBe('error');
  });

  // --- reindexFile success path ---

  it('reindexFile delegates to WorkspaceIndexer when ready', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot, indexRoot, modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: [], dimension: 384 }),
      embedBatch: () => Effect.succeed([]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed([]),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed({ modelId: 'test-model', version: '1', chunkIds: [], contentHashes: [] }),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: false, chunkCount: 0 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 2 }),
      removeFile: () => Effect.void,
      rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    const result = await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        return yield* _(svc.reindexFile('test.md'));
      }),
      testLayer,
    );

    expect(result.chunksCreated).toBe(2);
  });

  // --- removeFile success path ---

  it('removeFile delegates to WorkspaceIndexer when ready', async () => {
    testTmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-test-'));
    const workspaceRoot = testTmpDir;
    const indexRoot = path.join(testTmpDir!, 'index');

    const mockAppConfig = Layer.succeed(AppConfigTag, {
      getConfig: () => Effect.succeed({
        workspaceRoot, indexRoot, modelAssetPath: '/fake/model', chunkSize: 1000, overlap: 200, batchSize: 32, exclusions: [],
      }),
      getCorpusPolicyConfig: () => Effect.succeed({
        workspaceRoot, exclusions: [], maxFileSizeBytes: 5 * 1024 * 1024, acceptedExtensions: ['.md', '.markdown'],
      }),
    } satisfies AppConfigService);

    const mockEmbedding = Layer.succeed(EmbeddingServiceTag, {
      initialize: () => Effect.void,
      embedText: () => Effect.succeed({ modelId: 'test-model', embedding: [], dimension: 384 }),
      embedBatch: () => Effect.succeed([]),
      dispose: () => Effect.void,
    } satisfies import('./types.js').EmbeddingService);

    const mockVectraStore = Layer.succeed(VectraStoreTag, {
      openIndex: () => Effect.void,
      addItems: () => Effect.void,
      query: () => Effect.succeed([]),
      removeByPath: () => Effect.void,
      clearIndex: () => Effect.void,
      dispose: () => Effect.void,
    } satisfies import('./types.js').VectraStoreService);

    const mockIndexState = Layer.succeed(IndexStateStoreTag, {
      loadManifest: () => Effect.succeed({ modelId: 'test-model', version: '1', chunkIds: [], contentHashes: [] }),
      saveManifest: () => Effect.void,
      getFileStatus: () => Effect.succeed({ isIndexed: false, chunkCount: 0 }),
      removeFile: () => Effect.void,
      clearManifest: () => Effect.void,
    } satisfies import('./types.js').IndexStateStoreService);

    let removeFileCalled = false;
    const mockWorkspaceIndexer = Layer.succeed(WorkspaceIndexerTag, {
      indexWorkspace: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
      reindexFile: () => Effect.succeed({ chunksCreated: 0 }),
      removeFile: (_path: string) => Effect.sync(() => { removeFileCalled = true; }),
      rebuildAll: () => Effect.succeed({ filesProcessed: 0, chunksCreated: 0 }),
    } satisfies import('./types.js').WorkspaceIndexerService);

    const testLayer = Layer.provide(
      SemanticSearchServiceLayer,
      Layer.mergeAll(mockAppConfig, mockEmbedding, mockVectraStore, mockIndexState, mockWorkspaceIndexer),
    );

    await runWithLayer(
      Effect.gen(function* (_) {
        const svc = yield* _(SemanticSearchServiceTag);
        yield* _(svc.init());
        yield* _(svc.removeFile('test.md'));
      }),
      testLayer,
    );

    expect(removeFileCalled).toBe(true);
  });
});
