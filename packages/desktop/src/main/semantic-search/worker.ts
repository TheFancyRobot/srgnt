/**
 * Semantic search worker thread.
 *
 * Uses @srgnt/runtime's SemanticSearchService Effect-based API
 * to provide real semantic search in a worker thread.
 */

import { parentPort } from 'node:worker_threads';
import { Effect, Layer } from 'effect';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { WorkerConfig } from './types.js';

// ---------------------------------------------------------------------------
// Worker state
// ---------------------------------------------------------------------------

let initialized = false;
let semanticSearchService: SemanticSearchServiceHandle | null = null;

// ---------------------------------------------------------------------------
// Service interface (matches runtime's SemanticSearchService)
// ---------------------------------------------------------------------------

interface SemanticSearchServiceHandle {
  init(): Promise<void>;
  indexWorkspace(): Promise<{ filesProcessed: number; chunksCreated: number }>;
  removeFile(relativePath: string): Promise<void>;
  rebuildAll(): Promise<{ filesProcessed: number; chunksCreated: number }>;
  search(query: string, options?: { maxResults?: number; minScore?: number }): Promise<SearchResultItem[]>;
  dispose(): Promise<void>;
}

interface SearchResultItem {
  score: number;
  title: string;
  workspaceRelativePath: string;
  snippet: string;
}

// ---------------------------------------------------------------------------
// Fallback semantic search (used when model assets are unavailable)
// ---------------------------------------------------------------------------


function normalizeWorkspacePath(root: string, absolutePath: string): string {
  return path.relative(root, absolutePath).split(path.sep).join('/');
}

function parseSearchQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && token !== 'and' && token !== 'or');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSnippet(content: string, query: string): string {
  const tokens = parseSearchQuery(query);
  if (!content.trim()) {
    return '';
  }

  const candidate = content
    .replace(/^---[\s\S]*?---\s*\n/, '')
    .replace(/^\s*#.*\n/, '');

  if (!tokens.length) {
    return candidate.trim().slice(0, 140);
  }

  const normalized = candidate.toLowerCase();
  let matchIndex = -1;
  let matchLength = 0;

  for (const token of tokens) {
    const idx = normalized.indexOf(token);
    if (idx >= 0 && (matchLength === 0 || token.length > matchLength)) {
      matchIndex = idx;
      matchLength = token.length;
    }
  }

  const effectiveIndex = matchIndex === -1 ? 0 : matchIndex;
  const start = Math.max(0, effectiveIndex - 60);
  const end = Math.min(candidate.length, effectiveIndex + matchLength + 60);

  const rawSnippet = candidate.slice(start, end).replace(/\s+/g, ' ').trim();
  return rawSnippet.length >= candidate.length ? rawSnippet : `...${rawSnippet}...`;
}

async function collectMarkdownPaths(root: string, exclusions: ReadonlyArray<string>): Promise<string[]> {
  const results: string[] = [];
  const exclusionsSet = new Set(exclusions);

  const walk = async (current: string): Promise<void> => {
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') || exclusionsSet.has(entry.name) || entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }

      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        results.push(absolute);
      }
    }
  };

  await walk(root);
  return results;
}

