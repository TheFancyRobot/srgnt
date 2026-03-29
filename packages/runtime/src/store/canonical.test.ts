import { describe, it, expect, beforeEach } from 'vitest';
import { CanonicalStore } from './canonical.js';
import { SEntityEnvelope } from '@srgnt/contracts';

describe('CanonicalStore', () => {
  let store: CanonicalStore;

  beforeEach(() => {
    store = new CanonicalStore(SEntityEnvelope);
  });

  it('starts empty', () => {
    expect(store.size).toBe(0);
    expect(store.listEntities()).toEqual([]);
  });

  it('adds and retrieves entities', () => {
    const envelope = {
      id: 'entity-1',
      canonicalType: 'Task',
      provider: 'jira',
    };

    store.addEntity(envelope);
    expect(store.size).toBe(1);

    const retrieved = store.getEntity('entity-1');
    expect(retrieved?.id).toBe('entity-1');
    expect(retrieved?.canonicalType).toBe('Task');
  });

  it('returns undefined for non-existent entity', () => {
    expect(store.getEntity('non-existent')).toBeUndefined();
  });

  it('removes entities', () => {
    const envelope = { id: 'entity-1', canonicalType: 'Task' };
    store.addEntity(envelope);
    expect(store.removeEntity('entity-1')).toBe(true);
    expect(store.size).toBe(0);

    expect(store.removeEntity('non-existent')).toBe(false);
  });

  it('finds entities by type', () => {
    store.addEntity({ id: 'task-1', canonicalType: 'Task' });
    store.addEntity({ id: 'task-2', canonicalType: 'Task' });
    store.addEntity({ id: 'event-1', canonicalType: 'Event' });

    const tasks = store.findEntitiesByType('Task');
    expect(tasks).toHaveLength(2);
    expect(tasks.map((e) => e.id)).toEqual(['task-1', 'task-2']);
  });

  it('clears all entities', () => {
    store.addEntity({ id: 'entity-1', canonicalType: 'Task' });
    store.addEntity({ id: 'entity-2', canonicalType: 'Event' });
    store.clear();
    expect(store.size).toBe(0);
  });

  it('validates entities on add', () => {
    const invalidEnvelope = { id: 123, canonicalType: 'Task' };
    expect(() => store.addEntity(invalidEnvelope)).toThrow();
  });
});
