/**
 * Layer constructors with stub implementations for semantic search services.
 *
 * Each layer satisfies its corresponding service interface with no-op
 * implementations. Real implementations come in Steps 02-05 of Phase 16.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Effect, Layer, Ref } from 'effect';
import { LocalIndex } from 'vectra';
import {
  createEmbeddingPipeline,
  embedText as rawEmbedText,
  embedBatch as rawEmbedBatch,
} from '../embedding-service.js';
import type {
  ChunkInput,
  ChunkOptions,
} from '../markdown-chunker.js';
import {
  chunkFile as rawChunkFile,
} from '../markdown-chunker.js';
import type {
  ChunkMetadata,
  IndexStatus,
  FeatureState,
  IndexManifest,
  SearchOptions,
} from '../types.js';
import type {
  SemanticSearchConfig,
  CorpusPolicyConfig,
} from '../config.js';
import { collectCorpusFiles } from '../corpus-policy.js';
import { computeContentHash } from '../markdown-chunker.js';
import {
  SemanticSearchError,
  ModelAssetError,
  ConfigurationError,
  IndexCorruptionError,
  UnsupportedFileError,
} from '../errors.js';
import type {
  AppConfigService,
  EmbeddingService,
  MarkdownChunkerService,
  IndexStateStoreService,
  VectraStoreService,
  WorkspaceIndexerService,
  SemanticSearchService,
} from './types.js';
import {
  AppConfigTag,
  EmbeddingServiceTag,
  MarkdownChunkerTag,
  IndexStateStoreTag,
  VectraStoreTag,
  WorkspaceIndexerTag,
  SemanticSearchServiceTag,
} from './tags.js';

// --- AppConfig Layer ---

const AppConfigStub: AppConfigService = {
  getConfig: () => Effect.succeed({
    workspaceRoot: '',
    indexRoot: '',
    modelAssetPath: '',
    chunkSize: 1000,
    overlap: 200,
    batchSize: 32,
    exclusions: [] as readonly string[],
  } satisfies SemanticSearchConfig),

  getCorpusPolicyConfig: () => Effect.succeed({
    workspaceRoot: '',
    exclusions: [] as readonly string[],
    maxFileSizeBytes: 5 * 1024 * 1024,
    acceptedExtensions: ['.md', '.markdown'],
  } satisfies CorpusPolicyConfig),
};

export const AppConfigLayer = Layer.succeed(AppConfigTag, AppConfigStub);

// --- EmbeddingService Layer (real implementation) ---

/** Cached pipeline state shared across the service methods */
interface PipelineState {
  readonly pipeline: Awaited<ReturnType<typeof createEmbeddingPipeline>>['pipeline'];
  readonly modelId: string;
}

const EmbeddingServiceLive: Effect.Effect<
  EmbeddingService,
  never,
  AppConfigTag
> = Effect.gen(function* (_) {
  const configSvc = yield* _(AppConfigTag);
  // Ref holds the cached pipeline; null means not yet initialized
  const pipelineRef = yield* _(Ref.make<PipelineState | null>(null));

  const getPipeline = Effect.gen(function* (_) {
    const state = yield* _(Ref.get(pipelineRef));
    if (state === null) {
      return yield* _(Effect.fail(new ModelAssetError({
        message: 'EmbeddingService not initialized. Call initialize() first.',
      })));
    }
    return state;
  });

  return {
    initialize: () =>
      Effect.gen(function* (_) {
        const config = yield* _(configSvc.getConfig().pipe(
          Effect.mapError((e) =>
            e instanceof ConfigurationError
              ? new ModelAssetError({
                  message: `Configuration error: ${e.message}`,
                  assetPath: '',
                })
              : e,
          ),
        ));
        const result = yield* _(
          Effect.tryPromise({
            try: () => createEmbeddingPipeline({
              modelAssetPath: config.modelAssetPath,
            }),
            catch: (e) =>
              e instanceof ModelAssetError
                ? e
                : new ModelAssetError({
                    message: `Failed to create embedding pipeline: ${String(e)}`,
                    assetPath: config.modelAssetPath,
                  }),
          }),
        );
        yield* _(Ref.set(pipelineRef, { pipeline: result.pipeline, modelId: result.modelId }));
      }),

    embedText: (text: string) =>
      Effect.gen(function* (_) {
        const state = yield* _(getPipeline);
        return yield* _(
          Effect.tryPromise({
            // @ts-expect-error — raw function pipeline type has pre-existing mismatch (embedding-service.ts:128)
            try: () => rawEmbedText(text, state.pipeline, state.modelId),
            catch: (e) =>
              e instanceof ModelAssetError
                ? e
                : new ModelAssetError({
                    message: `Embedding generation failed: ${String(e)}`,
                    assetPath: state.modelId,
                  }),
          }),
        );
      }),

    embedBatch: (texts: string[]) =>
      Effect.gen(function* (_) {
        const state = yield* _(getPipeline);
        return yield* _(
          Effect.tryPromise({
            // @ts-expect-error — raw function pipeline type has pre-existing mismatch (embedding-service.ts:128)
            try: () => rawEmbedBatch(texts, state.pipeline, state.modelId),
            catch: (e) =>
              e instanceof ModelAssetError
                ? e
                : new ModelAssetError({
                    message: `Batch embedding generation failed: ${String(e)}`,
                    assetPath: state.modelId,
                  }),
          }),
        );
      }),

    dispose: () =>
      Ref.set(pipelineRef, null),
  } satisfies EmbeddingService;
});

