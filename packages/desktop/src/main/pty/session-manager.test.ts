import { describe, it, expect, beforeEach } from 'vitest';
import { PtySessionManager, createPtySessionManager } from './session-manager.js';
import type { PtyProcess } from './contracts.js';

function makeProcess(overrides?: Partial<PtyProcess>): PtyProcess {
  return { pid: 123, fd: 1, ...overrides };
}

describe('PtySessionManager', () => {
  let manager: PtySessionManager;

  beforeEach(() => {
    manager = new PtySessionManager();
  });

  describe('createSession', () => {
    it('creates session with unique id matching format pty-session-<timestamp>-<random>', () => {
      const session = manager.createSession(makeProcess());
      expect(session.id).toMatch(/^pty-session-\d+-[a-z0-9]+$/);
    });

    it('stores session in map retrievable via getSession', () => {
      const session = manager.createSession(makeProcess());
      expect(manager.getSession(session.id)).toBe(session);
    });

    it('sets isActive to true', () => {
      const session = manager.createSession(makeProcess());
      expect(session.isActive).toBe(true);
    });

    it('uses provided context', () => {
      const context = { command: 'bash', args: ['-l'], cwd: '/home' };
      const session = manager.createSession(makeProcess(), context);
      expect(session.context).toEqual(context);
    });

    it('sets default context when none provided', () => {
      const session = manager.createSession(makeProcess());
      expect(session.context).toEqual({});
    });

    it('sets startedAt to current time', () => {
      const before = new Date();
      const session = manager.createSession(makeProcess());
      const after = new Date();
      expect(session.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(session.startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getSession', () => {
    it('returns session by id', () => {
      const session = manager.createSession(makeProcess());
      expect(manager.getSession(session.id)).toBe(session);
    });

    it('returns undefined for unknown id', () => {
      expect(manager.getSession('nonexistent')).toBeUndefined();
    });
  });

  describe('listSessions', () => {
    it('returns all sessions', () => {
      const s1 = manager.createSession(makeProcess({ pid: 1 }));
      const s2 = manager.createSession(makeProcess({ pid: 2 }));
      expect(manager.listSessions()).toEqual([s1, s2]);
    });

    it('returns empty array when no sessions', () => {
      expect(manager.listSessions()).toEqual([]);
    });
  });

  describe('closeSession', () => {
    it('sets isActive to false', () => {
      const session = manager.createSession(makeProcess());
      manager.closeSession(session.id);
      expect(session.isActive).toBe(false);
    });

    it('returns true for existing session', () => {
      const session = manager.createSession(makeProcess());
      expect(manager.closeSession(session.id)).toBe(true);
    });

    it('returns false for unknown id', () => {
      expect(manager.closeSession('nonexistent')).toBe(false);
    });
  });

  describe('size getter', () => {
    it('counts only active sessions', () => {
      manager.createSession(makeProcess({ pid: 1 }));
      const s2 = manager.createSession(makeProcess({ pid: 2 }));
      manager.closeSession(s2.id);
      expect(manager.size).toBe(1);
    });

    it('decreases when session is closed', () => {
      const s1 = manager.createSession(makeProcess({ pid: 1 }));
      manager.createSession(makeProcess({ pid: 2 }));
      expect(manager.size).toBe(2);
      manager.closeSession(s1.id);
      expect(manager.size).toBe(1);
    });
  });

  describe('createPtySessionManager', () => {
    it('returns a new PtySessionManager instance', () => {
      const created = createPtySessionManager();
      expect(created).toBeInstanceOf(PtySessionManager);
      expect(created).not.toBe(manager);
    });
  });
});
