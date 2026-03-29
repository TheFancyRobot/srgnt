import { describe, it, expect } from 'vitest';
import { safeParse } from '../shared-schemas.js';
import {
  taskFixtures,
  eventFixtures,
  messageFixtures,
  personFixtures,
  artifactFixtures,
  validateEntity,
  v1EntityTypes,
} from './fixtures.js';
import { STask, SEvent, SMessage, SPerson, SArtifact } from './index.js';

describe('Fixtures', () => {
  describe('taskFixtures', () => {
    it('contains valid Task entities', () => {
      for (const task of taskFixtures) {
        expect(safeParse(STask, task).success).toBe(true);
      }
    });

    it('has tasks with provider metadata', () => {
      const taskWithProvider = taskFixtures.find((t) => t.envelope.provider);
      expect(taskWithProvider?.envelope.provider).toBe('jira');
    });
  });

  describe('eventFixtures', () => {
    it('contains valid Event entities', () => {
      for (const event of eventFixtures) {
        expect(safeParse(SEvent, event).success).toBe(true);
      }
    });
  });

  describe('messageFixtures', () => {
    it('contains valid Message entities', () => {
      for (const message of messageFixtures) {
        expect(safeParse(SMessage, message).success).toBe(true);
      }
    });
  });

  describe('personFixtures', () => {
    it('contains valid Person entities', () => {
      for (const person of personFixtures) {
        expect(safeParse(SPerson, person).success).toBe(true);
      }
    });
  });

  describe('artifactFixtures', () => {
    it('contains valid Artifact entities', () => {
      for (const artifact of artifactFixtures) {
        expect(safeParse(SArtifact, artifact).success).toBe(true);
      }
    });
  });
});

describe('validateEntity', () => {
  it('returns true for valid Task', () => {
    expect(validateEntity(taskFixtures[0])).toBe(true);
  });

  it('returns true for valid Event', () => {
    expect(validateEntity(eventFixtures[0])).toBe(true);
  });

  it('returns true for valid Message', () => {
    expect(validateEntity(messageFixtures[0])).toBe(true);
  });

  it('returns true for valid Person', () => {
    expect(validateEntity(personFixtures[0])).toBe(true);
  });

  it('returns true for valid Artifact', () => {
    expect(validateEntity(artifactFixtures[0])).toBe(true);
  });

  it('returns false for unknown canonicalType', () => {
    expect(validateEntity({ envelope: { id: 'x', canonicalType: 'Unknown' } })).toBe(false);
  });

  it('returns false for missing envelope', () => {
    expect(validateEntity({ id: 'x' })).toBe(false);
  });
});

describe('v1EntityTypes', () => {
  it('contains all expected entity types', () => {
    expect(v1EntityTypes).toContain('Task');
    expect(v1EntityTypes).toContain('Event');
    expect(v1EntityTypes).toContain('Message');
    expect(v1EntityTypes).toContain('Person');
    expect(v1EntityTypes).toContain('Artifact');
  });

  it('has exactly 5 entity types', () => {
    expect(v1EntityTypes.length).toBe(5);
  });
});