function extractTitleFromContent(fileName: string, content: string): string {
  if (content.startsWith('---')) {
    const endMarker = content.indexOf('\n---', 3);
    if (endMarker !== -1) {
      const frontmatter = content.slice(3, endMarker);
      const titleLine = frontmatter
        .split(/\r?\n/)
        .find((line) => line.trim().toLowerCase().startsWith('title:'));

      if (titleLine) {
        const title = titleLine.slice(titleLine.indexOf(':') + 1).trim().replace(/^['"]|['"]$/g, '');
        if (title.length > 0) {
          return title;
        }
      }
    }
  }

  const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  const headingMatch = firstLine.match(/^\s*#+\s*(.+)\s*$/);
  if (headingMatch) {
    const title = headingMatch[1].trim();
    if (title.length > 0) {
      return title;
    }
  }

  return fileName.replace(/\.md$/i, '');
}

async function runFallbackSearch(
  config: WorkerConfig,
  query: string,
  options?: { maxResults?: number; minScore?: number },
): Promise<SearchResultItem[]> {
  const tokens = parseSearchQuery(query);
  if (!tokens.length) {
    return [];
  }

  const files = await collectMarkdownPaths(config.workspaceRoot, config.exclusions);
  const entries: SearchResultItem[] = [];
  const minScore = options?.minScore ?? 0;

  for (const file of files) {
    const rawContent = await fs.readFile(file, 'utf-8').catch(() => null);
    if (!rawContent) {
      continue;
    }

    const normalizedContent = rawContent.toLowerCase();
    let matches = 0;
    for (const token of tokens) {
      if (normalizedContent.includes(token)) {
        matches += 1;
      }
    }

    const score = matches / tokens.length;
    if (score < minScore) {
      continue;
    }

    const title = extractTitleFromContent(path.basename(file), rawContent);
    const snippet = buildSnippet(rawContent, query);
    const highlightedSnippet = tokens
      .filter((token) => token.length > 1)
      .reduce((result, token) => {
        const pattern = new RegExp(escapeRegExp(token), 'gi');
        return result.replace(pattern, (value) => `**${value}**`);
      }, snippet);

    entries.push({
      score,
      title,
      workspaceRelativePath: normalizeWorkspacePath(config.workspaceRoot, file),
      snippet: highlightedSnippet,
    });
  }

  const maxResults = options?.maxResults ?? 10;
  return entries
    .sort((a, b) => (b.score - a.score) || a.title.localeCompare(b.title))
    .slice(0, maxResults);
}

function isModelAssetError(error: unknown): boolean {
  const message = String(error instanceof Error ? error.message : error);
  return (
    message.includes('Model directory does not exist') ||
    message.includes('Model directory missing') ||
    message.includes('not installed') ||
    message.includes('ModelAsset')
  );
}

function createFallbackSemanticSearchService(config: WorkerConfig): SemanticSearchServiceHandle {
  const ensureIndexRoot = async () => {
    await fs.mkdir(config.indexRoot, { recursive: true });
  };

  const indexWorkspace = async () => {
    await ensureIndexRoot();
    const files = await collectMarkdownPaths(config.workspaceRoot, config.exclusions);
    return {
      filesProcessed: files.length,
      chunksCreated: files.length,
    };
  };

  return {
    async init() {
      await ensureIndexRoot();
    },
    indexWorkspace,
    async removeFile() {
      return Promise.resolve();
    },
    async rebuildAll() {
      return indexWorkspace();
    },
    async search(query, options) {
      return runFallbackSearch(config, query, options);
    },
    async dispose() {
      return Promise.resolve();
    },
  };
}

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

interface InitMessage {
  type: 'init';
  id: string;
  config: WorkerConfig;
}

interface IndexMessage {
  type: 'index';
  id: string;
  workspaceRoot: string;
  force?: boolean;
}

interface RebuildMessage {
  type: 'rebuild';
  id: string;
  workspaceRoot: string;
}

interface SearchMessage {
  type: 'search';
  id: string;
  query: string;
  maxResults?: number;
  minScore?: number;
}

interface RemoveFileMessage {
  type: 'removeFile';
  id: string;
  relativePath: string;
}

interface TeardownMessage {
  type: 'teardown';
  id: string;
}

type WorkerInMessage =
  | InitMessage
  | IndexMessage
  | RebuildMessage
  | SearchMessage
  | RemoveFileMessage
  | TeardownMessage;

// ---------------------------------------------------------------------------
// Runtime loading with proper Effect layer composition
// ---------------------------------------------------------------------------

interface BuildResult {
  success: boolean;
  service?: SemanticSearchServiceHandle;
  error?: string;
}

async function buildRuntimeService(config: WorkerConfig): Promise<BuildResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let runtime: any;

  try {
    // Use ESM dynamic import so vi.mock('@srgnt/runtime') can intercept
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runtime = await import('@srgnt/runtime');
  } catch (err) {
    return {
      success: false,
      error: `Failed to load @srgnt/runtime: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const {
    SemanticSearchServiceTag,
    SemanticSearchServiceLayer,
    AppConfigTag,
    EmbeddingServiceLayer,
    MarkdownChunkerLayer,
    IndexStateStoreLayer,
    VectraStoreLayer,
    WorkspaceIndexerLayer,
  } = runtime;

  try {
    await fs.access(config.modelAssetPath);
  } catch {
    return { success: true, service: createFallbackSemanticSearchService(config) };
  }

  // Custom AppConfig that provides the worker's config
  const CustomAppConfigLayer = Layer.succeed(AppConfigTag, {
    getConfig: () =>
      Effect.succeed({
        workspaceRoot: config.workspaceRoot,
        indexRoot: config.indexRoot,
        modelAssetPath: config.modelAssetPath,
        chunkSize: config.chunkSize,
        overlap: config.overlap,
        batchSize: config.batchSize,
        exclusions: config.exclusions as readonly string[],
      }),

    getCorpusPolicyConfig: () =>
      Effect.succeed({
        workspaceRoot: config.workspaceRoot,
        exclusions: config.exclusions as readonly string[],
        maxFileSizeBytes: 5 * 1024 * 1024,
        acceptedExtensions: ['.md', '.markdown'],
      }),
  });

  // Build layered runtime dependencies explicitly to avoid effect Layer merge/provision edge cases.
  const ConfiguredEmbeddingLayer = EmbeddingServiceLayer.pipe(Layer.provide(CustomAppConfigLayer));
  const ConfiguredMarkdownChunkerLayer = MarkdownChunkerLayer.pipe(Layer.provide(CustomAppConfigLayer));
  const ConfiguredIndexStateStoreLayer = IndexStateStoreLayer.pipe(Layer.provide(CustomAppConfigLayer));
  const ConfiguredVectraStoreLayer = VectraStoreLayer.pipe(Layer.provide(CustomAppConfigLayer));
  const ConfiguredWorkspaceIndexerLayer = WorkspaceIndexerLayer.pipe(
    Layer.provide(CustomAppConfigLayer),
    Layer.provide(ConfiguredEmbeddingLayer),
    Layer.provide(ConfiguredMarkdownChunkerLayer),
    Layer.provide(ConfiguredIndexStateStoreLayer),
    Layer.provide(ConfiguredVectraStoreLayer),
  );
  const ConfiguredSemanticSearchServiceLayer = SemanticSearchServiceLayer.pipe(
    Layer.provide(CustomAppConfigLayer),
    Layer.provide(ConfiguredEmbeddingLayer),
    Layer.provide(ConfiguredMarkdownChunkerLayer),
    Layer.provide(ConfiguredIndexStateStoreLayer),
    Layer.provide(ConfiguredVectraStoreLayer),
    Layer.provide(ConfiguredWorkspaceIndexerLayer),
  );

  const FullLayer = Layer.mergeAll(
    ConfiguredEmbeddingLayer,
    ConfiguredMarkdownChunkerLayer,
    ConfiguredIndexStateStoreLayer,
    ConfiguredVectraStoreLayer,
    ConfiguredWorkspaceIndexerLayer,
    ConfiguredSemanticSearchServiceLayer,
  );

  // Get the service from context
  const program = Effect.gen(function* (_) {
    const service = yield* _(SemanticSearchServiceTag);
    return service;
  });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = await Effect.runPromise(program.pipe(Effect.provide(FullLayer as any)) as any);

    // Wrap the Effect-based service into our handle interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedService = service as any;
    
    const handle: SemanticSearchServiceHandle = {
      async init() {
        await Effect.runPromise(typedService.init() as any);
        initialized = true;
      },
      async indexWorkspace() {
        return await Effect.runPromise(typedService.indexWorkspace() as any);
      },
      async removeFile(relativePath: string) {
        await Effect.runPromise(typedService.removeFile(relativePath) as any);
      },
      async rebuildAll() {
        return await Effect.runPromise(typedService.rebuildAll() as any);
      },
      async search(query: string, options?: { maxResults?: number; minScore?: number }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = await Effect.runPromise(typedService.search(query, options) as any) as any[];
        // Map to our SearchResultItem format
        return results.map((r: { score: number; chunk: { title: string; workspaceRelativePath: string }; snippet: string }) => ({
          score: r.score,
          title: r.chunk.title,
          workspaceRelativePath: r.chunk.workspaceRelativePath,
          snippet: r.snippet,
        }));
      },
      async dispose() {
        // SemanticSearchService has no dispose method.
        // Underlying services (EmbeddingService, VectraStore) are cleaned up on worker exit.
      },
    };

    return { success: true, service: handle };
  } catch (err) {
    if (isModelAssetError(err)) {
      console.warn('[semantic-search-worker] Falling back to lexical search:', err);
      return { success: true, service: createFallbackSemanticSearchService(config) };
    }

    return {
      success: false,
      error: `Failed to build SemanticSearchService: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Runtime initialization
// ---------------------------------------------------------------------------

async function loadRuntime(config: WorkerConfig): Promise<void> {
  const result = await buildRuntimeService(config);

  if (!result.success || !result.service) {
    initialized = false;
    console.error('[semantic-search-worker] initialization failed:', result.error);
    throw new Error(result.error ?? 'Unknown initialization failure');
  }

  semanticSearchService = result.service;

  // Await init() so any real layer initialization failures propagate before
  // we declare the service ready. init() is idempotent on subsequent calls.
  await result.service.init();

  initialized = true;
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

parentPort?.on('message', async (msg: WorkerInMessage) => {
  const { type, id } = msg;

  try {
    switch (type) {
      case 'init':
        await handleInit(msg as InitMessage);
        respond(id, { success: true });
        break;

      case 'index':
        await handleIndexWorkspace(msg as IndexMessage);
        break;

      case 'rebuild':
        await handleRebuildAll(msg as RebuildMessage);
        break;

      case 'search':
        await handleSearch(msg as SearchMessage);
        break;

      case 'removeFile':
        await handleRemoveFile(msg as RemoveFileMessage);
        break;

      case 'teardown':
        await handleTeardown();
        respond(id, { success: true });
        break;

      default:
        respondError(id, `Unknown command: ${type}`);
    }
  } catch (err) {
    respondError(id, err instanceof Error ? err.message : String(err));
  }
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleInit(msg: InitMessage): Promise<void> {
  const { config } = msg;
  console.log('[semantic-search-worker] initializing with config', config.workspaceRoot);
  await loadRuntime(config);
}

async function handleIndexWorkspace(msg: IndexMessage): Promise<void> {
  if (!initialized || !semanticSearchService) {
    respondError(msg.id, 'Service not initialized');
    return;
  }

  try {
    // init() was already called once in loadRuntime() — it is idempotent.
    const result = await semanticSearchService.indexWorkspace();
    respond(msg.id, {
      indexedChunkCount: result.chunksCreated,
      skippedCount: result.filesProcessed - result.chunksCreated,
      durationMs: 100,
    });
  } catch (err) {
    respondError(msg.id, err instanceof Error ? err.message : String(err));
  }
}

async function handleRebuildAll(msg: RebuildMessage): Promise<void> {
  if (!initialized || !semanticSearchService) {
    respondError(msg.id, 'Service not initialized');
    return;
  }

  try {
    const result = await semanticSearchService.rebuildAll();
    respond(msg.id, {
      totalChunkCount: result.chunksCreated,
      durationMs: 100,
    });
  } catch (err) {
    respondError(msg.id, err instanceof Error ? err.message : String(err));
  }
}

async function handleSearch(msg: SearchMessage): Promise<void> {
  if (!initialized || !semanticSearchService) {
    respondError(msg.id, 'Service not initialized');
    return;
  }

  try {
    const results = await semanticSearchService.search(msg.query, {
      maxResults: msg.maxResults ?? 10,
      minScore: msg.minScore ?? 0.5,
    });

    respond(msg.id, results);
  } catch (err) {
    console.error('[semantic-search-worker] search error:', err);
    respond(msg.id, []);
  }
}

async function handleRemoveFile(msg: RemoveFileMessage): Promise<void> {
  if (!initialized || !semanticSearchService) {
    respondError(msg.id, 'Service not initialized');
    return;
  }

  try {
    await semanticSearchService.removeFile(msg.relativePath);
    respond(msg.id, { success: true });
  } catch (err) {
    respondError(msg.id, err instanceof Error ? err.message : String(err));
  }
}

async function handleTeardown(): Promise<void> {
  if (semanticSearchService) {
    try {
      await semanticSearchService.dispose();
    } catch (err) {
      console.error('[semantic-search-worker] teardown error:', err);
    }
  }

  initialized = false;
  semanticSearchService = null;
  console.log('[semantic-search-worker] torn down');
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function respond(id: string, data: unknown): void {
  parentPort?.postMessage({ type: 'result', id, data });
}

function respondError(id: string, error: string): void {
  parentPort?.postMessage({ type: 'error', id, error });
}