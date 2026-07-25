import { readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import type { FileSystemPort, TerminalPort } from '@srgnt/harness';

/**
 * Client services v1 (PHASE-23, STEP-23-02) — the `fs` and `terminal` ports the
 * *agent* calls back into. Both are main-process only: they touch the real
 * filesystem and spawn real processes, so neither may ever be reachable from the
 * renderer.
 *
 * Two rules shape everything here:
 *
 * 1. **Canonical containment.** Every path the agent names is resolved to its
 *    real location (`fs.realpath`) before it is used, and must live under the
 *    real path of the session cwd. A lexical `resolve()` + `startsWith()` check
 *    is necessary but NOT sufficient: a symlink inside the session root pointing
 *    at `/etc` passes the lexical test and still escapes. See
 *    {@link createPathGuard}.
 *
 * 2. **No silent writes.** `writeTextFile` is *absent* unless the host injects a
 *    write authorizer, and the harness advertises the `fs.writeTextFile`
 *    capability from that method's presence — so before STEP-23-03's permission
 *    engine exists, the agent is told the client cannot write and never asks.
 *
 * Pi never calls any of this (spike probe 4: it executes tools in-process). That
 * is expected: these services exist for spec-compliant agents and for the mock
 * agent's `use_terminal` / `read_file` directives, and tool-call *rendering*
 * must never depend on them.
 */

// ─── Errors ───

export type ClientServiceErrorCode =
  /** Target resolved outside the session cwd (traversal, absolute, or symlink escape). */
  | 'path_outside_session'
  /** Read failed for an ordinary filesystem reason (missing file, permissions). */
  | 'read_failed'
  /** The injected authorizer (STEP-23-03's permission engine) refused the write. */
  | 'write_not_authorized'
  /** A terminal id the client does not know (already released, or never created). */
  | 'unknown_terminal';

/** Typed failure surfaced to the agent as a JSON-RPC error. Never a bare string. */
export class ClientServiceError extends Error {
  readonly code: ClientServiceErrorCode;

  constructor(code: ClientServiceErrorCode, message: string) {
    super(message);
    this.name = 'ClientServiceError';
    this.code = code;
  }
}

// ─── Audit stream ───

/**
 * One in-memory audit record. The kind namespace matches
 * `knownSessionEventKinds`' `client/*` convention; that list is deliberately an
 * open string set (tolerant reader, ARCH-0009), and STEP-23-03 formalizes the
 * persisted audit surface.
 */
export interface ClientServiceAuditEvent {
  readonly kind: 'client/fs_read_text_file' | 'client/fs_write_text_file' | 'client/fs_denied';
  readonly ts: string;
  readonly payload: Record<string, unknown>;
}

// ─── Path guard ───

/** Resolves `root` and every subsequent target through `realpath`. */
export interface PathGuard {
  /**
   * Returns the canonical path to operate on, or throws
   * `ClientServiceError('path_outside_session')`. Relative inputs resolve
   * against the session root; absolute inputs are taken as-is and then checked.
   */
  resolve(candidate: string): Promise<string>;
}

/**
 * Canonicalizes `target` by walking up to the nearest ancestor that exists,
 * `realpath`-ing that, and re-appending the segments that do not exist yet. This
 * is what makes the guard correct for writes to files that do not exist: the
 * *parent* is the thing a symlink can lie about, so the parent is what must be
 * canonicalized.
 */
async function canonicalize(target: string): Promise<string> {
  const missing: string[] = [];
  let current = target;
  for (;;) {
    try {
      const real = await realpath(current);
      return missing.length === 0 ? real : join(real, ...missing.reverse());
    } catch {
      const parent = dirname(current);
      // Filesystem root itself did not resolve — nothing left to walk up to.
      if (parent === current) return target;
      missing.push(basename(current));
      current = parent;
    }
  }
}

/**
 * True when `target` is `root` or lives beneath it. The separator is required so
 * `/tmp/proj` does not contain `/tmp/proj-evil` — the classic prefix collision a
 * bare `startsWith` gets wrong.
 */
function contains(root: string, target: string): boolean {
  if (target === root) return true;
  return target.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);
}

export function createPathGuard(sessionRoot: string): PathGuard {
  return {
    async resolve(candidate: string): Promise<string> {
      const lexical = isAbsolute(candidate) ? resolve(candidate) : resolve(sessionRoot, candidate);
      const realRoot = await canonicalize(sessionRoot);
      const realTarget = await canonicalize(lexical);
      if (!contains(realRoot, realTarget)) {
        throw new ClientServiceError(
          'path_outside_session',
          `Refused: '${candidate}' resolves outside the session directory`,
        );
      }
      // Operate on the canonical path, not the caller's: the lexical path would
      // re-traverse the same symlinks on every syscall.
      return realTarget;
    },
  };
}

// ─── Terminal backend ───

/** Exit information for a finished terminal process. */
export interface TerminalExit {
  readonly exitCode: number | null;
  readonly signal: string | null;
}

