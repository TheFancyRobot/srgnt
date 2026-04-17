import { describe, it, expect } from 'vitest';
import {
  CorpusPolicyError,
  SemanticSearchError,
  ConfigurationError,
  ModelAssetError,
  IndexCorruptionError,
  CrawlPolicyViolationError,
  UnsupportedFileError,
} from './errors.js';

describe('CorpusPolicyError', () => {
  it('creates with message only', () => {
    const err = new CorpusPolicyError('test error');
    expect(err.name).toBe('CorpusPolicyError');
    expect(err.message).toBe('test error');
    expect(err.cause).toBeUndefined();
  });

  it('creates with typed cause', () => {
    const err = new CorpusPolicyError('denied', 'permission-denied');
    expect(err.cause).toBe('permission-denied');
  });

  it('is an instance of Error', () => {
    const err = new CorpusPolicyError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CorpusPolicyError);
  });
});

describe('SemanticSearchError (TaggedError)', () => {
  it('creates with _tag', () => {
    const err = new SemanticSearchError({ message: 'base error' });
    expect(err._tag).toBe('SemanticSearchError');
    expect(err.message).toBe('base error');
  });
});

describe('ConfigurationError', () => {
  it('creates with message and field', () => {
    const err = new ConfigurationError({ message: 'bad config', field: 'workspaceRoot' });
    expect(err._tag).toBe('ConfigurationError');
    expect(err.field).toBe('workspaceRoot');
  });

  it('creates without optional field', () => {
    const err = new ConfigurationError({ message: 'bad config' });
    expect(err.field).toBeUndefined();
  });
});

describe('ModelAssetError', () => {
  it('creates with assetPath', () => {
    const err = new ModelAssetError({ message: 'not found', assetPath: '/path/to/model' });
    expect(err._tag).toBe('ModelAssetError');
    expect(err.assetPath).toBe('/path/to/model');
  });
});

describe('IndexCorruptionError', () => {
  it('creates with manifestPath', () => {
    const err = new IndexCorruptionError({ message: 'corrupt', manifestPath: '/idx/manifest.json' });
    expect(err._tag).toBe('IndexCorruptionError');
  });
});

describe('CrawlPolicyViolationError', () => {
  it('creates with violatedPath and reason', () => {
    const err = new CrawlPolicyViolationError({
      message: 'policy violation',
      violatedPath: '/workspace/.agent-vault/secret.md',
      reason: 'excluded-directory',
    });
    expect(err._tag).toBe('CrawlPolicyViolationError');
    expect(err.violatedPath).toContain('.agent-vault');
    expect(err.reason).toBe('excluded-directory');
  });
});

describe('UnsupportedFileError', () => {
  it('creates with filePath and extension', () => {
    const err = new UnsupportedFileError({
      message: 'unsupported',
      filePath: '/workspace/image.png',
      extension: '.png',
    });
    expect(err._tag).toBe('UnsupportedFileError');
    expect(err.extension).toBe('.png');
  });
});
