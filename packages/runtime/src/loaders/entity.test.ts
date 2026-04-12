import { describe, it, expect, beforeEach } from 'vitest';
import { Schema } from '@effect/schema';
import { EntityLoader, createEntityLoader } from './entity.js';
import { taskFixtures, eventFixtures, messageFixtures, personFixtures, artifactFixtures } from '@srgnt/contracts';

describe('EntityLoader', () => {
  let loader: EntityLoader;

  beforeEach(() => {
    loader = createEntityLoader();
  });

  describe('loadEntity', () => {
    it('loads a valid Task entity', () => {
      const task = taskFixtures[0];
      const result = loader.loadEntity(task);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(result.entity?.envelope.canonicalType).toBe('Task');
      expect(result.entity?.title).toBe('Review Q1 OKRs');
    });

    it('loads a valid Event entity', () => {
      const event = eventFixtures[0];
      const result = loader.loadEntity(event);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(result.entity?.envelope.canonicalType).toBe('Event');
      expect(result.entity?.title).toBe('Team Standup');
    });

    it('loads a valid Message entity', () => {
      const message = messageFixtures[0];
      const result = loader.loadEntity(message);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(result.entity?.envelope.canonicalType).toBe('Message');
      expect(result.entity?.subject).toBe('Q1 Planning');
    });

    it('loads a valid Person entity', () => {
      const person = personFixtures[0];
      const result = loader.loadEntity(person);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(result.entity?.envelope.canonicalType).toBe('Person');
      expect(result.entity?.name).toBe('Alex Engineer');
    });

    it('loads a valid Artifact entity', () => {
      const artifact = artifactFixtures[0];
      const result = loader.loadEntity(artifact);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(result.entity?.envelope.canonicalType).toBe('Artifact');
      expect(result.entity?.name).toBe('Daily Briefing - March 25');
    });

    it('returns failure for non-object input', () => {
      const result = loader.loadEntity(null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be an object');
      expect(result.entity).toBeUndefined();
    });

    it('returns failure for primitive value', () => {
      const result = loader.loadEntity('string');
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be an object');
    });

    it('returns failure for number', () => {
      const result = loader.loadEntity(42);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be an object');
    });

    it('returns failure for array input', () => {
      const result = loader.loadEntity([]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must have an envelope');
    });

    it('returns failure for entity without envelope', () => {
      const result = loader.loadEntity({ title: 'Some task' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('must have an envelope');
    });

    it('returns failure for entity with null envelope', () => {
      const result = loader.loadEntity({ envelope: null });
      expect(result.success).toBe(false);
      expect(result.error).toContain('must have an envelope');
    });

    it('returns failure for entity with non-object envelope', () => {
      const result = loader.loadEntity({ envelope: 'not an object' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('must have an envelope');
    });

    it('returns failure for entity without canonicalType in envelope', () => {
      const result = loader.loadEntity({ envelope: { id: 'test' } });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown entity type: undefined');
    });

    it('returns failure for entity with unknown canonicalType', () => {
      const result = loader.loadEntity({ envelope: { canonicalType: 'UnknownType' } });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown entity type: UnknownType');
    });

    it('returns failure for entity with null canonicalType', () => {
      const result = loader.loadEntity({ envelope: { canonicalType: null } });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown entity type');
    });

    it('returns failure for invalid Task entity (missing required fields)', () => {
      const result = loader.loadEntity({
        envelope: { id: 'test-1', canonicalType: 'Task' },
        description: 'Task without title'
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.entity).toBeUndefined();
    });

    it('returns failure for invalid Event entity (invalid datetime)', () => {
      const result = loader.loadEntity({
        envelope: { id: 'test-1', canonicalType: 'Event' },
        title: 'Test Event',
        startTime: 'not-a-date'
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.entity).toBeUndefined();
    });

    it('returns failure for invalid Message entity (missing body)', () => {
      const result = loader.loadEntity({
        envelope: { id: 'test-1', canonicalType: 'Message' },
        sender: 'test@example.com'
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.entity).toBeUndefined();
    });

    it('returns failure for invalid Person entity (missing name)', () => {
      const result = loader.loadEntity({
        envelope: { id: 'test-1', canonicalType: 'Person' },
        email: 'test@example.com'
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.entity).toBeUndefined();
    });

    it('returns failure for invalid Artifact entity (missing name)', () => {
      const result = loader.loadEntity({
        envelope: { id: 'test-1', canonicalType: 'Artifact' },
        content: 'Content',
        createdAt: '2024-03-25T10:00:00Z'
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.entity).toBeUndefined();
    });

    it('returns failure for invalid Artifact entity (invalid datetime)', () => {
      const result = loader.loadEntity({
        envelope: { id: 'test-1', canonicalType: 'Artifact' },
        name: 'Test',
        content: 'Content',
        createdAt: 'invalid-date'
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.entity).toBeUndefined();
    });

    it('returns failure for Task with invalid status enum', () => {
      const result = loader.loadEntity({
        envelope: { id: 'test-1', canonicalType: 'Task' },
        title: 'Test',
        status: 'invalid_status' as any
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure for Task with invalid priority enum', () => {
      const result = loader.loadEntity({
        envelope: { id: 'test-1', canonicalType: 'Task' },
        title: 'Test',
        priority: 'urgent' as any
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure for Task with invalid datetime format', () => {
      const result = loader.loadEntity({
        envelope: { id: 'test-1', canonicalType: 'Task' },
        title: 'Test',
        dueDate: '2024/03/25'
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('registerParser', () => {
    it('allows registering custom parser', () => {
      const customSchema = Schema.Struct({
        envelope: Schema.Struct({
          id: Schema.String,
          canonicalType: Schema.String,
        }),
        custom: Schema.String,
      });

      loader.registerParser('CustomType', customSchema as any);

      const result = loader.loadEntity({
        envelope: { id: 'test-1', canonicalType: 'CustomType' },
        custom: 'entity'
      });

      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
    });

    it('overwrites existing parser for same type', () => {
      const customSchema = Schema.Struct({
        envelope: Schema.Struct({
          id: Schema.String,
          canonicalType: Schema.String,
        }),
        custom: Schema.String,
      });

      loader.registerParser('Task', customSchema as any);

      const result = loader.loadEntity({
        envelope: { id: 'test-1', canonicalType: 'Task' },
        custom: 'task'
      });

      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles entity with extra fields (ignores extras)', () => {
      const taskWithExtras = {
        ...taskFixtures[0],
        extraField: 'should be ignored',
        anotherExtra: { nested: true }
      };

      const result = loader.loadEntity(taskWithExtras);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
    });

    it('handles entity with minimal valid Task', () => {
      const minimalTask = {
        envelope: { id: 'minimal-1', canonicalType: 'Task' },
        title: 'Minimal Task'
      };

      const result = loader.loadEntity(minimalTask);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(result.entity?.title).toBe('Minimal Task');
    });

    it('handles entity with minimal valid Event', () => {
      const minimalEvent = {
        envelope: { id: 'minimal-1', canonicalType: 'Event' },
        title: 'Minimal Event',
        startTime: '2024-03-25T10:00:00Z'
      };

      const result = loader.loadEntity(minimalEvent);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
    });

    it('handles entity with minimal valid Message', () => {
      const minimalMessage = {
        envelope: { id: 'minimal-1', canonicalType: 'Message' },
        body: 'Minimal Message',
        sender: 'test@example.com',
        sentAt: '2024-03-25T10:00:00Z'
      };

      const result = loader.loadEntity(minimalMessage);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
    });

    it('handles entity with minimal valid Person', () => {
      const minimalPerson = {
        envelope: { id: 'minimal-1', canonicalType: 'Person' },
        name: 'Minimal Person'
      };

      const result = loader.loadEntity(minimalPerson);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
    });

    it('handles entity with minimal valid Artifact', () => {
      const minimalArtifact = {
        envelope: { id: 'minimal-1', canonicalType: 'Artifact' },
        name: 'Minimal Artifact',
        content: 'Content',
        createdAt: '2024-03-25T10:00:00Z'
      };

      const result = loader.loadEntity(minimalArtifact);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
    });

    it('handles empty string in string fields', () => {
      const taskWithEmptyStrings = {
        envelope: { id: 'test-1', canonicalType: 'Task' },
        title: '',
        description: ''
      };

      const result = loader.loadEntity(taskWithEmptyStrings);
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(result.entity?.title).toBe('');
    });

    it('handles special characters in string fields', () => {
      const taskWithSpecialChars = {
        envelope: { id: 'test-1', canonicalType: 'Task' },
        title: 'Task with émojis 🎉 and spëcial çhars',
        description: 'Multi\nLine\nWith\tTabs'
      };

      const result = loader.loadEntity(taskWithSpecialChars);
      expect(result.success).toBe(true);
      expect(result.entity?.title).toBe('Task with émojis 🎉 and spëcial çhars');
    });

    it('handles large arrays in fields', () => {
      const largeLabels = Array.from({ length: 1000 }, (_, i) => `label-${i}`);
      const taskWithLargeArray = {
        envelope: { id: 'test-1', canonicalType: 'Task' },
        title: 'Task with large array',
        labels: largeLabels
      };

      const result = loader.loadEntity(taskWithLargeArray);
      expect(result.success).toBe(true);
      expect(result.entity?.labels).toHaveLength(1000);
    });
  });

  describe('createEntityLoader', () => {
    it('creates a new EntityLoader instance', () => {
      const loader1 = createEntityLoader();
      const loader2 = createEntityLoader();

      expect(loader1).toBeInstanceOf(EntityLoader);
      expect(loader2).toBeInstanceOf(EntityLoader);
      expect(loader1).not.toBe(loader2); // Different instances
    });

    it('new loader has all default parsers registered', () => {
      const newLoader = createEntityLoader();
      const task = {
        envelope: { id: 'test-1', canonicalType: 'Task' },
        title: 'Test'
      };

      const result = newLoader.loadEntity(task);
      expect(result.success).toBe(true);
    });
  });
});