/** The minimum a pty-like backend must offer. Injected so tests need no native module. */
export interface TerminalProcess {
  onData(listener: (chunk: string) => void): void;
  onExit(listener: (exit: TerminalExit) => void): void;
  kill(): void;
}

export interface TerminalSpawnOptions {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
}

export type TerminalSpawn = (options: TerminalSpawnOptions) => TerminalProcess;

/**
 * node-pty backend. Loaded lazily on first spawn: it is a native addon, and
 * every unit test injects a fake, so an app (or a test run) that never creates a
 * client terminal never loads it.
 */
const ptySpawn: TerminalSpawn = (options) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodePty = require('node-pty') as typeof import('node-pty');
  const child = nodePty.spawn(options.command, [...options.args], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: options.cwd,
    env: { ...options.env },
  });
  return {
    onData: (listener) => {
      child.onData(listener);
    },
    onExit: (listener) => {
      child.onExit(({ exitCode, signal }) =>
        listener({ exitCode: exitCode ?? null, signal: signal === undefined ? null : String(signal) }),
      );
    },
    kill: () => child.kill(),
  };
};

/**
 * Plain-pipe backend. No tty, so no colors, no window size, and no interactive
 * prompts — but the command still runs and its output is still captured.
 */
const pipeSpawn: TerminalSpawn = (options) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { spawn } = require('node:child_process') as typeof import('node:child_process');
  const child = spawn(options.command, [...options.args], { cwd: options.cwd, env: { ...options.env } });
  return {
    onData: (listener) => {
      const forward = (buffer: Buffer): void => listener(buffer.toString('utf8'));
      child.stdout?.on('data', forward);
      // stderr is interleaved into the same buffer, exactly as a tty would.
      child.stderr?.on('data', forward);
    },
    onExit: (listener) => {
      child.on('close', (exitCode, signal) => listener({ exitCode, signal: signal ?? null }));
      child.on('error', () => listener({ exitCode: null, signal: null }));
    },
    kill: () => void child.kill(),
  };
};

/**
 * Production backend: a real pty when node-pty can provide one, plain pipes
 * otherwise.
 *
 * The fallback is not defensive padding — node-pty is a prebuilt native addon
 * and its `posix_spawnp` genuinely fails on some machines/sandboxes (observed
 * during STEP-23-02 on macOS 25). Without the fallback, one unavailable addon
 * turns *every* agent command into a failed turn, which is a much worse outcome
 * than running the command without a tty. The choice is per-spawn, not cached,
 * so a transient failure does not permanently downgrade the session.
 */
export const nodePtyTerminalSpawn: TerminalSpawn = (options) => {
  try {
    return ptySpawn(options);
  } catch {
    return pipeSpawn(options);
  }
};

/** Default retained-output cap per terminal (1 MiB) when the agent names none. */
const DEFAULT_OUTPUT_BYTE_LIMIT = 1024 * 1024;

interface TerminalRecord {
  readonly id: string;
  readonly process: TerminalProcess;
  output: string;
  truncated: boolean;
  exit: TerminalExit | null;
  readonly byteLimit: number;
  readonly waiters: ((exit: TerminalExit) => void)[];
}

// ─── Services ───

export interface ChatClientServicesOptions {
  /** The session cwd. Every fs path and terminal cwd is confined to its real path. */
  readonly sessionRoot: string;
  /** Receives every `fs/*` audit record, in order. */
  readonly onAudit?: (event: ClientServiceAuditEvent) => void;
  /** Receives each terminal output chunk so the renderer can embed it live. */
  readonly onTerminalOutput?: (terminalId: string, chunk: string) => void;
  /** Terminal backend. Defaults to node-pty. */
  readonly spawn?: TerminalSpawn;
  /**
   * Authorizes a write before it happens. **Omit it and `writeTextFile` does not
   * exist at all**, which is what makes the read-only capability honest before
   * STEP-23-03's permission engine lands. Return `false` to refuse.
   */
  readonly authorizeWrite?: (path: string, content: string) => Promise<boolean>;
}

export interface ChatClientServices {
  readonly fs: FileSystemPort;
  readonly terminal: TerminalPort;
  /** Audit records emitted so far (in-memory session event stream). */
  readonly auditEvents: readonly ClientServiceAuditEvent[];
  /** Kills and forgets every live terminal. Called on session dispose. */
  disposeAll(): void;
}

