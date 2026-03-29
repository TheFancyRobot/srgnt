import { describe, it, expect, beforeEach } from 'vitest';
import { SyncEngine, createSyncEngine } from './engine.js';

describe('SyncEngine', () => {
  let engine: SyncEngine;

  beforeEach(() => {
    engine = createSyncEngine();
  });

  it('starts with null account', () => {
    expect(engine.getAccount()).toBeNull();
  });

  it('sets and gets account', () => {
    const account = {
      id: 'acc-1',
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: '2024-03-25T10:00:00Z',
    };
    engine.setAccount(account);
    expect(engine.getAccount()?.email).toBe('test@example.com');
  });

  it('adds and lists devices', () => {
    const device = {
      id: 'dev-1',
      name: 'My Desktop',
      type: 'desktop' as const,
      encryptionPublicKey: 'key-abc',
      lastSeenAt: '2024-03-25T10:00:00Z',
      isCurrent: true,
    };
    engine.addDevice(device);
    expect(engine.getDevices()).toHaveLength(1);
    expect(engine.getDevices()[0].name).toBe('My Desktop');
  });

  it('removes devices', () => {
    const device = {
      id: 'dev-1',
      name: 'My Desktop',
      type: 'desktop' as const,
      encryptionPublicKey: 'key-abc',
      lastSeenAt: '2024-03-25T10:00:00Z',
    };
    engine.addDevice(device);
    engine.removeDevice('dev-1');
    expect(engine.getDevices()).toHaveLength(0);
  });

  it('adds and resolves conflicts', () => {
    const conflict = {
      entityId: 'entity-1',
      localVersion: 'v1',
      remoteVersion: 'v2',
      conflictedAt: '2024-03-25T10:00:00Z',
    };
    engine.addConflict(conflict);
    expect(engine.getPendingConflicts()).toHaveLength(1);

    const resolved = engine.resolveConflict('entity-1', 'remote');
    expect(resolved).toBe(true);
    expect(engine.getPendingConflicts()).toHaveLength(0);
    expect(engine.getResolvedConflicts()).toHaveLength(1);
  });

  it('returns false when resolving unknown conflict', () => {
    expect(engine.resolveConflict('unknown', 'local')).toBe(false);
  });

  it('updates last sync timestamp', () => {
    expect(engine.getLastSync()).toBeNull();
    engine.updateLastSync();
    expect(engine.getLastSync()).toBeInstanceOf(Date);
  });
});
