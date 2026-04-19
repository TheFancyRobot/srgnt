import { describe, expect, it, vi } from 'vitest';
import { createShellOpenExternalHandler } from './shell-open-external.js';

describe('shell:open-external IPC handler', () => {
  it.each([
    'https://example.com',
    'http://example.com/docs?q=srgnt',
    'mailto:test@example.com',
  ])('passes allowed scheme %s through to Electron shell', async (url) => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    const handler = createShellOpenExternalHandler(openExternal);

    await expect(handler({} as Electron.IpcMainInvokeEvent, { url })).resolves.toBeUndefined();
    expect(openExternal).toHaveBeenCalledWith(url);
    expect(openExternal).toHaveBeenCalledTimes(1);
  });

  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'data:text/html,<script>alert(1)</script>',
  ])('rejects dangerous scheme %s', async (url) => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    const handler = createShellOpenExternalHandler(openExternal);

    await expect(handler({} as Electron.IpcMainInvokeEvent, { url })).rejects.toThrow();
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('rejects malformed payloads before destructuring', async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    const handler = createShellOpenExternalHandler(openExternal);

    await expect(handler({} as Electron.IpcMainInvokeEvent, {})).rejects.toThrow();
    expect(openExternal).not.toHaveBeenCalled();
  });
});
