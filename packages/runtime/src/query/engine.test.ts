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

describe('createQueryEngine', () => {
  it('creates a SimpleQueryEngine instance', () => {
    const engine = createQueryEngine();
    expect(engine).toBeInstanceOf(SimpleQueryEngine);
  });
});
