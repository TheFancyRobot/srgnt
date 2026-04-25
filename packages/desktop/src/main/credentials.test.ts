/**
 * Credential Adapter Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const electronMock = vi.hoisted(() => ({
  userDataPath: '',
  homePath: '',
  safeStorageAvailable: true,
  encryptedPrefix: 'safe:',
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return electronMock.userDataPath;
      if (name === 'home') return electronMock.homePath;
      return electronMock.userDataPath;
    }),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => electronMock.safeStorageAvailable),
    encryptString: vi.fn((secret: string) => Buffer.from(`${electronMock.encryptedPrefix}${secret}`, 'utf8')),
    decryptString: vi.fn((encrypted: Buffer) => encrypted.toString('utf8').replace(electronMock.encryptedPrefix, '')),
  },
}));

vi.mock('electron', () => ({
  app: electronMock.app,
  safeStorage: electronMock.safeStorage,
}));

import {
  __resetCredentialAdapterForTests,
  createCredentialAdapter,
  getCredentialBackendStatus,
  redactCredentialError,
} from './credentials.js';

async function readStore(): Promise<Record<string, string>> {
  const raw = await fs.readFile(path.join(electronMock.userDataPath, 'credentials.encrypted.json'), 'utf8');
  return JSON.parse(raw) as Record<string, string>;
}

describe('redactCredentialError', () => {
  it('returns message unchanged when no token provided', () => {
    const msg = 'Failed to store token: something went wrong';
    expect(redactCredentialError(msg)).toBe(msg);
    expect(redactCredentialError(msg, undefined)).toBe(msg);
  });

  it('redacts token from error message', () => {
    const token = 'abc123xyz';
    const msg = 'Failed to store token for jira: auth failed with abc123xyz';
    const redacted = redactCredentialError(msg, token);
    expect(redacted).not.toContain(token);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).toContain('Failed to store token');
  });

  it('redacts token with special regex characters', () => {
    const token = 'abc+123*xyz?';
    const msg = `token error: ${token}`;
    const redacted = redactCredentialError(msg, token);
    expect(redacted).not.toContain(token);
    expect(redacted).toContain('[REDACTED]');
  });

  it('redacts multiple occurrences of same token', () => {
    const token = 'my-secret-token';
    const msg = `error: ${token} repeated: ${token}`;
    const redacted = redactCredentialError(msg, token);
    expect(redacted).not.toContain(token);
    expect((redacted.match(/\[REDACTED\]/g) || []).length).toBe(2);
  });
});

describe('CredentialAdapter backend selection', () => {
  beforeEach(async () => {
    electronMock.userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-credentials-test-'));
    electronMock.homePath = path.join(electronMock.userDataPath, 'home');
    electronMock.safeStorageAvailable = true;
    vi.clearAllMocks();
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });
  });

  afterEach(async () => {
    await fs.rm(electronMock.userDataPath, { recursive: true, force: true });
    __resetCredentialAdapterForTests();
  });

  it('round-trips setSecret/getSecret using mocked keytar and reports keychain backend', async () => {
    const keytarStore = new Map<string, string>();
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword: vi.fn(async (_service: string, account: string, password: string) => {
          keytarStore.set(account, password);
        }),
        getPassword: vi.fn(async (_service: string, account: string) => keytarStore.get(account) ?? null),
        deletePassword: vi.fn(async (_service: string, account: string) => keytarStore.delete(account)),
      }),
    });

    const adapter = await createCredentialAdapter();
    await adapter.setSecret('jira', 'jira-token');

    expect(await adapter.getSecret('jira')).toBe('jira-token');
    expect(await adapter.hasSecret('jira')).toBe(true);
    expect(adapter.getBackendStatus()).toBe('keychain');
    expect(getCredentialBackendStatus()).toBe('keychain');
    await expect(fs.access(path.join(electronMock.userDataPath, 'credentials.encrypted.json'))).rejects.toThrow();
  });

  it('falls back to safeStorage when keytar setSecret throws at runtime', async () => {
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword: vi.fn(async () => {
          throw new Error('libsecret unavailable');
        }),
        getPassword: vi.fn(async () => null),
        deletePassword: vi.fn(async () => false),
      }),
    });

    const adapter = await createCredentialAdapter();
    await adapter.setSecret('jira', 'fallback-token');

    expect(getCredentialBackendStatus()).toBe('encrypted-local');
    const store = await readStore();
    expect(store.jira).toBe(Buffer.from('safe:fallback-token', 'utf8').toString('base64'));
    expect(store.jira).not.toContain('fallback-token');
    const activeAdapter = await createCredentialAdapter();
    expect(activeAdapter.getBackendStatus()).toBe('encrypted-local');
    expect(await activeAdapter.getSecret('jira')).toBe('fallback-token');
  });

  it('same cached adapter reference delegates to safeStorage after runtime fallback', async () => {
    const getPassword = vi.fn(async () => null);
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword: vi.fn(async () => {
          throw new Error('runtime keychain failure');
        }),
        getPassword,
        deletePassword: vi.fn(async () => false),
      }),
    });

    const adapter = await createCredentialAdapter();
    expect(adapter.getBackendStatus()).toBe('keychain');

    await adapter.setSecret('jira', 'delegated-token');

    expect(adapter.getBackendStatus()).toBe('encrypted-local');
    expect(getCredentialBackendStatus()).toBe('encrypted-local');
    expect(await adapter.getSecret('jira')).toBe('delegated-token');
    expect(await adapter.hasSecret('jira')).toBe(true);
    expect(getPassword).not.toHaveBeenCalled();
  });

  it('reports unavailable and throws a clear error when keytar fails and safeStorage is unavailable', async () => {
    electronMock.safeStorageAvailable = false;
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });

    const adapter = await createCredentialAdapter();

    expect(adapter.getBackendStatus()).toBe('unavailable');
    expect(getCredentialBackendStatus()).toBe('unavailable');
    await expect(adapter.setSecret('jira', 'token')).rejects.toThrow(/No non-plaintext credential backend is available/);
  });

  it('uses safeStorage encrypted-local backend when keytar cannot be imported', async () => {
    const adapter = await createCredentialAdapter();
    await adapter.setSecret('jira', 'safe-token');

    expect(adapter.getBackendStatus()).toBe('encrypted-local');
    expect(getCredentialBackendStatus()).toBe('encrypted-local');
    expect(await adapter.getSecret('jira')).toBe('safe-token');
  });
});