export const EmbeddingServiceLayer = Layer.effect(
  EmbeddingServiceTag,
  EmbeddingServiceLive,
);

// --- MarkdownChunkerService Layer (real implementation) ---

const MarkdownChunkerLive: Effect.Effect<
  MarkdownChunkerService,
  never,
  never
> = Effect.gen(function* (_) {
  return {
    chunkFile: (input: ChunkInput, options: ChunkOptions) =>
      Effect.try({
        try: () => rawChunkFile(input, options),
        catch: (e) =>
          e instanceof UnsupportedFileError
            ? e
            : new UnsupportedFileError({
                message: `Chunking failed: ${String(e)}`,
                filePath: input.workspaceRelativePath,
              }),
      }),

    chunkFiles: (inputs: ChunkInput[], options: ChunkOptions) =>
      Effect.gen(function* (_) {
        const results: import('../types.js').ChunkMetadata[][] = [];
        for (const input of inputs) {
          const chunks = yield* _(
            Effect.try({
              try: () => rawChunkFile(input, options),
              catch: (e) =>
                e instanceof UnsupportedFileError
                  ? e
                  : new UnsupportedFileError({
                      message: `Chunking failed: ${String(e)}`,
                      filePath: input.workspaceRelativePath,
                    }),
            }),
          );
          results.push(chunks);
        }
        return results.flat();
      }),
  } satisfies MarkdownChunkerService;
});

export const MarkdownChunkerLayer = Layer.effect(
  MarkdownChunkerTag,
  MarkdownChunkerLive,
);

// --- IndexStateStoreService Layer (real implementation) ---

const MANIFEST_DIR_NAME = '.srgnt-semantic-search';
const MANIFEST_FILE = 'manifest.json';
const FILE_INDEX_FILE = 'file-index.json';

interface FileIndexEntry {
  chunkIds: string[];
  contentHashes: string[];
  mtimeMs: number;
  indexedAt: string;
}

type FileIndex = Record<string, FileIndexEntry>;

