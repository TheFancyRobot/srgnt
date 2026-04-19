import { describe, it, expect } from 'vitest';
import { Schema } from '@effect/schema';
import {
  SFrontmatterClassificationMeta,
  SFrontmatterBlock,
} from './frontmatter.js';

describe('SFrontmatterClassificationMeta', () => {
  it('accepts an empty object (all fields optional)', () => {
    const parsed = Schema.decodeUnknownSync(SFrontmatterClassificationMeta)({});
    expect(parsed.classification).toBeUndefined();
    expect(parsed.syncEligibility).toBeUndefined();
    expect(parsed.containsSensitiveContent).toBeUndefined();
  });

  it('round-trips all fields', () => {
    const parsed = Schema.decodeUnknownSync(SFrontmatterClassificationMeta)({
      classification: 'internal',
      syncEligibility: 'encryptedOnly',
      containsSensitiveContent: true,
    });
    expect(parsed.classification).toBe('internal');
    expect(parsed.syncEligibility).toBe('encryptedOnly');
    expect(parsed.containsSensitiveContent).toBe(true);
  });

  it('rejects an unknown syncEligibility literal', () => {
    expect(() =>
      Schema.decodeUnknownSync(SFrontmatterClassificationMeta)({
        syncEligibility: 'phantom',
      }),
    ).toThrow();
  });

  it('rejects a non-boolean containsSensitiveContent', () => {
    expect(() =>
      Schema.decodeUnknownSync(SFrontmatterClassificationMeta)({
        containsSensitiveContent: 'yes',
      }),
    ).toThrow();
  });
});

describe('SFrontmatterBlock', () => {
  it('accepts an empty block', () => {
    expect(Schema.decodeUnknownSync(SFrontmatterBlock)({})).toEqual({});
  });

  it('round-trips tags and nested srgntClass', () => {
    const parsed = Schema.decodeUnknownSync(SFrontmatterBlock)({
      title: 'Plan',
      tags: ['project', 'q2'],
      created: '2026-01-01',
      updated: '2026-04-19',
      srgntClass: {
        classification: 'confidential',
        syncEligibility: 'localOnly',
        containsSensitiveContent: false,
      },
    });
    expect(parsed.tags).toEqual(['project', 'q2']);
    expect(parsed.srgntClass?.syncEligibility).toBe('localOnly');
  });

  it('rejects a tags field that is not an array of strings', () => {
    expect(() =>
      Schema.decodeUnknownSync(SFrontmatterBlock)({ tags: 'project' }),
    ).toThrow();
  });
});
