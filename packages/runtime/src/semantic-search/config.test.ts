import { describe, expect, it } from 'vitest';
import { parseSync, safeParse } from '@srgnt/contracts';
import { CorpusPolicyConfigSchema, SemanticSearchConfigSchema } from './config.js';

describe('SemanticSearchConfigSchema', () => {
  it('parses the required semantic search config surface', () => {
    const parsed = parseSync(SemanticSearchConfigSchema, {
      workspaceRoot: '/workspace',
      indexRoot: '/workspace/.srgnt-semantic-search',
      modelAssetPath: '/models/all-MiniLM-L6-v2',
    });

    expect(parsed.chunkSize).toBe(1000);
    expect(parsed.overlap).toBe(200);
    expect(parsed.batchSize).toBe(32);
    expect(parsed.exclusions).toContain('.agent-vault');
  });

  it('rejects invalid numeric values', () => {
    const result = safeParse(SemanticSearchConfigSchema, {
      workspaceRoot: '/workspace',
      indexRoot: '/workspace/.srgnt-semantic-search',
      modelAssetPath: '/models/all-MiniLM-L6-v2',
      chunkSize: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe('CorpusPolicyConfigSchema', () => {
  it('applies corpus defaults and preserves exclusions', () => {
    const parsed = parseSync(CorpusPolicyConfigSchema, {
      workspaceRoot: '/workspace',
    });

    expect(parsed.exclusions).toContain('.agent-vault');
    expect(parsed.maxFileSizeBytes).toBe(5 * 1024 * 1024);
    expect(parsed.acceptedExtensions).toEqual(['.md', '.markdown']);
  });
});