const IndexStateStoreLive = Effect.gen(function* (_) {
  const wrapError = (op: string, manifestPath?: string) => (error: unknown) =>
    new IndexCorruptionError({
      message: `IndexStateStore.${op} failed: ${error instanceof Error ? error.message : String(error)}`,
      manifestPath,
    });

  const getManifestPath = (workspaceRoot: string) =>
    path.join(workspaceRoot, MANIFEST_DIR_NAME, MANIFEST_FILE);

  const getFileIndexPath = (workspaceRoot: string) =>
    path.join(workspaceRoot, MANIFEST_DIR_NAME, FILE_INDEX_FILE);

  const ensureDir = (dirPath: string) =>
    Effect.tryPromise({
      try: () => fs.mkdir(dirPath, { recursive: true }),
      catch: wrapError('ensureDir'),
    });

  const readJsonFile = <T>(filePath: string): Effect.Effect<T | null, IndexCorruptionError> =>
    Effect.tryPromise({
      try: async () => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(content) as T;
        } catch {
          return null;
        }
      },
      catch: wrapError('readJson', filePath),
    });

  const writeJsonFile = (filePath: string, data: unknown): Effect.Effect<void, IndexCorruptionError> =>
    Effect.gen(function* (_) {
      const dir = path.dirname(filePath);
      yield* _(ensureDir(dir));
      yield* _(
        Effect.tryPromise({
          try: () => fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8'),
          catch: wrapError('writeJson', filePath),
        }),
      );
    });

  return {
    loadManifest: (workspaceRoot: string) =>
      Effect.gen(function* (_) {
        const manifestPath = getManifestPath(workspaceRoot);
        return yield* _(readJsonFile<IndexManifest>(manifestPath));
      }),

    saveManifest: (workspaceRoot: string, manifest: IndexManifest) =>
      Effect.gen(function* (_) {
        const manifestPath = getManifestPath(workspaceRoot);
        yield* _(writeJsonFile(manifestPath, manifest));
      }),

    getFileStatus: (workspaceRoot: string, relativePath: string) =>
      Effect.gen(function* (_) {
        const fileIndexPath = getFileIndexPath(workspaceRoot);
        const fileIndex = yield* _(readJsonFile<FileIndex>(fileIndexPath));

        if (!fileIndex || !fileIndex[relativePath]) {
          return { isIndexed: false, chunkCount: 0 } satisfies IndexStatus;
        }

        const entry = fileIndex[relativePath];
        return {
          isIndexed: true,
          chunkCount: entry.chunkIds.length,
          lastIndexedAt: entry.indexedAt,
        } satisfies IndexStatus;
      }).pipe(
        Effect.catchAll(() => Effect.succeed({ isIndexed: false, chunkCount: 0 } satisfies IndexStatus)),
      ),

    removeFile: (workspaceRoot: string, relativePath: string) =>
      Effect.gen(function* (_) {
        const manifestPath = getManifestPath(workspaceRoot);
        const fileIndexPath = getFileIndexPath(workspaceRoot);

        const [manifest, fileIndex] = yield* _(
          Effect.all([
            readJsonFile<IndexManifest>(manifestPath),
            readJsonFile<FileIndex>(fileIndexPath),
          ]),
        );

        if (!manifest || !fileIndex || !fileIndex[relativePath]) {
          return; // Nothing to remove
        }

        const entry = fileIndex[relativePath];
        const removeChunkIds = new Set(entry.chunkIds);
        const removeContentHashes = new Set(entry.contentHashes);

        // Create a new manifest with the removed chunks/hashes filtered out
        const updatedManifest: IndexManifest = {
          ...manifest,
          chunkIds: manifest.chunkIds.filter((id) => !removeChunkIds.has(id)),
          contentHashes: manifest.contentHashes.filter(
            (hash) => !removeContentHashes.has(hash),
          ),
        };

        // Remove the file entry from the index
        const updatedFileIndex = { ...fileIndex };
        delete updatedFileIndex[relativePath];

        // Write both files back
        yield* _(
          Effect.all([
            writeJsonFile(manifestPath, updatedManifest),
            writeJsonFile(fileIndexPath, updatedFileIndex),
          ]),
        );
      }),

    clearManifest: (workspaceRoot: string) =>
      Effect.gen(function* (_) {
        const manifestDir = path.join(workspaceRoot, MANIFEST_DIR_NAME);
        yield* _(
          Effect.tryPromise({
            try: async () => {
              await fs.rm(manifestDir, { recursive: true, force: true });
            },
            catch: wrapError('clearManifest', manifestDir),
          }),
        );
      }),
  } satisfies IndexStateStoreService;
});

export const IndexStateStoreLayer = Layer.effect(
  IndexStateStoreTag,
  IndexStateStoreLive,
);

// --- VectraStoreService Layer (real implementation) ---

