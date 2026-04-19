import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';

const { mockApp, mockCheckForUpdates } = vi.hoisted(() => {
  const mockApp = {
    isPackaged: false,
    getVersion: vi.fn(() => '1.0.0'),
  };
  const mockCheckForUpdates = vi.fn();
  return { mockApp, mockCheckForUpdates };
});

vi.mock('electron', () => ({
  app: mockApp,
}));

vi.mock('electron-updater', () => {
  const mockUpdater = {
    autoDownload: false,
    checkForUpdates: mockCheckForUpdates,
  };
  return {
    NsisUpdater: vi.fn(() => mockUpdater),
    MacUpdater: vi.fn(() => mockUpdater),
    AppImageUpdater: vi.fn(() => mockUpdater),
  };
});

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  mockApp.isPackaged = false;
  mockCheckForUpdates.mockReset();
  mockCheckForUpdates.mockResolvedValue({
    updateInfo: { version: '2.0.0' },
  });
});

afterEach(() => {
  process.env = originalEnv;
});

import { checkForUpdates } from './updater.js';

describe('checkForUpdates', () => {
  it('returns skipped when app.isPackaged is false', async () => {
    const result = await checkForUpdates('stable');
    expect(result.status).toBe('skipped');
    expect(result.channel).toBe('stable');
    expect(result.message).toContain('development builds');
  });

  it('returns skipped when app.isPackaged is true but no provider configured', async () => {
    mockApp.isPackaged = true;
    const result = await checkForUpdates('stable');
    expect(result.status).toBe('skipped');
    expect(result.message).toContain('No valid update provider configured');
  });

  it('returns skipped when SRGNT_UPDATE_URL is set but not HTTPS', async () => {
    mockApp.isPackaged = true;
    process.env.SRGNT_UPDATE_URL = 'http://example.com/updates';
    const result = await checkForUpdates('stable');
    expect(result.status).toBe('skipped');
    expect(result.message).toContain('No valid update provider configured');
  });

  it('returns error status on exception from electron-updater', async () => {
    mockApp.isPackaged = true;
    process.env.SRGNT_UPDATE_URL = 'https://example.com/updates';
    mockCheckForUpdates.mockRejectedValue(new Error('network failure'));
    const result = await checkForUpdates('stable');
    expect(result.status).toBe('error');
    expect(result.message).toBe('network failure');
    expect(result.channel).toBe('stable');
  });

  it('with valid SRGNT_UPDATE_URL (https), returns a result', async () => {
    mockApp.isPackaged = true;
    process.env.SRGNT_UPDATE_URL = 'https://example.com/updates';
    const result = await checkForUpdates('stable');
    expect(result.status).toBe('available');
    expect(result.version).toBe('2.0.0');
    expect(result.channel).toBe('stable');
  });

  it('uses generic provider when SRGNT_UPDATE_URL is a valid HTTPS URL and app is packaged', async () => {
    mockApp.isPackaged = true;
    process.env.SRGNT_UPDATE_URL = 'https://cdn.example.com/srgnt';
    const result = await checkForUpdates('beta');
    expect(result.status).toBe('available');
    expect(result.version).toBe('2.0.0');
    expect(result.channel).toBe('beta');
  });

  it('uses GitHub provider when SRGNT_UPDATE_OWNER and REPO have safe segments', async () => {
    mockApp.isPackaged = true;
    process.env.SRGNT_UPDATE_OWNER = 'myorg';
    process.env.SRGNT_UPDATE_REPO = 'myrepo';
    const result = await checkForUpdates('stable');
    expect(result.status).toBe('available');
    expect(result.version).toBe('2.0.0');
  });

  it('falls back to skipped when SRGNT_UPDATE_OWNER contains unsafe characters', async () => {
    mockApp.isPackaged = true;
    process.env.SRGNT_UPDATE_OWNER = 'my org';
    process.env.SRGNT_UPDATE_REPO = 'myrepo';
    const result = await checkForUpdates('stable');
    expect(result.status).toBe('skipped');
    expect(result.message).toContain('No valid update provider configured');
  });

  it('returns available update when generic URL configured and new version exists', async () => {
    mockApp.isPackaged = true;
    process.env.SRGNT_UPDATE_URL = 'https://releases.example.com/win';
    mockCheckForUpdates.mockResolvedValue({
      updateInfo: { version: '3.0.0' },
    });
    const result = await checkForUpdates('stable');
    expect(result.status).toBe('available');
    expect(result.version).toBe('3.0.0');
    expect(result.message).toContain('3.0.0');
  });

  it('returns not-available when configured GitHub provider returns same version', async () => {
    mockApp.isPackaged = true;
    process.env.SRGNT_UPDATE_OWNER = 'myorg';
    process.env.SRGNT_UPDATE_REPO = 'myrepo';
    mockCheckForUpdates.mockResolvedValue({
      updateInfo: { version: '1.0.0' },
    });
    const result = await checkForUpdates('stable');
    expect(result.status).toBe('not-available');
    expect(result.version).toBe('1.0.0');
    expect(result.message).toContain('No update');
  });
});
