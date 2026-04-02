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

describe('CanonicalStore pagination', () => {
  let store: CanonicalStore;

  beforeEach(() => {
    store = new CanonicalStore();
    for (let i = 0; i < 10; i++) {
      store.addEntity({ id: `task-${i}`, canonicalType: 'Task' });
    }
    store.addEntity({ id: 'event-0', canonicalType: 'Event' });
  });

  it('paginates listEntities with limit', () => {
    const page = store.listEntities({ limit: 3 });
    expect(page).toHaveLength(3);
  });

  it('paginates listEntities with offset', () => {
    const page = store.listEntities({ offset: 8 });
    expect(page).toHaveLength(3); // 10 tasks + 1 event - 8 offset = 3
  });

  it('paginates listEntities with limit and offset', () => {
    const page = store.listEntities({ limit: 2, offset: 5 });
    expect(page).toHaveLength(2);
    expect(page[0].id).toBe('task-5');
    expect(page[1].id).toBe('task-6');
  });

  it('paginates findEntitiesByType with limit', () => {
    const page = store.findEntitiesByType('Task', { limit: 3 });
    expect(page).toHaveLength(3);
  });

  it('paginates findEntitiesByType with limit and offset', () => {
    const page = store.findEntitiesByType('Task', { limit: 2, offset: 7 });
    expect(page).toHaveLength(2);
    expect(page[0].id).toBe('task-7');
    expect(page[1].id).toBe('task-8');
  });

  it('does not materialize all matching entities for paginated type lookups', () => {
    for (let i = 10; i < 2000; i++) {
      store.addEntity({ id: `task-${i}`, canonicalType: 'Task' });
    }

    const page = store.findEntitiesByType('Task', { limit: 5, offset: 1500 });
    expect(page).toHaveLength(5);
    expect(page[0].id).toBe('task-1500');
    expect(page[4].id).toBe('task-1504');
  });

  it('returns empty for offset beyond range', () => {
    const page = store.findEntitiesByType('Task', { offset: 100 });
    expect(page).toHaveLength(0);
  });

  it('reports totalByType without materializing', () => {
    expect(store.totalByType('Task')).toBe(10);
    expect(store.totalByType('Event')).toBe(1);
    expect(store.totalByType('NonExistent')).toBe(0);
  });
});

describe('CanonicalStore type index', () => {
  let store: CanonicalStore;

  beforeEach(() => {
    store = new CanonicalStore();
  });

  it('updates type index when entity type changes on re-add', () => {
    store.addEntity({ id: 'item-1', canonicalType: 'Task' });
    expect(store.totalByType('Task')).toBe(1);

    store.addEntity({ id: 'item-1', canonicalType: 'Event' });
    expect(store.totalByType('Task')).toBe(0);
    expect(store.totalByType('Event')).toBe(1);
  });

  it('cleans up type index on remove', () => {
    store.addEntity({ id: 'task-1', canonicalType: 'Task' });
    store.addEntity({ id: 'task-2', canonicalType: 'Task' });
    expect(store.totalByType('Task')).toBe(2);

    store.removeEntity('task-1');
    expect(store.totalByType('Task')).toBe(1);

    store.removeEntity('task-2');
    expect(store.totalByType('Task')).toBe(0);
  });

  it('cleans up type index on clear', () => {
    store.addEntity({ id: 'task-1', canonicalType: 'Task' });
    store.addEntity({ id: 'event-1', canonicalType: 'Event' });
    store.clear();
    expect(store.totalByType('Task')).toBe(0);
    expect(store.totalByType('Event')).toBe(0);
  });
});

describe('CanonicalStore LRU eviction', () => {
  it('evicts oldest entity when capacity exceeded', () => {
    const store = new CanonicalStore(undefined, { maxCapacity: 3 });
    store.addEntity({ id: 'a', canonicalType: 'Task' });
    store.addEntity({ id: 'b', canonicalType: 'Task' });
    store.addEntity({ id: 'c', canonicalType: 'Task' });
    expect(store.size).toBe(3);

    store.addEntity({ id: 'd', canonicalType: 'Task' });
    expect(store.size).toBe(3);
    expect(store.getEntity('a')).toBeUndefined(); // evicted
    expect(store.getEntity('d')).toBeDefined();
  });

  it('touching an entity via get prevents its eviction', () => {
    const store = new CanonicalStore(undefined, { maxCapacity: 3 });
    store.addEntity({ id: 'a', canonicalType: 'Task' });
    store.addEntity({ id: 'b', canonicalType: 'Task' });
    store.addEntity({ id: 'c', canonicalType: 'Task' });

    // Access 'a' to make it most recently used
    store.getEntity('a');

    store.addEntity({ id: 'd', canonicalType: 'Task' });
    expect(store.getEntity('a')).toBeDefined(); // kept (recently accessed)
    expect(store.getEntity('b')).toBeUndefined(); // evicted (oldest after 'a' was touched)
  });

  it('maintains type index consistency after eviction', () => {
    const store = new CanonicalStore(undefined, { maxCapacity: 2 });
    store.addEntity({ id: 'task-1', canonicalType: 'Task' });
    store.addEntity({ id: 'event-1', canonicalType: 'Event' });
    store.addEntity({ id: 'task-2', canonicalType: 'Task' });

    // task-1 was evicted
    expect(store.totalByType('Task')).toBe(1);
    expect(store.findEntitiesByType('Task').map(e => e.id)).toEqual(['task-2']);
  });

  it('works without maxCapacity (unbounded)', () => {
    const store = new CanonicalStore();
    for (let i = 0; i < 100; i++) {
      store.addEntity({ id: `item-${i}`, canonicalType: 'Task' });
    }
    expect(store.size).toBe(100);
  });
});
