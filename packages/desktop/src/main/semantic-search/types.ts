/**
 * Shared types for semantic search host and worker.
 */

export interface WorkerConfig {
  workspaceRoot: string;
  indexRoot: string;
  modelAssetPath: string;
  chunkSize: number;
  overlap: number;
  batchSize: number;
  exclusions: string[];
}

export interface WorkerMessage {
  type: string;
  id: string;
  [key: string]: unknown;
}

export interface SearchResultItem {
  id?: string;
  score: number;
  title: string;
  workspaceRelativePath: string;
  snippet: string;
  embedding?: number[];
  metadata?: {
    workspaceRelativePath: string;
    fileName: string;
    title: string;
    headingPath: string[];
    chunkIndex: number;
    chunkText: string;
    wikilinks: string[];
    mtimeMs: number;
    contentHash: string;
    modelId: string;
  };
}

export interface IndexResult {
  indexedChunkCount: number;
  skippedCount: number;
  durationMs: number;
}

export interface RebuildResult {
  totalChunkCount: number;
  durationMs: number;
}