const VectraStoreLive = Effect.gen(function* (_) {
  const indexCache = new Map<string, LocalIndex>();

  const getIndex = (): LocalIndex | null => {
    const entries = [...indexCache.values()];
    return entries[0] ?? null;
  };

  const wrapError = (op: string) => (error: unknown) =>
    new IndexCorruptionError({
      message: `VectraStore.${op} failed: ${error instanceof Error ? error.message : String(error)}`,
    });

  return {
    openIndex: (indexRoot: string) =>
      Effect.gen(function* (_) {
        if (indexCache.has(indexRoot)) return;

        const index = new LocalIndex(path.join(indexRoot, 'vectors'));

        yield* _(
          Effect.tryPromise({
            try: async () => {
              const exists = await index.isIndexCreated();
              if (!exists) {
                await index.createIndex({
                  version: 1,
                  metadata_config: {
                    indexed: ['workspaceRelativePath'],
                  },
                });
              }
            },
            catch: wrapError('openIndex'),
          }),
        );

        indexCache.set(indexRoot, index);
      }),

    addItems: (items: Array<{ chunk: ChunkMetadata; embedding: number[] }>) =>
      Effect.gen(function* (_) {
        const index = getIndex();
        if (!index) {
          return yield* _(
            Effect.fail(
              new IndexCorruptionError({
                message: 'VectraStore.addItems: no index open, call openIndex first',
              }),
            ),
          );
        }

        yield* _(
          Effect.tryPromise({
            try: async () => {
              await index.beginUpdate();
              try {
                for (const item of items) {
                  await index.insertItem({
                    id: item.chunk.id,
                    vector: item.embedding,
                    metadata: {
                      workspaceRelativePath: item.chunk.workspaceRelativePath,
                      fileName: item.chunk.fileName,
                      title: item.chunk.title,
                      headingPath: JSON.stringify(item.chunk.headingPath),
                      chunkIndex: item.chunk.chunkIndex,
                      chunkText: item.chunk.chunkText,
                      wikilinks: JSON.stringify(item.chunk.wikilinks),
                      mtimeMs: item.chunk.mtimeMs,
                      contentHash: item.chunk.contentHash,
                      modelId: item.chunk.modelId,
                    },
                  });
                }
              } finally {
                await index.endUpdate();
              }
            },
            catch: wrapError('addItems'),
          }),
        );
      }),

    query: (embedding: number[], options: SearchOptions) =>
      Effect.gen(function* (_) {
        const index = getIndex();
        if (!index) {
          return yield* _(
            Effect.fail(
              new IndexCorruptionError({
                message: 'VectraStore.query: no index open',
              }),
            ),
          );
        }

        return yield* _(
          Effect.tryPromise({
            try: async () => {
              const results = await index.queryItems(embedding, options.maxResults);
              return results.map((r) => ({
                score: r.score,
                chunk: {
                  id: r.item.id,
                  workspaceRelativePath: r.item.metadata.workspaceRelativePath as string,
                  fileName: r.item.metadata.fileName as string,
                  title: r.item.metadata.title as string,
                  headingPath: JSON.parse(r.item.metadata.headingPath as string) as string[],
                  chunkIndex: r.item.metadata.chunkIndex as number,
                  chunkText: r.item.metadata.chunkText as string,
                  wikilinks: JSON.parse(r.item.metadata.wikilinks as string) as string[],
                  mtimeMs: r.item.metadata.mtimeMs as number,
                  contentHash: r.item.metadata.contentHash as string,
                  modelId: r.item.metadata.modelId as string,
                },
                snippet: (r.item.metadata.chunkText as string).slice(0, 200),
              }));
            },
            catch: wrapError('query'),
          }),
        );
      }),

    removeByPath: (workspaceRelativePath: string) =>
      Effect.gen(function* (_) {
        const index = getIndex();
        if (!index) return;

        yield* _(
          Effect.tryPromise({
            try: async () => {
              const items = await index.listItemsByMetadata({
                workspaceRelativePath: { $eq: workspaceRelativePath },
              });
              if (items.length === 0) return;
              await index.beginUpdate();
              try {
                for (const item of items) {
                  await index.deleteItem(item.id);
                }
              } finally {
                await index.endUpdate();
              }
            },
            catch: wrapError('removeByPath'),
          }),
        );
      }),

    clearIndex: () =>
      Effect.gen(function* (_) {
        const index = getIndex();
        if (!index) return;

        yield* _(
          Effect.tryPromise({
            try: async () => {
              await index.deleteIndex();
              indexCache.clear();
            },
            catch: wrapError('clearIndex'),
          }),
        );
      }),

    dispose: () =>
      Effect.sync(() => {
        indexCache.clear();
      }),
  } satisfies VectraStoreService;
});

export const VectraStoreLayer = Layer.effect(VectraStoreTag, VectraStoreLive);

// --- WorkspaceIndexerService Layer (real implementation) ---

const WorkspaceIndexerLive: Effect.Effect<
  WorkspaceIndexerService,
  never,
  AppConfigTag | EmbeddingServiceTag | MarkdownChunkerTag | IndexStateStoreTag | VectraStoreTag
