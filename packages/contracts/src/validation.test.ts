import { describe, it, expect } from 'vitest';
import { parseSync } from './shared-schemas.js';
import {
  SEntityEnvelope,
  taskFixtures,
  eventFixtures,
  messageFixtures,
  personFixtures,
  artifactFixtures,
  validateEntity,
  v1EntityTypes,
} from './entities/index.js';
import {
  SSkillManifest,
  SSkillCapability,
} from './skills/index.js';

describe('Contract Validation Suite', () => {
  describe('Entity Contracts', () => {
    it('validates all entity types from fixtures', () => {
      expect(validateEntity(taskFixtures[0])).toBe(true);
      expect(validateEntity(eventFixtures[0])).toBe(true);
      expect(validateEntity(messageFixtures[0])).toBe(true);
      expect(validateEntity(personFixtures[0])).toBe(true);
      expect(validateEntity(artifactFixtures[0])).toBe(true);
    });

    it('rejects invalid entity types', () => {
      expect(validateEntity({ envelope: { id: 'x', canonicalType: 'InvalidType' } })).toBe(false);
    });

    it('has exactly 5 v1 entity types', () => {
      expect(v1EntityTypes.length).toBe(5);
    });

    it('entity envelope is used by all entities', () => {
      const entities = [taskFixtures[0], eventFixtures[0], messageFixtures[0], personFixtures[0], artifactFixtures[0]];
      for (const entity of entities) {
        expect(() => parseSync(SEntityEnvelope, (entity as { envelope?: unknown }).envelope)).not.toThrow();
      }
    });
  });

  describe('Skill Manifest Contract', () => {
    it('validates a complete skill manifest', () => {
      const manifest = {
        name: 'daily-briefing',
        version: '1.0.0',
        description: 'Generate daily briefing',
        purpose: 'Prepare daily summary',
        inputs: [{ name: 'date', type: 'date', required: false }],
        outputs: [{ name: 'briefing', contentType: 'markdown' }],
        requiredCapabilities: ['read:tasks', 'read:calendar'],
        approvalRequirements: [{ capability: 'read:tasks', reason: 'Need tasks' }],
      };
      expect(() => parseSync(SSkillManifest, manifest)).not.toThrow();
    });

    it('validates skill capabilities', () => {
      expect(() => parseSync(SSkillCapability, 'read:tasks')).not.toThrow();
      expect(() => parseSync(SSkillCapability, 'write:artifacts')).not.toThrow();
    });

    it('rejects invalid skill capabilities', () => {
      expect(() => parseSync(SSkillCapability, 'invalid')).toThrow();
    });
  });
});
