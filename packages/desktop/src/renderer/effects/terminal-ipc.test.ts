/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Effect } from 'effect';
import {
  TerminalIpc,
  TerminalCloseError,
  TerminalSpawnError,
  TerminalLaunchError,
  TerminalWriteError,
  TerminalResizeError,
  TerminalApprovalError,
  SrgntBridgeError,
  runSafe,
  runUnsafe,
} from './terminal-ipc.js';

beforeEach(() => {
  window.srgnt = {
    terminalSpawn: vi.fn().mockResolvedValue({ sessionId: 'session-1', pid: 101 }),
    terminalLaunchWithContext: vi.fn().mockResolvedValue({
      sessionId: 'session-2',
      pid: 202,
      launchId: 'launch-1',
      status: 'approved',
    }),
    terminalWrite: vi.fn().mockResolvedValue(undefined),
    terminalResize: vi.fn().mockResolvedValue(undefined),
    terminalClose: vi.fn().mockResolvedValue(undefined),
    resolveLaunchApproval: vi.fn().mockResolvedValue(undefined),
  } as unknown as typeof window.srgnt;
});

describe('TerminalCloseError', () => {
  it('creates instance with message and sessionId', () => {
    const error = new TerminalCloseError({ message: 'test error', sessionId: 'session-1' });
    expect(error.message).toBe('test error');
    expect(error.sessionId).toBe('session-1');
  });

  it('has _tag TerminalCloseError', () => {
    const error = new TerminalCloseError({ message: 'test error', sessionId: 'session-1' });
    expect(error._tag).toBe('TerminalCloseError');
  });
});

describe('TerminalSpawnError', () => {
  it('creates instance with message', () => {
    const error = new TerminalSpawnError({ message: 'spawn failed' });
    expect(error._tag).toBe('TerminalSpawnError');
    expect(error.message).toBe('spawn failed');
  });
});

describe('TerminalLaunchError', () => {
  it('creates instance with message and launchId', () => {
    const error = new TerminalLaunchError({ message: 'launch failed', launchId: 'launch-1' });
    expect(error.message).toBe('launch failed');
    expect(error.launchId).toBe('launch-1');
  });

  it('has _tag TerminalLaunchError', () => {
    const error = new TerminalLaunchError({ message: 'launch failed', launchId: 'launch-1' });
    expect(error._tag).toBe('TerminalLaunchError');
  });
});

describe('TerminalWriteError', () => {
  it('creates instance with message and sessionId', () => {
    const error = new TerminalWriteError({ message: 'write failed', sessionId: 'session-2' });
    expect(error.message).toBe('write failed');
    expect(error.sessionId).toBe('session-2');
  });

  it('has _tag TerminalWriteError', () => {
    const error = new TerminalWriteError({ message: 'write failed', sessionId: 'session-2' });
    expect(error._tag).toBe('TerminalWriteError');
  });
});

describe('TerminalResizeError', () => {
  it('creates instance with message and sessionId', () => {
    const error = new TerminalResizeError({ message: 'resize failed', sessionId: 'session-3' });
    expect(error._tag).toBe('TerminalResizeError');
    expect(error.message).toBe('resize failed');
    expect(error.sessionId).toBe('session-3');
  });
});

describe('TerminalApprovalError', () => {
  it('creates instance with message and approvalId', () => {
    const error = new TerminalApprovalError({ message: 'approval failed', approvalId: 'approval-1' });
    expect(error.message).toBe('approval failed');
    expect(error.approvalId).toBe('approval-1');
  });

  it('has _tag TerminalApprovalError', () => {
    const error = new TerminalApprovalError({ message: 'approval failed', approvalId: 'approval-1' });
    expect(error._tag).toBe('TerminalApprovalError');
  });
});

describe('SrgntBridgeError', () => {
  it('creates instance with message and method', () => {
    const error = new SrgntBridgeError({ message: 'bridge call failed', method: 'terminalSpawn' });
    expect(error.message).toBe('bridge call failed');
    expect(error.method).toBe('terminalSpawn');
  });

  it('has _tag SrgntBridgeError', () => {
    const error = new SrgntBridgeError({ message: 'bridge call failed', method: 'terminalSpawn' });
    expect(error._tag).toBe('SrgntBridgeError');
  });
});

