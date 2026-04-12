/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PtySession, PtyProcess } from './session-manager.js';

const mockWrite = vi.fn();
const mockResize = vi.fn();
const mockKill = vi.fn();
const mockOnData = vi.fn();
const mockOnExit = vi.fn();

let ptyInstance: ReturnType<typeof createMockPty>;

function createMockPty() {
  return {
    pid: 12345,
    onData: mockOnData,
    onExit: mockOnExit,
    write: mockWrite,
    resize: mockResize,
    kill: mockKill,
    process: 'child',
  };
}

vi.mock('node-pty', () => ({
  spawn: vi.fn().mockImplementation(() => createMockPty()),
}));

import { createPtyService } from './node-pty-service.js';
import { createPtySessionManager } from './session-manager.js';
import * as nodePty from 'node-pty';

const nodePtySpawn = vi.mocked(nodePty.spawn);

describe('createPtyService', () => {
  let originalPlatform: string;
  let originalShell: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalPlatform = process.platform;
    originalShell = process.env.SHELL;
    ptyInstance = createMockPty();
    // Ensure the mock returns our fresh instance each time
    nodePtySpawn.mockReturnValue(ptyInstance as any);
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    if (originalShell !== undefined) {
      process.env.SHELL = originalShell;
    } else {
      delete process.env.SHELL;
    }
  });

  function createService() {
    const sessionManager = createPtySessionManager();
    return { service: createPtyService({ sessionManager }), sessionManager };
  }

  // 1. spawn() — Unix with bash
  it('spawns bash with --login on Unix and filters secret env keys', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.SHELL = '/bin/bash';
    process.env.SECRET_THING = 'should-be-filtered';

    const { service } = createService();
    const result = await service.spawn({ rows: 24, cols: 80 });

    expect(nodePtySpawn).toHaveBeenCalledWith(
      '/bin/bash',
      ['--login'],
      expect.objectContaining({
        rows: 24,
        cols: 80,
      }),
    );

    const callEnv = (nodePtySpawn.mock.calls[0][2] as Record<string, any>).env;
    expect(callEnv.SECRET_THING).toBeUndefined();
    expect(result.session).toBeDefined();
    expect(result.session.isActive).toBe(true);
  });

  // 2. spawn() — Unix with zsh
  it('spawns zsh with -l flag on Unix', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.SHELL = '/bin/zsh';

    const { service } = createService();
    await service.spawn({ rows: 24, cols: 80 });

    expect(nodePtySpawn).toHaveBeenCalledWith('/bin/zsh', ['-l'], expect.any(Object));
  });

  // 3. spawn() — Windows
  it('spawns powershell with -NoLogo on Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    const { service } = createService();
    await service.spawn({ rows: 24, cols: 80 });

    expect(nodePtySpawn).toHaveBeenCalledWith('powershell.exe', ['-NoLogo'], expect.any(Object));
  });

  // 4. spawn() — custom env with secrets filtered
  it('filters secret keys from custom env but keeps safe keys', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.SHELL = '/bin/bash';

    const { service } = createService();
    await service.spawn({
      rows: 24,
      cols: 80,
      env: { FOO: 'bar', SECRET_TOKEN: 'abc' },
    });

    const callEnv = (nodePtySpawn.mock.calls[0][2] as Record<string, any>).env;
    expect(callEnv.FOO).toBe('bar');
    expect(callEnv.SECRET_TOKEN).toBeUndefined();
  });

  // 5. write() — active session
  it('writes data to an active session', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.SHELL = '/bin/bash';

    const { service } = createService();
    const { session } = await service.spawn({ rows: 24, cols: 80 });

    service.write(session.id, 'hello');

    expect(mockWrite).toHaveBeenCalledWith('hello');
  });

  // 6. write() — non-existent session
  it('is a no-op when writing to a non-existent session', () => {
    const { service } = createService();
    expect(() => service.write('non-existent', 'hello')).not.toThrow();
    expect(mockWrite).not.toHaveBeenCalled();
  });

  // 7. resize() — active session
  it('resizes an active session with correct rows/cols', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.SHELL = '/bin/bash';

    const { service } = createService();
    const { session } = await service.spawn({ rows: 24, cols: 80 });

    service.resize(session.id, 40, 120);

    expect(mockResize).toHaveBeenCalledWith(120, 40); // node-pty takes (cols, rows)
  });

  // 8. resize() — non-existent session
  it('is a no-op when resizing a non-existent session', () => {
    const { service } = createService();
    expect(() => service.resize('non-existent', 40, 120)).not.toThrow();
    expect(mockResize).not.toHaveBeenCalled();
  });

  // 9. kill()
  it('kills session and marks it inactive', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.SHELL = '/bin/bash';

    const { service, sessionManager } = createService();
    const { session } = await service.spawn({ rows: 24, cols: 80 });

    service.kill(session.id);

    expect(mockKill).toHaveBeenCalled();
    const killed = sessionManager.getSession(session.id);
    expect(killed?.isActive).toBe(false);
  });

  // 10. onData/onExit callbacks
  it('fires registered onData and onExit callbacks', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.SHELL = '/bin/bash';

    const { service } = createService();
    const { session } = await service.spawn({ rows: 24, cols: 80 });

    // Register callbacks
    const dataSpy = vi.fn();
    const exitSpy = vi.fn();
    service.onData(session.id, dataSpy);
    service.onExit(session.id, exitSpy);

    // Simulate pty firing onData
    const onDataCallback = mockOnData.mock.calls[0][0];
    onDataCallback('output data');
    expect(dataSpy).toHaveBeenCalledWith('output data');

    // Simulate pty firing onExit
    const onExitCallback = mockOnExit.mock.calls[0][0];
    onExitCallback({ exitCode: 0 });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  // 11. list()
  it('lists all sessions', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.SHELL = '/bin/bash';

    const { service } = createService();
    await service.spawn({ rows: 24, cols: 80 });
    await service.spawn({ rows: 24, cols: 80 });

    const sessions = service.list();
    expect(sessions).toHaveLength(2);
  });
});
