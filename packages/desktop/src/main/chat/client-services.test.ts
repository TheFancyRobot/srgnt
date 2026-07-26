/**
 * @vitest-environment node
 */
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ClientServiceError,
  createChatClientServices,
  nodePtyTerminalSpawn,
  type ChatClientServices,
  type TerminalExit,
  type TerminalProcess,
  type TerminalSpawn,
  type TerminalSpawnOptions,
} from './client-services.js';

/**
 * The path-guard tests are the point of this file: `fs/*` is the one client
 * service that can reach outside the session, and a lexical prefix check is not
 * enough (see the symlink cases). Terminals use an injected fake so no native
 * pty is needed.
 */

let root: string;
let outside: string;

beforeEach(() => {
  // `realpathSync` up front: on macOS `tmpdir()` is itself a symlink
  // (/var → /private/var), and a test that compares against the unresolved
  // path would "pass" for the wrong reason.
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'srgnt-client-services-')));
  root = join(base, 'proj');
  outside = join(base, 'outside');
  mkdirSync(root);
  mkdirSync(outside);
  writeFileSync(join(root, 'inside.txt'), 'inside content\n');
  writeFileSync(join(outside, 'secret.txt'), 'secret content\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

interface FakeTerminal extends TerminalProcess {
  emit(chunk: string): void;
  finish(exit: TerminalExit): void;
  readonly killed: () => boolean;
  readonly options: TerminalSpawnOptions;
}

function fakeSpawner(): { spawn: TerminalSpawn; terminals: FakeTerminal[] } {
  const terminals: FakeTerminal[] = [];
  const spawn: TerminalSpawn = (options) => {
    let dataListener: ((chunk: string) => void) | null = null;
    let exitListener: ((exit: TerminalExit) => void) | null = null;
    let wasKilled = false;
    const terminal: FakeTerminal = {
      options,
      onData: (listener) => {
        dataListener = listener;
      },
      onExit: (listener) => {
        exitListener = listener;
      },
      kill: () => {
        wasKilled = true;
      },
      emit: (chunk) => dataListener?.(chunk),
      finish: (exit) => exitListener?.(exit),
      killed: () => wasKilled,
    };
    terminals.push(terminal);
    return terminal;
  };
  return { spawn, terminals };
}

function services(overrides: Partial<Parameters<typeof createChatClientServices>[0]> = {}): ChatClientServices {
  return createChatClientServices({ sessionRoot: root, spawn: fakeSpawner().spawn, ...overrides });
}

const session = { sessionId: 'acp-1' } as const;

describe('client fs port — reads inside the session', () => {
  it('reads a file inside the session cwd and audits the call', () => {
    const audited: string[] = [];
    const svc = services({ onAudit: (event) => audited.push(event.kind) });
    return svc.fs.readTextFile({ ...session, path: join(root, 'inside.txt') }).then((result) => {
      expect(result.content).toBe('inside content\n');
      expect(audited).toEqual(['client/fs_read_text_file']);
      expect(svc.auditEvents[0]?.payload['path']).toBe(join(root, 'inside.txt'));
    });
  });

  it('accepts a relative path by resolving it against the session cwd', async () => {
    const result = await services().fs.readTextFile({ ...session, path: 'inside.txt' });
    expect(result.content).toBe('inside content\n');
  });

  it('honors line and limit (1-based, line-counted) per the ACP schema', async () => {
    writeFileSync(join(root, 'lines.txt'), 'a\nb\nc\nd\n');
    const svc = services();
    expect((await svc.fs.readTextFile({ ...session, path: 'lines.txt', line: 2 })).content).toBe('b\nc\nd\n');
    expect((await svc.fs.readTextFile({ ...session, path: 'lines.txt', line: 2, limit: 2 })).content).toBe('b\nc');
  });

  it('surfaces an ordinary read failure as a typed error, not a raw ENOENT', async () => {
    await expect(services().fs.readTextFile({ ...session, path: 'missing.txt' })).rejects.toMatchObject({
      code: 'read_failed',
    });
  });
});

describe('client fs port — failures are audited', () => {
  it('audits a read that clears containment but fails on disk', async () => {
    const events: { kind: string; payload: Record<string, unknown> }[] = [];
    const svc = services({ onAudit: (event) => events.push(event) });
    await expect(svc.fs.readTextFile({ ...session, path: 'missing.txt' })).rejects.toMatchObject({
      code: 'read_failed',
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'client/fs_denied', payload: { reason: 'read_failed' } });
  });

  // Root bypasses the mode bits, so the read would succeed and invert the test.
  it.skipIf(process.getuid?.() === 0)('fails closed when a path cannot be canonicalized', async () => {
    const locked = join(root, 'locked');
    mkdirSync(locked);
    chmodSync(locked, 0o000);
    try {
      const svc = services();
      // EACCES, not ENOENT: walking up and reconstructing the path would hand
      // the containment check something the filesystem never confirmed.
      await expect(svc.fs.readTextFile({ ...session, path: 'locked/inner.txt' })).rejects.toMatchObject({
        code: 'path_outside_session',
      });
    } finally {
      chmodSync(locked, 0o700);
    }
  });
});

describe('client fs port — path guard', () => {
  const expectRefused = async (path: string): Promise<void> => {
    const svc = services();
    await expect(svc.fs.readTextFile({ ...session, path })).rejects.toBeInstanceOf(ClientServiceError);
    await expect(svc.fs.readTextFile({ ...session, path })).rejects.toMatchObject({
      code: 'path_outside_session',
    });
  };

  it('refuses ../ traversal out of the session cwd', async () => {
    await expectRefused(join('..', 'outside', 'secret.txt'));
  });

  it('refuses an absolute path outside the session cwd', async () => {
    await expectRefused(join(outside, 'secret.txt'));
  });

  it('refuses a sibling directory whose name merely shares the prefix', async () => {
    // /tmp/…/proj vs /tmp/…/proj-evil: a bare startsWith() would allow this.
    const evil = `${root}-evil`;
    mkdirSync(evil);
    writeFileSync(join(evil, 'secret.txt'), 'nope\n');
    try {
      await expectRefused(join(evil, 'secret.txt'));
    } finally {
      rmSync(evil, { recursive: true, force: true });
    }
  });

  it('refuses a symlink inside the session that points outside it', async () => {
    // The lexical path is *inside* root — only realpath catches this.
    symlinkSync(join(outside, 'secret.txt'), join(root, 'escape.txt'));
    await expectRefused('escape.txt');
  });

  it('refuses a path whose parent directory is a symlink pointing outside', async () => {
    symlinkSync(outside, join(root, 'escape-dir'));
    await expectRefused(join('escape-dir', 'secret.txt'));
    // Same guard applies to a target that does not exist yet (the write case).
    await expectRefused(join('escape-dir', 'brand-new.txt'));
  });

  it('allows a symlink inside the session that points back inside it', async () => {
    symlinkSync(join(root, 'inside.txt'), join(root, 'alias.txt'));
    const result = await services().fs.readTextFile({ ...session, path: 'alias.txt' });
    expect(result.content).toBe('inside content\n');
  });

  it('audits every refusal so a denied read is visible, not silent', async () => {
    const svc = services();
    await expect(svc.fs.readTextFile({ ...session, path: join(outside, 'secret.txt') })).rejects.toThrow();
    expect(svc.auditEvents).toHaveLength(1);
    expect(svc.auditEvents[0]?.kind).toBe('client/fs_denied');
    expect(svc.auditEvents[0]?.payload['operation']).toBe('fs/read_text_file');
  });
});

describe('client fs port — write sequencing (STEP-23-03 gate)', () => {
  it('omits writeTextFile entirely when no authorizer is injected', () => {
    // Absence is load-bearing: the harness advertises the fs write capability
    // from this method's presence, so the agent is told writes are unavailable.
    expect(services().fs.writeTextFile).toBeUndefined();
  });

  it('writes only through the authorizer and audits the result', async () => {
    const authorizeWrite = vi.fn().mockResolvedValue(true);
    const svc = services({ authorizeWrite });
    await svc.fs.writeTextFile?.({ ...session, path: 'written.txt', content: 'hello' });
    expect(authorizeWrite).toHaveBeenCalledWith(join(root, 'written.txt'), 'hello');
    expect(svc.auditEvents.map((event) => event.kind)).toEqual(['client/fs_write_text_file']);
  });

  it('refuses and audits when the authorizer says no, leaving nothing on disk', async () => {
    const svc = services({ authorizeWrite: () => Promise.resolve(false) });
    await expect(
      svc.fs.writeTextFile?.({ ...session, path: 'refused.txt', content: 'nope' }),
    ).rejects.toMatchObject({ code: 'write_not_authorized' });
    expect(svc.auditEvents[0]?.kind).toBe('client/fs_denied');
    await expect(services().fs.readTextFile({ ...session, path: 'refused.txt' })).rejects.toMatchObject({
      code: 'read_failed',
    });
  });

  it('applies the same path guard to writes before consulting the authorizer', async () => {
    const authorizeWrite = vi.fn().mockResolvedValue(true);
    const svc = services({ authorizeWrite });
    await expect(
      svc.fs.writeTextFile?.({ ...session, path: join(outside, 'pwned.txt'), content: 'x' }),
    ).rejects.toMatchObject({ code: 'path_outside_session' });
    expect(authorizeWrite).not.toHaveBeenCalled();
  });
});

describe('client terminal port', () => {
  it('creates a terminal in the session cwd and buffers its output', async () => {
    const { spawn, terminals } = fakeSpawner();
    const svc = services({ spawn });
    const { terminalId } = await svc.terminal.createTerminal({ ...session, command: 'echo', args: ['hi'] });

    expect(terminals[0]?.options).toMatchObject({ command: 'echo', args: ['hi'], cwd: root });
    terminals[0]?.emit('hi\n');
    const output = await svc.terminal.terminalOutput({ ...session, terminalId });
    expect(output.output).toBe('hi\n');
    expect(output.truncated).toBe(false);
    expect(output.exitStatus).toBeUndefined();
  });

  it('streams each chunk out for the renderer embed', async () => {
    const { spawn, terminals } = fakeSpawner();
    const streamed: [string, string][] = [];
    const svc = services({ spawn, onTerminalOutput: (id, chunk) => streamed.push([id, chunk]) });
    const { terminalId } = await svc.terminal.createTerminal({ ...session, command: 'echo' });
    terminals[0]?.emit('one ');
    terminals[0]?.emit('two');
    expect(streamed).toEqual([
      [terminalId, 'one '],
      [terminalId, 'two'],
    ]);
  });

  it('reports the exit status once the process finishes and resolves waiters', async () => {
    const { spawn, terminals } = fakeSpawner();
    const svc = services({ spawn });
    const { terminalId } = await svc.terminal.createTerminal({ ...session, command: 'true' });
    const waiting = svc.terminal.waitForTerminalExit({ ...session, terminalId });
    terminals[0]?.finish({ exitCode: 0, signal: null });
    expect(await waiting).toEqual({ exitCode: 0, signal: null });
    // A wait *after* exit resolves immediately from the recorded status.
    expect(await svc.terminal.waitForTerminalExit({ ...session, terminalId })).toEqual({
      exitCode: 0,
      signal: null,
    });
    expect((await svc.terminal.terminalOutput({ ...session, terminalId })).exitStatus).toEqual({
      exitCode: 0,
      signal: null,
    });
  });

  it('truncates to the requested byte limit, keeping the tail', async () => {
    const { spawn, terminals } = fakeSpawner();
    const svc = services({ spawn });
    const { terminalId } = await svc.terminal.createTerminal({
      ...session,
      command: 'yes',
      outputByteLimit: 4,
    });
    terminals[0]?.emit('abcdefgh');
    const output = await svc.terminal.terminalOutput({ ...session, terminalId });
    expect(output.output).toBe('efgh');
    expect(output.truncated).toBe(true);
  });

  it('measures the byte limit in UTF-8 bytes, not UTF-16 code units', async () => {
    const { spawn, terminals } = fakeSpawner();
    const svc = services({ spawn });
    const { terminalId } = await svc.terminal.createTerminal({
      ...session,
      command: 'yes',
      outputByteLimit: 8,
    });
    // Six 3-byte characters = 18 bytes but only 6 UTF-16 units, so a
    // length-based cap would keep all of it and blow the advertised budget.
    terminals[0]?.emit('日本語日本語');
    const { output, truncated } = await svc.terminal.terminalOutput({ ...session, terminalId });
    expect(truncated).toBe(true);
    expect(Buffer.byteLength(output)).toBeLessThanOrEqual(8);
    // Cut at a character boundary: no partial sequences, no replacement chars.
    expect(output).toBe('本語');
  });

  it('hands the spawned command an allowlisted environment, not the main process one', async () => {
    const { spawn, terminals } = fakeSpawner();
    process.env.SRGNT_TEST_FAKE_SECRET = 'do-not-leak';
    try {
      const svc = services({ spawn });
      await svc.terminal.createTerminal({
        ...session,
        command: 'env',
        env: [{ name: 'EXPLICIT', value: 'yes' }],
      });
      const env = terminals[0]!.options.env;
      expect(env.SRGNT_TEST_FAKE_SECRET).toBeUndefined();
      expect(env.EXPLICIT).toBe('yes');
      expect(env.PATH).toBe(process.env.PATH);
    } finally {
      delete process.env.SRGNT_TEST_FAKE_SECRET;
    }
  });

  it('kills a process that never exits, and release kills it too', async () => {
    const { spawn, terminals } = fakeSpawner();
    const svc = services({ spawn });
    const first = await svc.terminal.createTerminal({ ...session, command: 'sleep' });
    await svc.terminal.killTerminal({ ...session, terminalId: first.terminalId });
    expect(terminals[0]?.killed()).toBe(true);
    // Killed but not released: buffered output is still readable.
    await expect(svc.terminal.terminalOutput({ ...session, terminalId: first.terminalId })).resolves.toBeDefined();

    const second = await svc.terminal.createTerminal({ ...session, command: 'sleep' });
    await svc.terminal.releaseTerminal({ ...session, terminalId: second.terminalId });
    expect(terminals[1]?.killed()).toBe(true);
  });

  it('rejects operations on an unknown or released terminal instead of throwing raw', async () => {
    const { spawn } = fakeSpawner();
    const svc = services({ spawn });
    const { terminalId } = await svc.terminal.createTerminal({ ...session, command: 'echo' });
    await svc.terminal.releaseTerminal({ ...session, terminalId });
    await expect(svc.terminal.terminalOutput({ ...session, terminalId })).rejects.toMatchObject({
      code: 'unknown_terminal',
    });
    await expect(svc.terminal.terminalOutput({ ...session, terminalId: 'never-existed' })).rejects.toBeInstanceOf(
      ClientServiceError,
    );
  });

  it('refuses a terminal cwd outside the session', async () => {
    const { spawn, terminals } = fakeSpawner();
    const svc = services({ spawn });
    await expect(
      svc.terminal.createTerminal({ ...session, command: 'sh', cwd: outside }),
    ).rejects.toMatchObject({ code: 'path_outside_session' });
    expect(terminals).toHaveLength(0);
  });

  it('runs a real command through the production backend (pty, or pipes if node-pty cannot spawn)', async () => {
    // Deliberately not injecting a fake: this is the one test that proves the
    // shipped default actually executes something. node-pty's `posix_spawnp`
    // fails on some machines, which is exactly why the backend falls back to
    // plain pipes — either path must produce the command's output.
    const svc = createChatClientServices({ sessionRoot: root });
    const { terminalId } = await svc.terminal.createTerminal({
      ...session,
      command: '/bin/echo',
      args: ['hello-from-client-terminal'],
    });
    const exit = await svc.terminal.waitForTerminalExit({ ...session, terminalId });
    expect(exit.exitCode).toBe(0);
    const output = await svc.terminal.terminalOutput({ ...session, terminalId });
    expect(output.output).toContain('hello-from-client-terminal');
    await svc.terminal.releaseTerminal({ ...session, terminalId });
  });

  it('delivers exactly one exit when the command cannot be spawned', async () => {
    // Both 'error' and 'close' fire for a failed spawn; the record's waiters are
    // spliced on first delivery, so a second one would resolve nothing and leave
    // the terminal state inconsistent.
    const exits: TerminalExit[] = [];
    const child = nodePtyTerminalSpawn({
      command: join(root, 'definitely-not-a-binary'),
      args: [],
      cwd: root,
      env: {},
    });
    child.onExit((exit) => exits.push(exit));
    await new Promise((done) => setTimeout(done, 250));
    expect(exits).toHaveLength(1);
  });

  it('disposeAll kills every live terminal', async () => {
    const { spawn, terminals } = fakeSpawner();
    const svc = services({ spawn });
    await svc.terminal.createTerminal({ ...session, command: 'sleep' });
    await svc.terminal.createTerminal({ ...session, command: 'sleep' });
    svc.disposeAll();
    expect(terminals.map((terminal) => terminal.killed())).toEqual([true, true]);
  });
});
