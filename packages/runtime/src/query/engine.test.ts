import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleQueryEngine, createQueryEngine } from './engine.js';
import type { EntityEnvelope } from '@srgnt/contracts';

describe('SimpleQueryEngine', () => {
  let engine: SimpleQueryEngine;

  beforeEach(() => {
    engine = new SimpleQueryEngine();
  });

  it('creates engine', () => {
    expect(engine).toBeDefined();
  });

  it('indexes fields', async () => {
    await engine.index();
    const fields = engine.getIndexedFields();
    expect(fields).toContain('id');
    expect(fields).toContain('canonicalType');
    expect(fields).toContain('name');
  });

  it('executes DQL FROM query', async () => {
    const entity = {
      envelope: { id: 'task-1', canonicalType: 'Task' },
      provider: 'jira',
    };
    engine.addToIndex(entity.envelope);

    const result = await engine.query('FROM "Task"');
    expect(result.data).toHaveLength(1);
    expect((result.data[0] as EntityEnvelope).id).toBe('task-1');
  });

  it('executes structured query', async () => {
    const entity = {
      envelope: { id: 'task-1', canonicalType: 'Task' },
    };
    engine.addToIndex(entity.envelope);

    const result = await engine.query({ from: 'Task' });
    expect(result.data).toHaveLength(1);
  });

  it('respects limit in structured query', async () => {
    for (let i = 0; i < 5; i++) {
      engine.addToIndex({ id: `task-${i}`, canonicalType: 'Task' });
    }

    const result = await engine.query({ from: 'Task', limit: 3 });
    expect(result.data).toHaveLength(3);
  });

  it('sorts results', async () => {
    engine.addToIndex({ id: 'a', canonicalType: 'Task', createdAt: '2024-01-01T00:00:00Z' });
    engine.addToIndex({ id: 'b', canonicalType: 'Task', createdAt: '2024-01-02T00:00:00Z' });

    const result = await engine.query({
      from: 'Task',
      sort: [{ field: 'createdAt', direction: 'desc' }],
    });
    expect((result.data[0] as EntityEnvelope).id).toBe('b');
  });

  it('adds and removes from index', async () => {
    const entity: EntityEnvelope = { id: 'task-1', canonicalType: 'Task' };
    engine.addToIndex(entity);
    expect(engine.size).toBe(1);

    engine.removeFromIndex('task-1');
    expect(engine.size).toBe(0);
  });

  it('re-indexes on force', async () => {
    await engine.index();
    await engine.index(true);
    expect(engine.getIndexedFields().length).toBeGreaterThan(0);
  });
});

describe('SimpleQueryEngine total and pagination', () => {
  let engine: SimpleQueryEngine;

  beforeEach(() => {
    engine = new SimpleQueryEngine();
    for (let i = 0; i < 10; i++) {
      engine.addToIndex({ id: `task-${i}`, canonicalType: 'Task' });
    }
  });

  it('reports total before limit is applied', async () => {
    const result = await engine.query({ from: 'Task', limit: 3 });
    expect(result.data).toHaveLength(3);
    expect(result.total).toBe(10);
  });

  it('supports offset in structured query', async () => {
    const result = await engine.query({ from: 'Task', offset: 7 });
    expect(result.data).toHaveLength(3);
    expect(result.total).toBe(10);
  });

  it('supports limit and offset together', async () => {
    const result = await engine.query({ from: 'Task', limit: 2, offset: 5 });
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(10);
  });
});

describe('SimpleQueryEngine type index', () => {
  let engine: SimpleQueryEngine;

  beforeEach(() => {
    engine = new SimpleQueryEngine();
  });

  it('uses type index for DQL FROM queries', async () => {
    engine.addToIndex({ id: 'task-1', canonicalType: 'Task' });
    engine.addToIndex({ id: 'event-1', canonicalType: 'Event' });

    const result = await engine.query('FROM Task');
    expect(result.data).toHaveLength(1);
    expect((result.data[0] as EntityEnvelope).id).toBe('task-1');
  });

  it('cleans up type index on removeFromIndex', async () => {
    engine.addToIndex({ id: 'task-1', canonicalType: 'Task' });
    engine.addToIndex({ id: 'task-2', canonicalType: 'Task' });
    engine.removeFromIndex('task-1');

    const result = await engine.query({ from: 'Task' });
    expect(result.data).toHaveLength(1);
    expect((result.data[0] as EntityEnvelope).id).toBe('task-2');
  });

  it('returns empty for non-existent type', async () => {
    engine.addToIndex({ id: 'task-1', canonicalType: 'Task' });

    const result = await engine.query({ from: 'NonExistent' });
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('handles large entity sets efficiently', async () => {
    for (let i = 0; i < 1000; i++) {
      engine.addToIndex({ id: `task-${i}`, canonicalType: 'Task' });
    }
    for (let i = 0; i < 1000; i++) {
      engine.addToIndex({ id: `event-${i}`, canonicalType: 'Event' });
    }

    const start = Date.now();
    const result = await engine.query({ from: 'Task', limit: 10 });
    const elapsed = Date.now() - start;

    expect(result.data).toHaveLength(10);
    expect(result.total).toBe(1000);
    expect(elapsed).toBeLessThan(100); // should be well under 100ms
  });
});

describe('createQueryEngine', () => {
  it('creates a SimpleQueryEngine instance', () => {
    const engine = createQueryEngine();
    expect(engine).toBeInstanceOf(SimpleQueryEngine);
  });
});