describe('TaggedError behavior', () => {
  it('all errors are instances of their class', () => {
    expect(new TerminalCloseError({ message: 'm', sessionId: 's' })).toBeInstanceOf(TerminalCloseError);
    expect(new TerminalSpawnError({ message: 'm' })).toBeInstanceOf(TerminalSpawnError);
    expect(new TerminalLaunchError({ message: 'm', launchId: 'l' })).toBeInstanceOf(TerminalLaunchError);
    expect(new TerminalWriteError({ message: 'm', sessionId: 's' })).toBeInstanceOf(TerminalWriteError);
    expect(new TerminalResizeError({ message: 'm', sessionId: 's' })).toBeInstanceOf(TerminalResizeError);
    expect(new TerminalApprovalError({ message: 'm', approvalId: 'a' })).toBeInstanceOf(TerminalApprovalError);
    expect(new SrgntBridgeError({ message: 'm', method: 'f' })).toBeInstanceOf(SrgntBridgeError);
  });

  it('all errors have a message field', () => {
    const errors = [
      new TerminalCloseError({ message: 'm', sessionId: 's' }),
      new TerminalSpawnError({ message: 'm' }),
      new TerminalLaunchError({ message: 'm', launchId: 'l' }),
      new TerminalWriteError({ message: 'm', sessionId: 's' }),
      new TerminalResizeError({ message: 'm', sessionId: 's' }),
      new TerminalApprovalError({ message: 'm', approvalId: 'a' }),
      new SrgntBridgeError({ message: 'm', method: 'f' }),
    ];
    for (const error of errors) {
      expect(typeof error.message).toBe('string');
    }
  });
});

describe('TerminalIpc service', () => {
  it('spawn delegates to window.srgnt.terminalSpawn', async () => {
    const result = await runUnsafe(TerminalIpc.spawn({ rows: 40, cols: 120 }));
    expect(result).toEqual({ sessionId: 'session-1', pid: 101 });
    expect(window.srgnt.terminalSpawn).toHaveBeenCalledWith({ rows: 40, cols: 120 });
  });

  it('launchWithContext maps bridge failures to TerminalLaunchError', async () => {
    (window.srgnt.terminalLaunchWithContext as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('launch bridge down'),
    );

    const exit = await Effect.runPromiseExit(
      TerminalIpc.launchWithContext({
        launchContext: { launchId: 'launch-99' },
      } as any).pipe(Effect.provide(TerminalIpc.Default)),
    );

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      const cause = JSON.stringify(exit.cause);
      expect(cause).toContain('TerminalLaunchError');
      expect(cause).toContain('launch-99');
      expect(cause).toContain('launch bridge down');
    }
  });

  it('write/resize/close/resolveLaunchApproval call the bridge methods', async () => {
    await runUnsafe(TerminalIpc.write('session-1', 'pwd\n'));
    await runUnsafe(TerminalIpc.resize('session-1', 50, 160));
    await runUnsafe(TerminalIpc.close('session-1'));
    await runUnsafe(TerminalIpc.resolveLaunchApproval('approval-1', true));

    expect(window.srgnt.terminalWrite).toHaveBeenCalledWith('session-1', 'pwd\n');
    expect(window.srgnt.terminalResize).toHaveBeenCalledWith('session-1', 50, 160);
    expect(window.srgnt.terminalClose).toHaveBeenCalledWith('session-1');
    expect(window.srgnt.resolveLaunchApproval).toHaveBeenCalledWith('approval-1', true);
  });

  it('runSafe swallows mapped service errors', async () => {
    (window.srgnt.terminalWrite as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('write failed'),
    );

    await expect(
      Effect.runPromise(Effect.sync(() => runSafe(TerminalIpc.write('session-1', 'ls')))),
    ).resolves.toBeUndefined();
  });
});
