import { describe, it, expect, beforeEach } from 'vitest';
import { createArtifactRegistry, InMemoryArtifactRegistry } from './registry.js';

describe('InMemoryArtifactRegistry', () => {
  let registry: InMemoryArtifactRegistry;

  const fixtureArtifact = {
    envelope: { id: 'art-1', canonicalType: 'Artifact' as const },
    name: 'Test Artifact',
    content: '# Test Content',
    contentType: 'markdown' as const,
    sourceSkill: 'test-skill',
    createdAt: '2024-03-25T10:00:00Z',
    tags: ['test'],
  };

  beforeEach(() => {
    registry = new InMemoryArtifactRegistry();
  });

  it('starts empty', () => {
    expect(registry.size).toBe(0);
    expect(registry.list()).toEqual([]);
  });

  it('registers artifacts', () => {
    registry.register(fixtureArtifact);
    expect(registry.size).toBe(1);
  });

  it('retrieves artifacts by id', () => {
    registry.register(fixtureArtifact);
    const retrieved = registry.get('art-1');
    expect(retrieved?.name).toBe('Test Artifact');
  });

  it('returns undefined for non-existent artifact', () => {
    expect(registry.get('non-existent')).toBeUndefined();
  });

  it('lists all artifacts', () => {
    registry.register(fixtureArtifact);
    registry.register({ ...fixtureArtifact, envelope: { id: 'art-2', canonicalType: 'Artifact' }, name: 'Artifact 2' });
    expect(registry.list()).toHaveLength(2);
  });

  it('finds artifacts by skill', () => {
    registry.register(fixtureArtifact);
    registry.register({ ...fixtureArtifact, envelope: { id: 'art-2', canonicalType: 'Artifact' }, sourceSkill: 'other-skill' });
    const results = registry.findBySkill('test-skill');
    expect(results).toHaveLength(1);
    expect(results[0].sourceSkill).toBe('test-skill');
  });

  it('finds artifacts by tag', () => {
    registry.register(fixtureArtifact);
    const results = registry.findByTag('test');
    expect(results).toHaveLength(1);
  });

  it('removes artifacts', () => {
    registry.register(fixtureArtifact);
    expect(registry.remove('art-1')).toBe(true);
    expect(registry.size).toBe(0);
    expect(registry.remove('non-existent')).toBe(false);
  });

  it('clears all artifacts', () => {
    registry.register(fixtureArtifact);
    registry.register({ ...fixtureArtifact, envelope: { id: 'art-2', canonicalType: 'Artifact' } });
    registry.clear();
    expect(registry.size).toBe(0);
  });
});

describe('createArtifactRegistry', () => {
  it('creates an in-memory registry', () => {
    const registry = createArtifactRegistry();
    registry.register({
      envelope: { id: 'art-1', canonicalType: 'Artifact' },
      name: 'Test',
      content: 'Content',
      createdAt: '2024-03-25T10:00:00Z',
    });
    expect(registry.size).toBe(1);
  });
});
