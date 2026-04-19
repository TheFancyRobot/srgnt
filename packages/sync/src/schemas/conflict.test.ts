import { describe, it, expect } from 'vitest';
import { Schema } from '@effect/schema';
import {
  SConflictType,
  SMergeStrategy,
  SVersionInfo,
  SConflictRecord,
  SMergeResult,
} from './conflict.js';

describe('SConflictType', () => {
  it('accepts every documented conflict type', () => {
    for (const type of ['frontmatterField', 'markdownBody', 'fileDeleted', 'fileCreatedBoth']) {
      expect(Schema.decodeUnknownSync(SConflictType)(type)).toBe(type);
    }
  });

  it('rejects an unknown conflict type', () => {
    expect(() => Schema.decodeUnknownSync(SConflictType)('renamed')).toThrow();
  });
});

describe('SMergeStrategy', () => {
  it('accepts the three documented strategies', () => {
    for (const s of ['lastWriteWins', 'fieldLevelMerge', 'manualResolution']) {
      expect(Schema.decodeUnknownSync(SMergeStrategy)(s)).toBe(s);
    }
  });

  it('rejects an unknown strategy', () => {
    expect(() => Schema.decodeUnknownSync(SMergeStrategy)('threeWay')).toThrow();
  });
});

describe('SVersionInfo', () => {
  const baseline = {
    id: 'v1',
    lastModified: '2026-04-19T00:00:00.000Z',
    deviceId: 'device-a',
    contentHash: 'sha256:abc',
  };

  it('parses without optional frontmatter/body', () => {
    const parsed = Schema.decodeUnknownSync(SVersionInfo)(baseline);
    expect(parsed.frontmatter).toBeUndefined();
    expect(parsed.body).toBeUndefined();
  });

  it('accepts a frontmatter record with unknown-typed values', () => {
    const parsed = Schema.decodeUnknownSync(SVersionInfo)({
      ...baseline,
      frontmatter: { title: 'Plan', count: 7, published: true },
      body: 'full body',
    });
    expect(parsed.frontmatter).toEqual({ title: 'Plan', count: 7, published: true });
    expect(parsed.body).toBe('full body');
  });

  it('rejects missing required fields', () => {
    const { deviceId: _omit, ...rest } = baseline;
    expect(() => Schema.decodeUnknownSync(SVersionInfo)(rest)).toThrow();
  });
});

describe('SConflictRecord', () => {
  const version = {
    id: 'v',
    lastModified: '2026-04-19T00:00:00.000Z',
    deviceId: 'd',
    contentHash: 'h',
  };
  const baseline = {
    entityId: 'note-1',
    conflictType: 'markdownBody' as const,
    localVersion: version,
    remoteVersion: { ...version, deviceId: 'remote' },
    detectedAt: '2026-04-19T00:00:00.000Z',
  };

  it('parses the minimal record', () => {
    const parsed = Schema.decodeUnknownSync(SConflictRecord)(baseline);
    expect(parsed.resolution).toBeUndefined();
    expect(parsed.resolvedAt).toBeUndefined();
  });

  it('accepts resolution + resolvedAt + resolvedBy', () => {
    const parsed = Schema.decodeUnknownSync(SConflictRecord)({
      ...baseline,
      resolution: 'merged',
      resolvedAt: '2026-04-19T00:01:00.000Z',
      resolvedBy: 'alice',
    });
    expect(parsed.resolution).toBe('merged');
    expect(parsed.resolvedBy).toBe('alice');
  });

  it('rejects an unknown resolution value', () => {
    expect(() =>
      Schema.decodeUnknownSync(SConflictRecord)({
        ...baseline,
        resolution: 'ignored',
      }),
    ).toThrow();
  });
});

describe('SMergeResult', () => {
  it('parses a successful auto-merge', () => {
    const result = {
      success: true,
      mergedContent: 'body',
      mergedFrontmatter: { title: 'Plan' },
      requiresManualResolution: false,
    };
    expect(Schema.decodeUnknownSync(SMergeResult)(result)).toEqual(result);
  });

  it('parses a failed merge with error and manual resolution flag', () => {
    const result = {
      success: false,
      error: 'conflict in body',
      requiresManualResolution: true,
    };
    expect(Schema.decodeUnknownSync(SMergeResult)(result)).toEqual(result);
  });

  it('rejects missing success flag', () => {
    expect(() =>
      Schema.decodeUnknownSync(SMergeResult)({ requiresManualResolution: false }),
    ).toThrow();
  });
});
