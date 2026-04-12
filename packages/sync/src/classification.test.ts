import { describe, it, expect } from 'vitest';
import {
  SDataClassification,
  SSyncSafeEntity,
  dataClassificationMap,
  getClassification,
  isSyncSafe,
  requiresEncryption,
} from './classification.js';
import { parseSync } from '@srgnt/contracts';

// --- Schema validation tests ---

describe('SDataClassification', () => {
  it('accepts valid classification values', () => {
    for (const value of ['public', 'internal', 'confidential', 'restricted'] as const) {
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

describe('SSyncSafeEntity', () => {
  it('parses a minimal entity (only id + classification + canSync)', () => {
    const entity = parseSync(SSyncSafeEntity, {
      id: 'Task',
      classification: 'internal',
      canSync: true,
    });
    expect(entity).toEqual({
      id: 'Task',
      classification: 'internal',
      canSync: true,
      encryption: 'none',
      conflictStrategy: 'last-write-wins',
    });
  });

  it('parses a full entity with all fields', () => {
    const entity = parseSync(SSyncSafeEntity, {
      id: 'Message',
      classification: 'confidential',
      canSync: true,
      encryption: 'both',
      conflictStrategy: 'server-wins',
    });
    expect(entity.encryption).toBe('both');
    expect(entity.conflictStrategy).toBe('server-wins');
  });

  it('rejects entity without required fields', () => {
    expect(() => parseSync(SSyncSafeEntity, { id: 'X' })).toThrow();
  });

  it('rejects entity with invalid classification', () => {
    expect(() =>
      parseSync(SSyncSafeEntity, { id: 'X', classification: 'secret', canSync: false })
    ).toThrow();
  });

  it('rejects entity with invalid encryption', () => {
    expect(() =>
      parseSync(SSyncSafeEntity, {
        id: 'X',
        classification: 'public',
        canSync: true,
        encryption: 'military-grade',
      })
    ).toThrow();
  });

  it('rejects entity with invalid conflictStrategy', () => {
    expect(() =>
      parseSync(SSyncSafeEntity, {
        id: 'X',
        classification: 'public',
        canSync: true,
        conflictStrategy: 'always-mine',
      })
    ).toThrow();
  });
});

// --- dataClassificationMap tests ---

describe('dataClassificationMap', () => {
  const knownTypes = ['Task', 'Event', 'Message', 'Person', 'Artifact'] as const;

  it('has entries for all known entity types', () => {
    for (const type of knownTypes) {
      expect(dataClassificationMap[type]).toBeDefined();
    }
  });

  it('each entry has matching id and key', () => {
    for (const type of knownTypes) {
      expect(dataClassificationMap[type].id).toBe(type);
    }
  });

  it('all known types are sync-safe', () => {
    for (const type of knownTypes) {
      expect(dataClassificationMap[type].canSync).toBe(true);
    }
  });

  it('confidential types require encryption', () => {
    const confidential = ['Message', 'Person'];
    for (const type of confidential) {
      expect(dataClassificationMap[type].encryption).not.toBe('none');
    }
  });

  it('Person uses manual-merge conflict strategy', () => {
    expect(dataClassificationMap['Person'].conflictStrategy).toBe('manual-merge');
  });

  it('Message uses server-wins conflict strategy', () => {
    expect(dataClassificationMap['Message'].conflictStrategy).toBe('server-wins');
  });

  it('Task, Event, Artifact use last-write-wins conflict strategy', () => {
    for (const type of ['Task', 'Event', 'Artifact']) {
      expect(dataClassificationMap[type].conflictStrategy).toBe('last-write-wins');
    }
  });
});

// --- getClassification tests ---

describe('getClassification', () => {
  it('returns the classification for known types', () => {
    const task = getClassification('Task');
    expect(task.id).toBe('Task');
    expect(task.classification).toBe('internal');
    expect(task.canSync).toBe(true);
  });

  it('returns the classification for Message', () => {
    const msg = getClassification('Message');
    expect(msg.classification).toBe('confidential');
    expect(msg.encryption).toBe('both');
  });

  it('returns the classification for Person', () => {
    const person = getClassification('Person');
    expect(person.classification).toBe('confidential');
    expect(person.conflictStrategy).toBe('manual-merge');
  });

  it('returns safe defaults for unknown types', () => {
    const unknown = getClassification('UnknownEntityType');
    expect(unknown.id).toBe('UnknownEntityType');
    expect(unknown.classification).toBe('internal');
    expect(unknown.canSync).toBe(false);
    expect(unknown.encryption).toBe('none');
    expect(unknown.conflictStrategy).toBe('server-wins');
  });

  it('returns defaults with empty string input', () => {
    const empty = getClassification('');
    expect(empty.id).toBe('');
    expect(empty.canSync).toBe(false);
  });

  it('returns defaults for arbitrary strings', () => {
    const rand = getClassification('SomeRandomThing-123');
    expect(rand.id).toBe('SomeRandomThing-123');
    expect(rand.canSync).toBe(false);
  });
});

// --- isSyncSafe tests ---

describe('isSyncSafe', () => {
  it('returns true for Task', () => {
    expect(isSyncSafe('Task')).toBe(true);
  });

  it('returns true for Event', () => {
    expect(isSyncSafe('Event')).toBe(true);
  });

  it('returns true for Message', () => {
    expect(isSyncSafe('Message')).toBe(true);
  });

  it('returns true for Person', () => {
    expect(isSyncSafe('Person')).toBe(true);
  });

  it('returns true for Artifact', () => {
    expect(isSyncSafe('Artifact')).toBe(true);
  });

  it('returns false for unknown type', () => {
    expect(isSyncSafe('NotAType')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSyncSafe('')).toBe(false);
  });
});

// --- requiresEncryption tests ---

describe('requiresEncryption', () => {
  it('returns true for Message (both)', () => {
    expect(requiresEncryption('Message')).toBe(true);
  });

  it('returns true for Person (both)', () => {
    expect(requiresEncryption('Person')).toBe(true);
  });

  it('returns true for Task (at-rest)', () => {
    expect(requiresEncryption('Task')).toBe(true);
  });

  it('returns true for Event (at-rest)', () => {
    expect(requiresEncryption('Event')).toBe(true);
  });

  it('returns true for Artifact (at-rest)', () => {
    expect(requiresEncryption('Artifact')).toBe(true);
  });

  it('returns false for unknown type (defaults to none)', () => {
    expect(requiresEncryption('NotAType')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(requiresEncryption('')).toBe(false);
  });
});
