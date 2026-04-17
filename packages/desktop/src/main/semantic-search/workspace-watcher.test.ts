/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const close = vi.fn();
const on = vi.fn();
let watchCallback:
  | ((eventType: 'rename' | 'change', filename: string | Buffer | null) => void)
  | null = null;
const watch = vi.fn((_path, _options, callback) => {
  watchCallback = callback;
  return {
    close,
    on,
  };
});
const existsSync = vi.fn(() => true);

vi.mock('node:fs', () => ({
  watch,
  existsSync,
}));

describe('WorkspaceWatcher', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    watchCallback = null;
    existsSync.mockReturnValue(true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function makeWatcher(onFileChange = vi.fn()) {
    const { createWorkspaceWatcher } = await import('./workspace-watcher.js');
    return { onFileChange, watcher: createWorkspaceWatcher({
      workspaceRoot: '/workspace',
      indexRoot: '/workspace/.srgnt-semantic-search',
      onFileChange,
      debounceMs: 500,
    }) };
  }

  it('starts fs.watch recursively and registers an error handler', async () => {
    const { watcher } = await makeWatcher();
    watcher.start();

    expect(watch).toHaveBeenCalledWith('/workspace', { recursive: true }, expect.any(Function));
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('does not start twice', async () => {
    const { watcher } = await makeWatcher();
    watcher.start();
    watcher.start();

    expect(watch).toHaveBeenCalledTimes(1);
  });

  it('stops the watcher and clears pending timers', async () => {
    const { watcher, onFileChange } = await makeWatcher();
    watcher.start();
    watchCallback?.('change', 'notes/a.md');

    watcher.stop();
    vi.advanceTimersByTime(500);

    expect(close).toHaveBeenCalledTimes(1);
    expect(onFileChange).not.toHaveBeenCalled();
  });

  it('debounces rapid changes to the same file', async () => {
    const { watcher, onFileChange } = await makeWatcher();
    watcher.start();

    watchCallback?.('change', 'notes/a.md');
    vi.advanceTimersByTime(300);
    watchCallback?.('change', 'notes/a.md');
    vi.advanceTimersByTime(499);
    expect(onFileChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFileChange).toHaveBeenCalledTimes(1);
    expect(onFileChange).toHaveBeenCalledWith('notes/a.md', 'change');
  });

  it('maps rename to add when the file exists', async () => {
    const { watcher, onFileChange } = await makeWatcher();
    watcher.start();

    existsSync.mockReturnValue(true);
    watchCallback?.('rename', 'notes/a.md');
    vi.runAllTimers();

    expect(onFileChange).toHaveBeenCalledWith('notes/a.md', 'add');
  });

  it('maps rename to unlink when the file no longer exists', async () => {
    const { watcher, onFileChange } = await makeWatcher();
    watcher.start();

    existsSync.mockReturnValue(false);
    watchCallback?.('rename', 'notes/a.md');
    vi.runAllTimers();

    expect(onFileChange).toHaveBeenCalledWith('notes/a.md', 'unlink');
  });

  it('ignores missing filenames and non-markdown files', async () => {
    const { watcher, onFileChange } = await makeWatcher();
    watcher.start();

    watchCallback?.('change', null);
    watchCallback?.('change', 'notes/a.txt');
    vi.runAllTimers();

    expect(onFileChange).not.toHaveBeenCalled();
  });

  it('ignores excluded paths and backup files', async () => {
    const { watcher, onFileChange } = await makeWatcher();
    watcher.start();

    watchCallback?.('change', '.agent-vault/Active_Context.md');
    watchCallback?.('change', '.git/index.md');
    watchCallback?.('change', '.hidden.md');
    watchCallback?.('change', 'notes/a.md~');
    watchCallback?.('change', 'notes/a.md.bak');
    watchCallback?.('change', '.srgnt-semantic-search/cache.md');
    vi.runAllTimers();

    expect(onFileChange).not.toHaveBeenCalled();
  });

  it('ignores node_modules markdown files', async () => {
    const { watcher, onFileChange } = await makeWatcher();
    watcher.start();

    watchCallback?.('change', 'node_modules/pkg/readme.md');
    vi.runAllTimers();

    expect(onFileChange).not.toHaveBeenCalled();
  });
});
