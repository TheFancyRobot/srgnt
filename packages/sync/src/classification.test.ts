import { describe, it, expect } from 'vitest';
import { parseSync } from '@srgnt/contracts';
import {
  SDataClassification,
  SSyncEligibility,
  SStorageFormat,
  SAuthoritative,
  SDataClassEntry,
  SClassificationMatrix,
  classificationMatrix,
} from './schemas/classification.js';

// --- SDataClassification tests ---

describe('SDataClassification', () => {
  it('accepts valid classification values', () => {
    for (const value of ['public', 'internal', 'confidential', 'secret'] as const) {
      const result = parseSync(SDataClassification, value);
      expect(result).toBe(value);
    }
  });

  it('rejects invalid classification values', () => {
    expect(() => parseSync(SDataClassification, 'top-secret')).toThrow();
    expect(() => parseSync(SDataClassification, 'PUBLIC')).toThrow();
    expect(() => parseSync(SDataClassification, '')).toThrow();
    expect(() => parseSync(SDataClassification, 42)).toThrow();
  });
});

// --- SSyncEligibility tests ---

describe('SSyncEligibility', () => {
  it('accepts valid eligibility values', () => {
    for (const value of ['syncSafe', 'encryptedOnly', 'localOnly', 'rebuildable'] as const) {
      const result = parseSync(SSyncEligibility, value);
      expect(result).toBe(value);
    }
  });

  it('rejects invalid eligibility values', () => {
    expect(() => parseSync(SSyncEligibility, 'safe')).toThrow();
    expect(() => parseSync(SSyncEligibility, 'local')).toThrow();
    expect(() => parseSync(SSyncEligibility, '')).toThrow();
  });
});

// --- SStorageFormat tests ---

describe('SStorageFormat', () => {
  it('accepts valid format values', () => {
    const validFormats = [
      'markdown-file',
      'yaml-frontmatter',
      'json-structured',
      'derived-index',
      'secure-storage',
      'log-file',
      'binary-cache',
    ];
    for (const value of validFormats as (typeof validFormats)[number][]) {
      const result = parseSync(SStorageFormat, value);
      expect(result).toBe(value);
    }
  });

  it('rejects invalid format values', () => {
    expect(() => parseSync(SStorageFormat, 'json')).toThrow();
    expect(() => parseSync(SStorageFormat, 'file')).toThrow();
  });
});

// --- SAuthoritative tests ---

describe('SAuthoritative', () => {
  it('accepts valid authoritative values', () => {
    for (const value of ['authoritative', 'derived', 'cache'] as const) {
      const result = parseSync(SAuthoritative, value);
      expect(result).toBe(value);
    }
  });

  it('rejects invalid authoritative values', () => {
    expect(() => parseSync(SAuthoritative, 'primary')).toThrow();
    expect(() => parseSync(SAuthoritative, 'source')).toThrow();
  });
});

// --- SDataClassEntry tests ---

describe('SDataClassEntry', () => {
  it('parses a valid data class entry', () => {
    const entry = {
      name: 'workspace-markdown-files',
      format: 'markdown-file',
      classification: 'internal',
      eligibility: 'syncSafe',
      authoritative: 'authoritative',
      rationale: 'Primary user content.',
    };
    const result = parseSync(SDataClassEntry, entry);
    expect(result.name).toBe('workspace-markdown-files');
    expect(result.format).toBe('markdown-file');
    expect(result.classification).toBe('internal');
    expect(result.eligibility).toBe('syncSafe');
    expect(result.authoritative).toBe('authoritative');
  });

  it('rejects entry without required fields', () => {
    expect(() =>
      parseSync(SDataClassEntry, { name: 'test' })
    ).toThrow();
  });

  it('rejects entry with invalid format', () => {
    expect(() =>
      parseSync(SDataClassEntry, {
        name: 'test',
        format: 'invalid-format',
        classification: 'internal',
        eligibility: 'syncSafe',
        authoritative: 'authoritative',
        rationale: 'test',
      })
    ).toThrow();
  });

  it('rejects entry with invalid classification', () => {
    expect(() =>
      parseSync(SDataClassEntry, {
        name: 'test',
        format: 'markdown-file',
        classification: 'top-secret',
        eligibility: 'syncSafe',
        authoritative: 'authoritative',
        rationale: 'test',
      })
    ).toThrow();
  });
});

// --- Classification Matrix tests ---

describe('classificationMatrix', () => {
  it('contains entries for all required data classes', () => {
    const requiredClasses = [
      'workspace-markdown-files',
      'yaml-frontmatter',
      'dataview-indexes',
      'connector-credentials',
      'crash-logs',
      'user-settings',
      'run-history',
      'approval-records',
    ];
    const matrixNames = classificationMatrix.map((e) => e.name);
    for (const required of requiredClasses) {
      expect(matrixNames).toContain(required);
    }
  });

  it('each entry has required fields', () => {
    for (const entry of classificationMatrix) {
      expect(entry.name).toBeDefined();
      expect(entry.format).toBeDefined();
      expect(entry.classification).toBeDefined();
      expect(entry.eligibility).toBeDefined();
      expect(entry.authoritative).toBeDefined();
      expect(entry.rationale).toBeDefined();
    }
  });

  it('credentials are local-only and secret', () => {
    const credentials = classificationMatrix.find((e) => e.name === 'connector-credentials');
    expect(credentials?.eligibility).toBe('localOnly');
    expect(credentials?.classification).toBe('secret');
  });

  it('dataview indexes are rebuildable and derived', () => {
    const indexes = classificationMatrix.find((e) => e.name === 'dataview-indexes');
    expect(indexes?.eligibility).toBe('rebuildable');
    expect(indexes?.authoritative).toBe('derived');
  });

  it('confidential data requires encryption', () => {
    const confidentialEntries = classificationMatrix.filter(
      (e) => e.classification === 'confidential'
    );
    for (const entry of confidentialEntries) {
      expect(entry.eligibility).toMatch(/^(encryptedOnly|localOnly)$/);
    }
  });

  it('markdown files are authoritative and sync-safe', () => {
    const markdown = classificationMatrix.find((e) => e.name === 'workspace-markdown-files');
    expect(markdown?.authoritative).toBe('authoritative');
    expect(markdown?.eligibility).toBe('syncSafe');
  });
});

// --- SClassificationMatrix tests ---

describe('SClassificationMatrix', () => {
  it('parses the full classification matrix', () => {
    const result = parseSync(SClassificationMatrix, classificationMatrix);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBe(classificationMatrix.length);
  });

  it('rejects matrix with invalid entry', () => {
    const invalidMatrix = [
      ...classificationMatrix,
      {
        name: 'invalid',
        format: 'markdown-file',
        classification: 'invalid-class',
        eligibility: 'syncSafe',
        authoritative: 'authoritative',
        rationale: 'test',
      },
    ];
    expect(() => parseSync(SClassificationMatrix, invalidMatrix)).toThrow();
  });
});