> = Effect.gen(function* (_) {
  const configSvc = yield* _(AppConfigTag);
  const embeddingSvc = yield* _(EmbeddingServiceTag);
  const chunkerSvc = yield* _(MarkdownChunkerTag);
  const stateSvc = yield* _(IndexStateStoreTag);
  const vectraSvc = yield* _(VectraStoreTag);

  const readFileContent = (filePath: string) =>
    Effect.tryPromise({
      try: () => fs.readFile(filePath, 'utf-8'),
      catch: () => new SemanticSearchError({ message: `Failed to read file: ${filePath}` }),
    });

  /** Process a single file: chunk, embed, store, update index */
  const processFile = (
    absolutePath: string,
    relativePath: string,
    mtimeMs: number,
    config: SemanticSearchConfig,
  ) =>
    Effect.gen(function* (_) {
      yield* _(Effect.logDebug(`WorkspaceIndexer: processing file ${relativePath}`));

      // Read file content
      const content = yield* _(readFileContent(absolutePath));

      // Chunk the file
      const chunks = yield* _(
        chunkerSvc.chunkFile(
          { workspaceRelativePath: relativePath, content, mtimeMs },
          { chunkSize: config.chunkSize, overlap: config.overlap },
        ),
      );

      if (chunks.length === 0) {
        yield* _(Effect.logDebug(`WorkspaceIndexer: no chunks for ${relativePath}`));
        return { chunksCreated: 0 };
      }

      // Generate embeddings for each chunk's text
      const texts = chunks.map((c) => c.chunkText);
      const embeddings = yield* _(embeddingSvc.embedBatch(texts));

      // Build items for Vectra
      const items = chunks.map((chunk, i) => ({
        chunk,
        embedding: embeddings[i]?.embedding ?? [],
      }));

      // Store in Vectra
      yield* _(vectraSvc.addItems(items));

      // Update manifest
      const manifest = yield* _(stateSvc.loadManifest(config.workspaceRoot));
      const allChunkIds = [...(manifest?.chunkIds ?? []), ...chunks.map((c) => c.id)];
      const allHashes = [...(manifest?.contentHashes ?? []), ...chunks.map((c) => c.contentHash)];
      yield* _(stateSvc.saveManifest(config.workspaceRoot, {
        modelId: embeddings[0]?.modelId ?? 'unknown',
        version: '1',
        chunkIds: allChunkIds,
        contentHashes: allHashes,
      }));

      yield* _(Effect.logDebug(`WorkspaceIndexer: indexed ${chunks.length} chunks for ${relativePath}`));
      return { chunksCreated: chunks.length };
    });

  return {
    indexWorkspace: () =>
      Effect.gen(function* (_) {
        yield* _(Effect.logInfo('WorkspaceIndexer: indexWorkspace started'));

        const config = yield* _(configSvc.getConfig());
        const corpusConfig = yield* _(configSvc.getCorpusPolicyConfig());

        // Ensure Vectra index is open
        yield* _(vectraSvc.openIndex(config.indexRoot));

        // Collect corpus files
        const corpusFiles = yield* _(
          Effect.tryPromise({
            try: () => collectCorpusFiles(corpusConfig),
            catch: () => new SemanticSearchError({ message: 'Failed to collect corpus files' }),
          }),
        );

        yield* _(Effect.logDebug(`WorkspaceIndexer: found ${corpusFiles.length} corpus files`));

        // Load existing manifest for skip logic
        const existingManifest = yield* _(stateSvc.loadManifest(config.workspaceRoot));
        const existingHashes = new Set(existingManifest?.contentHashes ?? []);

        let filesProcessed = 0;
        let chunksCreated = 0;

        for (const file of corpusFiles) {
          // Read content to compute hash for skip check
          const content = yield* _(readFileContent(file.absolutePath));
          const contentHash = computeContentHash(content);

          // Skip unchanged files
          if (existingHashes.has(contentHash)) {
            yield* _(Effect.logDebug(`WorkspaceIndexer: skipping unchanged file ${file.relativePath}`));
            filesProcessed++;
            continue;
          }

          // Remove stale vectors for this file before re-indexing
          yield* _(vectraSvc.removeByPath(file.relativePath));

          // Process the file
          const result = yield* _(processFile(
            file.absolutePath,
            file.relativePath,
            file.mtimeMs,
            config,
          ));

          filesProcessed++;
          chunksCreated += result.chunksCreated;
        }

        yield* _(Effect.logInfo(`WorkspaceIndexer: indexWorkspace complete — ${filesProcessed} files, ${chunksCreated} chunks`));
        return { filesProcessed, chunksCreated };
      }),

    reindexFile: (relativePath: string) =>
      Effect.gen(function* (_) {
        yield* _(Effect.logInfo(`WorkspaceIndexer: reindexFile ${relativePath}`));

        const config = yield* _(configSvc.getConfig());

        // Ensure Vectra index is open
        yield* _(vectraSvc.openIndex(config.indexRoot));

        // Remove stale vectors first
        yield* _(vectraSvc.removeByPath(relativePath));
        // Remove manifest entries for this file
        yield* _(stateSvc.removeFile(config.workspaceRoot, relativePath));

        // Resolve absolute path
        const absolutePath = path.join(config.workspaceRoot, relativePath);

        // Read mtimeMs
        const stat = yield* _(
          Effect.tryPromise({
            try: () => fs.stat(absolutePath),
            catch: () => new SemanticSearchError({ message: `File not found: ${relativePath}` }),
          }),
        );

        const result = yield* _(processFile(absolutePath, relativePath, stat.mtimeMs, config));

        yield* _(Effect.logInfo(`WorkspaceIndexer: reindexed ${relativePath} — ${result.chunksCreated} chunks`));
        return result;
      }),

    removeFile: (relativePath: string) =>
      Effect.gen(function* (_) {
        yield* _(Effect.logInfo(`WorkspaceIndexer: removeFile ${relativePath}`));

        const config = yield* _(configSvc.getConfig());

        // Ensure Vectra index is open
        yield* _(vectraSvc.openIndex(config.indexRoot));

        // Remove vectors
        yield* _(vectraSvc.removeByPath(relativePath));
        // Remove manifest entry
        yield* _(stateSvc.removeFile(config.workspaceRoot, relativePath));

        yield* _(Effect.logInfo(`WorkspaceIndexer: removed ${relativePath}`));
      }),

    rebuildAll: () =>
      Effect.gen(function* (_) {
        yield* _(Effect.logInfo('WorkspaceIndexer: rebuildAll started'));

        const config = yield* _(configSvc.getConfig());

        // Clear manifest and file index
        yield* _(stateSvc.clearManifest(config.workspaceRoot));
        // Clear Vectra index
        yield* _(vectraSvc.clearIndex());
        // Re-open the Vectra index
        yield* _(vectraSvc.openIndex(config.indexRoot));

        // Re-run full index
        const result = yield* _(
          Effect.gen(function* (_) {
            // Re-invoke indexWorkspace logic inline (can't call self method on service)
            const corpusConfig = yield* _(configSvc.getCorpusPolicyConfig());
            const corpusFiles = yield* _(
              Effect.tryPromise({
                try: () => collectCorpusFiles(corpusConfig),
                catch: () => new SemanticSearchError({ message: 'Failed to collect corpus files' }),
              }),
            );

            let filesProcessed = 0;
            let chunksCreated = 0;

            for (const file of corpusFiles) {
              const result = yield* _(processFile(
                file.absolutePath,
                file.relativePath,
                file.mtimeMs,
                config,
              ));
              filesProcessed++;
              chunksCreated += result.chunksCreated;
            }

            return { filesProcessed, chunksCreated };
          }),
        );

        yield* _(Effect.logInfo(`WorkspaceIndexer: rebuildAll complete — ${result.filesProcessed} files, ${result.chunksCreated} chunks`));
        return result;
      }),
  } satisfies WorkspaceIndexerService;
});

