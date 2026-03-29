import type { PtyProcess } from './contracts.js';

export interface PtySessionContext {
  command?: string;
  args?: string[];
  cwd?: string;
  rows?: number;
  cols?: number;
}

export interface PtySession {
  id: string;
  process: PtyProcess;
  startedAt: Date;
  context: PtySessionContext;
  isActive: boolean;
  ptyProcess: {
    write(data: string): void;
    resize(opts: { rows: number; cols: number }): void;
    kill(): void;
  };
}

export class PtySessionManager {
  private sessions: Map<string, PtySession> = new Map();

  createSession(
    process: PtyProcess,
    context: PtySessionContext = {}
  ): PtySession {
    const id = `pty-session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const session: PtySession = {
      id,
      process,
      startedAt: new Date(),
      context,
      isActive: true,
      ptyProcess: { write: () => {}, resize: () => {}, kill: () => {} },
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): PtySession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): PtySession[] {
    return Array.from(this.sessions.values());
  }

  closeSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.isActive = false;
    return true;
  }

  get size(): number {
    return Array.from(this.sessions.values()).filter((s) => s.isActive).length;
  }
}

export function createPtySessionManager(): PtySessionManager {
  return new PtySessionManager();
}