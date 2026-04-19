import { describe, it, expect } from 'vitest';
import { Schema } from '@effect/schema';
import {
  SChunkMetadata,
  SSearchResult,
  SIndexStatus,
  SFeatureState,
  SIndexManifest,
  SSearchOptions,
} from './types.js';
import { parseSync, safeParse } from '@srgnt/contracts';

describe('SChunkMetadata', () => {
  it('parses valid chunk metadata', () => {
    const input = {
      id: 'chunk-001',
      workspaceRelativePath: 'docs/readme.md',
      fileName: 'readme.md',
      title: 'Readme',
      headingPath: ['Readme', 'Getting Started'],
      chunkIndex: 0,
      chunkText: 'Hello world',
      wikilinks: ['Notes/Other'],
      mtimeMs: 1700000000000,
      contentHash: 'abc123',
      modelId: 'model-v1',
    };
    const result = parseSync(SChunkMetadata, input);
    expect(result.id).toBe('chunk-001');
    expect(result.headingPath).toEqual(['Readme', 'Getting Started']);
  });

  it('rejects missing required fields', () => {
    const result = safeParse(SChunkMetadata, { id: 'x' });
    expect(result.success).toBe(false);
  });
});

describe('SSearchResult', () => {
  it('parses a valid search result', () => {
    const input = {
      score: 0.95,
      chunk: {
        id: 'c1',
        workspaceRelativePath: 'a/b.md',
        fileName: 'b.md',
        title: 'B',
        headingPath: [],
        chunkIndex: 0,
        chunkText: 'text',
        wikilinks: [],
        mtimeMs: 1,
        contentHash: 'h',
        modelId: 'm1',
      },
      snippet: 'matching text...',
    };
    const result = parseSync(SSearchResult, input);
    expect(result.score).toBe(0.95);
    expect(result.snippet).toBe('matching text...');
  });
});

describe('SIndexStatus', () => {
  it('parses with optional fields omitted', () => {
    const result = parseSync(SIndexStatus, { isIndexed: false, chunkCount: 0 });
    expect(result.isIndexed).toBe(false);
    expect(result.lastIndexedAt).toBeUndefined();
  });

  it('parses with optional fields present', () => {
    const result = parseSync(SIndexStatus, {
      isIndexed: true,
      chunkCount: 42,
      lastIndexedAt: '2026-01-01T00:00:00Z',
      modelId: 'm1',
    });
    expect(result.chunkCount).toBe(42);
    expect(result.modelId).toBe('m1');
  });
});

describe('SFeatureState', () => {
  it('accepts all valid states', () => {
    const states = ['uninitialized', 'initializing', 'ready', 'indexing', 'disabled', 'error'];
    for (const state of states) {
      expect(parseSync(SFeatureState, state)).toBe(state);
    }
  });

  it('rejects invalid state', () => {
    const result = safeParse(SFeatureState, 'broken');
    expect(result.success).toBe(false);
  });
});

describe('SIndexManifest', () => {
  it('parses valid manifest', () => {
    const input = {
      modelId: 'model-v1',
      version: '1.0.0',
      chunkIds: ['c1', 'c2'],
      contentHashes: ['h1', 'h2'],
    };
    const result = parseSync(SIndexManifest, input);
    expect(result.chunkIds).toHaveLength(2);
  });
});

describe('SSearchOptions', () => {
  it('applies defaults', () => {
    const result = parseSync(SSearchOptions, { query: 'test' });
    expect(result.maxResults).toBe(10);
    expect(result.minScore).toBe(0.5);
  });

  it('allows overriding defaults', () => {
    const result = parseSync(SSearchOptions, { query: 'test', maxResults: 5, minScore: 0.8 });
    expect(result.maxResults).toBe(5);
    expect(result.minScore).toBe(0.8);
  });
});