export const WorkspaceIndexerLayer = Layer.effect(
  WorkspaceIndexerTag,
  WorkspaceIndexerLive,
);

// --- SemanticSearchService Layer (real implementation) ---

const SemanticSearchServiceLive: Effect.Effect<
  SemanticSearchService,
  never,
  AppConfigTag | EmbeddingServiceTag | IndexStateStoreTag | VectraStoreTag | WorkspaceIndexerTag
> = Effect.gen(function* (_) {
  const configSvc = yield* _(AppConfigTag);
  const embeddingSvc = yield* _(EmbeddingServiceTag);
  const stateSvc = yield* _(IndexStateStoreTag);
  const vectraSvc = yield* _(VectraStoreTag);
  const indexerSvc = yield* _(WorkspaceIndexerTag);

  // Mutable feature state ref
  const stateRef = yield* _(Ref.make<FeatureState>('uninitialized'));

  const requireState = (...allowed: FeatureState[]): Effect.Effect<void, SemanticSearchError> =>
    Effect.gen(function* (_) {
      const current = yield* _(Ref.get(stateRef));
      if (!allowed.includes(current)) {
        return yield* _(Effect.fail(
          new SemanticSearchError({
            message: `SemanticSearch: invalid state '${current}', expected one of: ${allowed.join(', ')}`,
          }),
        ));
      }
    });

  return {
    init: () =>
      Effect.gen(function* (_) {
        const current = yield* _(Ref.get(stateRef));
        if (current !== 'uninitialized') {
          // Already initialized; no-op
          return;
        }

        yield* _(Ref.set(stateRef, 'initializing'));

        const config = yield* _(configSvc.getConfig());

        // Initialize embedding pipeline
        yield* _(embeddingSvc.initialize());

        // Open Vectra index
        yield* _(vectraSvc.openIndex(config.indexRoot));

        // Check if manifest exists — if not, run first-time full index
        const manifest = yield* _(stateSvc.loadManifest(config.workspaceRoot));
        if (manifest === null) {
          yield* _(Ref.set(stateRef, 'indexing'));
          yield* _(indexerSvc.indexWorkspace());
        }

        yield* _(Ref.set(stateRef, 'ready'));
      }).pipe(
        Effect.catchAll((e) =>
          Effect.gen(function* (_) {
            yield* _(Ref.set(stateRef, 'error'));
            return yield* _(Effect.fail(e));
          }),
        ),
      ),

    indexWorkspace: () =>
      Effect.gen(function* (_) {
        yield* _(requireState('ready', 'indexing'));
        yield* _(Ref.set(stateRef, 'indexing'));
        const result = yield* _(indexerSvc.indexWorkspace());
        yield* _(Ref.set(stateRef, 'ready'));
        return result;
      }).pipe(
        Effect.catchAll((e) =>
          Effect.gen(function* (_) {
            yield* _(Ref.set(stateRef, 'error'));
            return yield* _(Effect.fail(e));
          }),
        ),
      ),

    reindexFile: (relativePath: string) =>
      Effect.gen(function* (_) {
        yield* _(requireState('ready'));
        return yield* _(indexerSvc.reindexFile(relativePath));
      }),

    removeFile: (relativePath: string) =>
      Effect.gen(function* (_) {
        yield* _(requireState('ready'));
        yield* _(indexerSvc.removeFile(relativePath));
      }),

    rebuildAll: () =>
      Effect.gen(function* (_) {
        yield* _(requireState('ready'));
        yield* _(Ref.set(stateRef, 'indexing'));
        const result = yield* _(indexerSvc.rebuildAll());
        yield* _(Ref.set(stateRef, 'ready'));
        return result;
      }).pipe(
        Effect.catchAll((e) =>
          Effect.gen(function* (_) {
            yield* _(Ref.set(stateRef, 'error'));
            return yield* _(Effect.fail(e));
          }),
        ),
      ),

    search: (query: string, options?: Partial<SearchOptions>) =>
      Effect.gen(function* (_) {
        const state = yield* _(Ref.get(stateRef));
        if (state !== 'ready') {
          // Fail open: return empty results instead of error
          return [];
        }

        // Build full SearchOptions with defaults
        const fullOptions: SearchOptions = {
          query,
          maxResults: options?.maxResults ?? 10,
          minScore: options?.minScore ?? 0.5,
        };

        // Embed the query
        const embeddingResult = yield* _(embeddingSvc.embedText(query));

        // Query Vectra
        const results = yield* _(vectraSvc.query(embeddingResult.embedding, fullOptions));

        // Filter by minimum score and sort by score descending
        return results
          .filter((r) => r.score >= fullOptions.minScore)
          .sort((a, b) => b.score - a.score)
          .slice(0, fullOptions.maxResults);
      }).pipe(
        Effect.catchAll(() =>
          // Fail open: return empty results on any search error
          Effect.succeed([] as import('../types.js').SearchResult[]),
        ),
      ),

    getFeatureState: () =>
      Ref.get(stateRef),
  } satisfies SemanticSearchService;
});

export const SemanticSearchServiceLayer = Layer.effect(
  SemanticSearchServiceTag,
  SemanticSearchServiceLive,
);
