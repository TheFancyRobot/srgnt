import { describe, it, expect } from 'vitest';
import {
  AppConfigTag,
  EmbeddingServiceTag,
  MarkdownChunkerTag,
  IndexStateStoreTag,
  VectraStoreTag,
  WorkspaceIndexerTag,
  SemanticSearchServiceTag,
} from './tags.js';

describe('Service Tags', () => {
  const allTags = [
    { name: 'AppConfigTag', tag: AppConfigTag, expectedKey: 'srgnt/AppConfig' },
    { name: 'EmbeddingServiceTag', tag: EmbeddingServiceTag, expectedKey: 'srgnt/EmbeddingService' },
    { name: 'MarkdownChunkerTag', tag: MarkdownChunkerTag, expectedKey: 'srgnt/MarkdownChunker' },
    { name: 'IndexStateStoreTag', tag: IndexStateStoreTag, expectedKey: 'srgnt/IndexStateStore' },
    { name: 'VectraStoreTag', tag: VectraStoreTag, expectedKey: 'srgnt/VectraStore' },
    { name: 'WorkspaceIndexerTag', tag: WorkspaceIndexerTag, expectedKey: 'srgnt/WorkspaceIndexer' },
    { name: 'SemanticSearchServiceTag', tag: SemanticSearchServiceTag, expectedKey: 'srgnt/SemanticSearchService' },
  ];

  it('all 7 tags are defined', () => {
    expect(allTags).toHaveLength(7);
  });

  it.each(allTags)('$name is defined and has a key', ({ tag, expectedKey }) => {
    expect(tag).toBeDefined();
    expect(tag.key).toBe(expectedKey);
  });

  it.each(allTags)('$name is a class (constructor)', ({ tag }) => {
    expect(typeof tag).toBe('function');
    expect(tag.prototype).toBeDefined();
  });

  it('all tags have unique keys', () => {
    const keys = allTags.map((t) => t.tag.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('all keys use the srgnt/ namespace prefix', () => {
    for (const { tag, expectedKey } of allTags) {
      expect(tag.key.startsWith('srgnt/')).toBe(true);
      expect(tag.key).toBe(expectedKey);
    }
  });
});