export function createChatClientServices(options: ChatClientServicesOptions): ChatClientServices {
  const guard = createPathGuard(options.sessionRoot);
  const spawn = options.spawn ?? nodePtyTerminalSpawn;
  const terminals = new Map<string, TerminalRecord>();
  const auditEvents: ClientServiceAuditEvent[] = [];
  let terminalCounter = 0;

  const audit = (kind: ClientServiceAuditEvent['kind'], payload: Record<string, unknown>): void => {
    const event: ClientServiceAuditEvent = { kind, ts: new Date().toISOString(), payload };
    auditEvents.push(event);
    options.onAudit?.(event);
  };

  /** Resolves a path, auditing the refusal too — a denied read is the interesting one. */
  const guardPath = async (path: string, operation: string): Promise<string> => {
    try {
      return await guard.resolve(path);
    } catch (cause) {
      audit('client/fs_denied', {
        operation,
        path,
        reason: cause instanceof ClientServiceError ? cause.code : 'unknown',
      });
      throw cause;
    }
  };

  const fs: FileSystemPort = {
    async readTextFile(params) {
      const target = await guardPath(params.path, 'fs/read_text_file');
      let content: string;
      try {
        content = await readFile(target, 'utf8');
      } catch (cause) {
        throw new ClientServiceError(
          'read_failed',
          `Could not read '${params.path}': ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }
      // `line` is 1-based and `limit` counts lines, per the ACP schema.
      if (typeof params.line === 'number' || typeof params.limit === 'number') {
        const lines = content.split('\n');
        const start = typeof params.line === 'number' ? Math.max(0, params.line - 1) : 0;
        const end = typeof params.limit === 'number' ? start + params.limit : lines.length;
        content = lines.slice(start, end).join('\n');
      }
      audit('client/fs_read_text_file', { path: target, bytes: content.length });
      return { content };
    },
  };

  const authorizeWrite = options.authorizeWrite;
  if (authorizeWrite !== undefined) {
    fs.writeTextFile = async (params) => {
      const target = await guardPath(params.path, 'fs/write_text_file');
      const approved = await authorizeWrite(target, params.content);
      if (!approved) {
        audit('client/fs_denied', { operation: 'fs/write_text_file', path: target, reason: 'not_authorized' });
        throw new ClientServiceError('write_not_authorized', `Refused: write to '${params.path}' was not authorized`);
      }
      await writeFile(target, params.content, 'utf8');
      audit('client/fs_write_text_file', { path: target, bytes: params.content.length });
    };
  }

  const requireTerminal = (terminalId: string): TerminalRecord => {
    const record = terminals.get(terminalId);
    if (record === undefined) {
      throw new ClientServiceError('unknown_terminal', `No terminal '${terminalId}'`);
    }
    return record;
  };

  const terminal: TerminalPort = {
    async createTerminal(params) {
      // The command's cwd is guarded too: a terminal is a far easier escape
      // hatch than `fs/read_text_file` if it may start anywhere.
      const cwd = await guardPath(params.cwd ?? options.sessionRoot, 'terminal/create');
      const id = `chat-term-${++terminalCounter}`;
      const env: Record<string, string> = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) env[key] = value;
      }
      for (const variable of params.env ?? []) env[variable.name] = variable.value;

      const record: TerminalRecord = {
        id,
        process: spawn({ command: params.command, args: params.args ?? [], cwd, env }),
        output: '',
        truncated: false,
        exit: null,
        byteLimit:
          typeof params.outputByteLimit === 'number' && params.outputByteLimit > 0
            ? params.outputByteLimit
            : DEFAULT_OUTPUT_BYTE_LIMIT,
        waiters: [],
      };
      terminals.set(id, record);

      record.process.onData((chunk) => {
        record.output += chunk;
        if (record.output.length > record.byteLimit) {
          // Keep the tail: the end of a command's output is what a user reads.
          record.output = record.output.slice(record.output.length - record.byteLimit);
          record.truncated = true;
        }
        options.onTerminalOutput?.(id, chunk);
      });
      record.process.onExit((exit) => {
        record.exit = exit;
        const waiters = record.waiters.splice(0, record.waiters.length);
        for (const waiter of waiters) waiter(exit);
      });

      return { terminalId: id };
    },

    async terminalOutput(params) {
      const record = requireTerminal(params.terminalId);
      return {
        output: record.output,
        truncated: record.truncated,
        ...(record.exit !== null
          ? { exitStatus: { exitCode: record.exit.exitCode, signal: record.exit.signal } }
          : {}),
      };
    },

    async waitForTerminalExit(params) {
      const record = requireTerminal(params.terminalId);
      const exit =
        record.exit ?? (await new Promise<TerminalExit>((resolveExit) => record.waiters.push(resolveExit)));
      return { exitCode: exit.exitCode, signal: exit.signal };
    },

    async releaseTerminal(params) {
      const record = requireTerminal(params.terminalId);
      // Releasing a still-running process must not leave it orphaned.
      if (record.exit === null) record.process.kill();
      terminals.delete(params.terminalId);
    },

    async killTerminal(params) {
      const record = requireTerminal(params.terminalId);
      // Kill without release: the agent may still read the buffered output after.
      if (record.exit === null) record.process.kill();
    },
  };

  return {
    fs,
    terminal,
    auditEvents,
    disposeAll(): void {
      for (const record of terminals.values()) {
        if (record.exit === null) record.process.kill();
      }
      terminals.clear();
    },
  };
}
