import { describe, it, expect, beforeEach } from 'vitest';
import { PtySessionManager, createPtySessionManager } from './session-manager.js';

describe('PtySessionManager', () => {
  let manager: PtySessionManager;

  beforeEach(() => {
    manager = createPtySessionManager();
  });

  it('starts empty', () => {
    expect(manager.size).toBe(0);
  });

  it('creates sessions', () => {
    const session = manager.createSession({ pid: 123, fd: 0, exitCode: undefined });
    expect(session.id).toMatch(/^pty-session-/);
    expect(session.process.pid).toBe(123);
    expect(manager.size).toBe(1);
  });

  it('gets sessions by id', () => {
    const session = manager.createSession({ pid: 123, fd: 0, exitCode: undefined });
    const retrieved = manager.getSession(session.id);
    expect(retrieved?.process.pid).toBe(123);
  });

  it('returns undefined for non-existent session', () => {
    expect(manager.getSession('non-existent')).toBeUndefined();
  });

  it('lists all sessions', () => {
    manager.createSession({ pid: 1, fd: 0, exitCode: undefined });
    manager.createSession({ pid: 2, fd: 0, exitCode: undefined });
    expect(manager.listSessions()).toHaveLength(2);
  });

  it('closes sessions', () => {
    const session = manager.createSession({ pid: 123, fd: 0, exitCode: undefined });
    expect(manager.closeSession(session.id)).toBe(true);
    expect(manager.size).toBe(0);
  });

  it('returns false when closing non-existent session', () => {
    expect(manager.closeSession('non-existent')).toBe(false);
  });

  it('marks closed sessions as inactive', () => {
    const session = manager.createSession({ pid: 123, fd: 0, exitCode: undefined });
    manager.closeSession(session.id);
    const retrieved = manager.getSession(session.id);
    expect(retrieved?.isActive).toBe(false);
  });
});
