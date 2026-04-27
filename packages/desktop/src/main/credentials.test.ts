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
    encryptString: vi.fn((secret: string) => {
      if (!electronMock.safeStorageAvailable) {
        throw new Error(
          'Error while encrypting the text provided to safeStorage.encryptString. Encryption is not available.',
        );
      }
      return Buffer.from(`${electronMock.encryptedPrefix}${secret}`, 'utf8');
    }),
    decryptString: vi.fn((encrypted: Buffer) => encrypted.toString('utf8').replace(electronMock.encryptedPrefix, '')),
  },
}));

const originalPlatform = process.platform;

function setProcessPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', {
    configurable: true,
    value: platform,
  });
}

vi.mock('electron', () => ({
  app: electronMock.app,
  safeStorage: electronMock.safeStorage,
}));

import {
  __resetCredentialAdapterForTests,
  createCredentialAdapter,
  getCredentialBackendStatus,
  getCredentialPreferredBackend,
  getCredentialBackendAvailability,
  getCredentialFullStatus,
  migrateConnectorSecret,
  redactCredentialError,
  sanitizeCredentialError,
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
    setProcessPlatform('darwin');
    vi.clearAllMocks();
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });
  });

  afterEach(async () => {
    setProcessPlatform(originalPlatform);
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

    const adapter = await createCredentialAdapter('keychain');
    await adapter.setSecret('jira', 'jira-token');

    expect(await adapter.getSecret('jira')).toBe('jira-token');
    expect(await adapter.hasSecret('jira')).toBe(true);
    expect(adapter.getBackendStatus()).toBe('keychain');
    expect(getCredentialBackendStatus()).toBe('keychain');
    await expect(fs.access(path.join(electronMock.userDataPath, 'credentials.encrypted.json'))).rejects.toThrow();
  });

  it('falls back to safeStorage when keytar setSecret throws at runtime (all OSes)', async () => {
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword: vi.fn(async () => {
          throw new Error('libsecret unavailable');
        }),
        getPassword: vi.fn(async () => null),
        deletePassword: vi.fn(async () => false),
      }),
    });

    const adapter = await createCredentialAdapter('keychain');
    await adapter.setSecret('jira', 'fallback-token');

    // After runtime fallback, the same adapter instance reports encrypted-local
    expect(getCredentialBackendStatus()).toBe('encrypted-local');
    expect(adapter.getBackendStatus()).toBe('encrypted-local');
    const store = await readStore();
    expect(store.jira).toBe(Buffer.from('safe:fallback-token', 'utf8').toString('base64'));
    expect(store.jira).not.toContain('fallback-token');
    expect(await adapter.getSecret('jira')).toBe('fallback-token');
  });

  it('same cached adapter reference delegates to safeStorage after runtime fallback (all OSes)', async () => {
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

    const adapter = await createCredentialAdapter('keychain');
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

    const adapter = await createCredentialAdapter('keychain');

    expect(adapter.getBackendStatus()).toBe('unavailable');
    expect(getCredentialBackendStatus()).toBe('unavailable');
    // BUG-0020: Unavailable adapter throws clear, SRGNT-owned error
    await expect(adapter.setSecret('jira', 'token')).rejects.toThrow(/Secure credential storage is not available on this system/);
    // hasSecret returns false — no secret can be stored
    expect(await adapter.hasSecret('jira')).toBe(false);
    // getSecret returns undefined (no stored secret)
    expect(await adapter.getSecret('jira')).toBeUndefined();
    // deleteSecret is a no-op (no stored secret to delete)
    await expect(adapter.deleteSecret('jira')).resolves.toBeUndefined();
  });

  it('uses safeStorage encrypted-local backend when keytar cannot be imported (all OSes)', async () => {
    const adapter = await createCredentialAdapter('keychain');
    await adapter.setSecret('jira', 'safe-token');

    expect(adapter.getBackendStatus()).toBe('encrypted-local');
    expect(getCredentialBackendStatus()).toBe('encrypted-local');
    expect(await adapter.getSecret('jira')).toBe('safe-token');
  });

  // BUG-0019 (corrected): Linux no longer throws — graceful fallback like all OSes
  it('falls back to safeStorage on Linux when keytar cannot be imported (no throw)', async () => {
    setProcessPlatform('linux');
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });

    const adapter = await createCredentialAdapter('keychain');
    // No throw — graceful fallback
    await adapter.setSecret('jira', 'linux-safe-token');
    expect(adapter.getBackendStatus()).toBe('encrypted-local');
    expect(getCredentialBackendStatus()).toBe('encrypted-local');
    expect(await adapter.getSecret('jira')).toBe('linux-safe-token');
  });

  // BUG-0019 (corrected): Linux runtime failures also fallback gracefully
  it('falls back to safeStorage on Linux when keytar operations fail at runtime (no throw)', async () => {
    setProcessPlatform('linux');
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword: vi.fn(async () => {
          throw new Error('libsecret runtime failure');
        }),
        getPassword: vi.fn(async () => null),
        deletePassword: vi.fn(async () => false),
      }),
    });

    const adapter = await createCredentialAdapter('keychain');
    // No throw — graceful fallback
    await adapter.setSecret('jira', 'linux-runtime-fallback-token');
    expect(adapter.getBackendStatus()).toBe('encrypted-local');
    expect(getCredentialBackendStatus()).toBe('encrypted-local');
    expect(await adapter.getSecret('jira')).toBe('linux-runtime-fallback-token');
  });
});

describe('CredentialAdapter preference-aware selection', () => {
  beforeEach(async () => {
    electronMock.userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-credentials-test-'));
    electronMock.homePath = path.join(electronMock.userDataPath, 'home');
    electronMock.safeStorageAvailable = true;
    setProcessPlatform('darwin');
    vi.clearAllMocks();
  });

  afterEach(async () => {
    setProcessPlatform(originalPlatform);
    await fs.rm(electronMock.userDataPath, { recursive: true, force: true });
    __resetCredentialAdapterForTests();
  });

  it('explicit encrypted-local preference: uses safeStorage even when keytar is available', async () => {
    const keytarStore = new Map<string, string>();
    const setPassword = vi.fn(async (_service: string, account: string, password: string) => {
      keytarStore.set(account, password);
    });
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword,
        getPassword: vi.fn(async (_service: string, account: string) => keytarStore.get(account) ?? null),
        deletePassword: vi.fn(async (_service: string, account: string) => keytarStore.delete(account)),
      }),
    });

    const adapter = await createCredentialAdapter('encrypted-local');
    await adapter.setSecret('jira', 'encrypted-pref-token');

    // Keytar should NOT have been called
    expect(setPassword).not.toHaveBeenCalled();
    // Backend should be encrypted-local
    expect(adapter.getBackendStatus()).toBe('encrypted-local');
    expect(getCredentialBackendStatus()).toBe('encrypted-local');
    // Token stored in encrypted file, not plaintext
    const store = await readStore();
    expect(store.jira).not.toContain('encrypted-pref-token');
    // Token is readable
    expect(await adapter.getSecret('jira')).toBe('encrypted-pref-token');
  });

  it('default keychain preference: uses keytar when available', async () => {
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

    const adapter = await createCredentialAdapter('keychain');
    expect(adapter.getBackendStatus()).toBe('keychain');
    expect(getCredentialBackendStatus()).toBe('keychain');
    expect(getCredentialPreferredBackend()).toBe('keychain');
  });

  it('keychain unavailable fallback all OS: falls back to encrypted-local when keytar import fails', async () => {
    setProcessPlatform('linux');
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });

    const adapter = await createCredentialAdapter('keychain');
    await adapter.setSecret('jira', 'fallback-token');
    await adapter.getSecret('jira');

    expect(adapter.getBackendStatus()).toBe('encrypted-local');
    expect(getCredentialBackendStatus()).toBe('encrypted-local');
    // No throw — graceful fallback
  });

  it('encrypted-local preference with safeStorage unavailable: encryptString is NOT called', async () => {
    electronMock.safeStorageAvailable = false;
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });

    const adapter = await createCredentialAdapter('encrypted-local');
    try {
      await adapter.setSecret('jira', 'token');
    } catch {
      // Expected to throw
    }

    // encryptString should never have been called — the unavailable adapter
    // pre-fails without attempting encryption
    expect(electronMock.safeStorage.encryptString).not.toHaveBeenCalled();
  });

  it('encrypted-local preference with safeStorage available: setSecret succeeds', async () => {
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });

    const adapter = await createCredentialAdapter('encrypted-local');
    await adapter.setSecret('jira', 'encrypted-local-happy-token');

    expect(adapter.getBackendStatus()).toBe('encrypted-local');
    expect(await adapter.getSecret('jira')).toBe('encrypted-local-happy-token');
    expect(await adapter.hasSecret('jira')).toBe(true);
  });

  it('encrypted-local preference with safeStorage unavailable: throws clear user-friendly error', async () => {
    electronMock.safeStorageAvailable = false;
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });

    const adapter = await createCredentialAdapter('encrypted-local');
    expect(adapter.getBackendStatus()).toBe('unavailable');

    // BUG-0020: Unavailable adapter throws clear, SRGNT-owned error
    await expect(adapter.setSecret('jira', 'some-token')).rejects.toThrow(
      /Secure credential storage is not available on this system/,
    );
    // Must NOT mention Electron internals
    await expect(adapter.setSecret('jira', 'some-token')).rejects.not.toThrow(/encryptString/);
    await expect(adapter.setSecret('jira', 'some-token')).rejects.not.toThrow(/Error while encrypting/);
    // hasSecret returns false — no secret can be stored
    expect(await adapter.hasSecret('jira')).toBe(false);
    // getSecret returns undefined (no stored secret)
    expect(await adapter.getSecret('jira')).toBeUndefined();
    // deleteSecret is a no-op
    await expect(adapter.deleteSecret('jira')).resolves.toBeUndefined();
  });
});

describe('getCredentialBackendAvailability', () => {
  beforeEach(() => {
    electronMock.safeStorageAvailable = true;
    vi.clearAllMocks();
  });

  afterEach(() => {
    __resetCredentialAdapterForTests();
  });

  it('returns keychain=true, encryptedLocal=true when both available', async () => {
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword: vi.fn(),
        getPassword: vi.fn(),
        deletePassword: vi.fn(),
      }),
    });

    const availability = await getCredentialBackendAvailability();
    expect(availability.keychain).toBe(true);
    expect(availability.encryptedLocal).toBe(true);
  });

  it('returns keychain=false, encryptedLocal=true when keytar fails', async () => {
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });

    const availability = await getCredentialBackendAvailability();
    expect(availability.keychain).toBe(false);
    expect(availability.encryptedLocal).toBe(true);
  });

  it('returns keychain=false, encryptedLocal=false when both fail', async () => {
    electronMock.safeStorageAvailable = false;
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });

    const availability = await getCredentialBackendAvailability();
    expect(availability.keychain).toBe(false);
    expect(availability.encryptedLocal).toBe(false);
  });
});

describe('getCredentialFullStatus', () => {
  beforeEach(() => {
    electronMock.safeStorageAvailable = true;
    vi.clearAllMocks();
  });

  afterEach(() => {
    __resetCredentialAdapterForTests();
  });

  it('returns keychain backend when preferred and available', async () => {
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword: vi.fn(),
        getPassword: vi.fn(),
        deletePassword: vi.fn(),
      }),
    });

    const status = await getCredentialFullStatus('keychain');
    expect(status.backend).toBe('keychain');
    expect(status.preferredBackend).toBe('keychain');
    expect(status.keychainAvailable).toBe(true);
    expect(status.encryptedLocalAvailable).toBe(true);
  });

  it('returns encrypted-local backend when keychain preferred but unavailable', async () => {
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });

    const status = await getCredentialFullStatus('keychain');
    expect(status.backend).toBe('encrypted-local');
    expect(status.preferredBackend).toBe('keychain');
    expect(status.keychainAvailable).toBe(false);
    expect(status.encryptedLocalAvailable).toBe(true);
  });

  it('returns encrypted-local backend when explicitly preferred', async () => {
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword: vi.fn(),
        getPassword: vi.fn(),
        deletePassword: vi.fn(),
      }),
    });

    const status = await getCredentialFullStatus('encrypted-local');
    expect(status.backend).toBe('encrypted-local');
    expect(status.preferredBackend).toBe('encrypted-local');
    expect(status.keychainAvailable).toBe(true);
    expect(status.encryptedLocalAvailable).toBe(true);
  });
});

describe('migrateConnectorSecret', () => {
  beforeEach(async () => {
    electronMock.userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-credentials-test-'));
    electronMock.homePath = path.join(electronMock.userDataPath, 'home');
    electronMock.safeStorageAvailable = true;
    setProcessPlatform('darwin');
    vi.clearAllMocks();
  });

  afterEach(async () => {
    setProcessPlatform(originalPlatform);
    await fs.rm(electronMock.userDataPath, { recursive: true, force: true });
    __resetCredentialAdapterForTests();
  });

  it('migrates token from keychain to encrypted-local', async () => {
    const keytarStore = new Map<string, string>();
    const deletePassword = vi.fn(async (_service: string, account: string) => keytarStore.delete(account));
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword: vi.fn(async (_service: string, account: string, password: string) => {
          keytarStore.set(account, password);
        }),
        getPassword: vi.fn(async (_service: string, account: string) => keytarStore.get(account) ?? null),
        deletePassword,
      }),
    });

    // Save token under keychain
    const sourceAdapter = await createCredentialAdapter('keychain');
    await sourceAdapter.setSecret('jira', 'migration-token');
    expect(keytarStore.get('jira')).toBe('migration-token');

    // Migrate to encrypted-local
    await migrateConnectorSecret('jira', 'keychain', 'encrypted-local');

    // Verify token readable under encrypted-local
    const targetAdapter = await createCredentialAdapter('encrypted-local');
    expect(await targetAdapter.getSecret('jira')).toBe('migration-token');

    // Verify old keychain entry was deleted
    expect(deletePassword).toHaveBeenCalled();

    // Verify no plaintext in encrypted store
    const store = await readStore();
    expect(store.jira).not.toContain('migration-token');
  });

  it('is a no-op when from and to are the same', async () => {
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword: vi.fn(),
        getPassword: vi.fn(),
        deletePassword: vi.fn(),
      }),
    });

    // Should not throw
    await expect(migrateConnectorSecret('jira', 'keychain', 'keychain')).resolves.toBeUndefined();
  });

  it('is a no-op when no token exists in source backend', async () => {
    __resetCredentialAdapterForTests({
      importKeytar: async () => ({
        setPassword: vi.fn(),
        getPassword: vi.fn(async () => null),
        deletePassword: vi.fn(),
      }),
    });

    // Should not throw
    await expect(migrateConnectorSecret('jira', 'keychain', 'encrypted-local')).resolves.toBeUndefined();
  });

  it('does not delete the token when source and target preferences resolve to the same effective backend', async () => {
    setProcessPlatform('linux');
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });

    const adapter = await createCredentialAdapter('keychain');
    await adapter.setSecret('jira', 'fallback-preserved-token');
    expect(await adapter.getSecret('jira')).toBe('fallback-preserved-token');

    await expect(migrateConnectorSecret('jira', 'keychain', 'encrypted-local')).resolves.toBeUndefined();

    const stillStored = await createCredentialAdapter('encrypted-local');
    expect(await stillStored.getSecret('jira')).toBe('fallback-preserved-token');
  });
});

describe('sanitizeCredentialError — BUG-0020 IPC regression (supplementary)', () => {
  // These tests supplement the main sanitizeCredentialError (BUG-0020 regression) block below.
  // Focus on assertions not covered there.

  it('prefixes with [credentials] Failed to store token:', () => {
    const result = sanitizeCredentialError(new Error('some error'), 'my-token');
    expect(result).toMatch(/^\[credentials\] Failed to store token:/);
  });

  it('handles non-Error thrown values with token redaction', () => {
    const result = sanitizeCredentialError('some string error with api-secret-xyz', 'api-secret-xyz');
    // Token should be redacted from the string
    expect(result).not.toContain('api-secret-xyz');
    expect(result).toContain('[REDACTED]');
    expect(result).toContain('[credentials] Failed to store token:');
  });
});

describe('IPC handler end-to-end: connectorCredentialSet sanitization — BUG-0020', () => {
  beforeEach(async () => {
    electronMock.userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-credentials-test-'));
    electronMock.homePath = path.join(electronMock.userDataPath, 'home');
    electronMock.safeStorageAvailable = false;
    setProcessPlatform('linux');
    vi.clearAllMocks();
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });
  });

  afterEach(async () => {
    setProcessPlatform(originalPlatform);
    await fs.rm(electronMock.userDataPath, { recursive: true, force: true });
    __resetCredentialAdapterForTests();
  });

  it('unavailable adapter error is sanitized through sanitizeCredentialError (IPC path)', async () => {
    // Simulate the exact IPC handler path from index.ts:
    //   const adapter = await createCredentialAdapter(preference);
    //   try { await adapter.setSecret(raw.connectorId, raw.token); }
    //   catch (err) { throw new Error(sanitizeCredentialError(err, raw.token)); }
    const adapter = await createCredentialAdapter('encrypted-local');
    const token = 'my-secret-jira-token';

    let caughtError: Error | null = null;
    try {
      await adapter.setSecret('jira', token);
    } catch (err) {
      // This is exactly what the IPC handler does:
      caughtError = new Error(sanitizeCredentialError(err, token));
    }

    expect(caughtError).not.toBeNull();
    const message = caughtError!.message;

    // The user-facing error must NOT contain raw Electron internals
    expect(message).not.toContain('safeStorage.encryptString');
    expect(message).not.toContain('Error while encrypting');

    // The user-facing error must NOT contain the token
    expect(message).not.toContain(token);

    // Must contain clear, SRGNT-owned message
    expect(message).toContain('Secure credential storage is not available on this system');
    expect(message).toMatch(/^\[credentials\] Failed to store token:/);
  });

  it('keychain preference with both backends unavailable: error is sanitized through IPC path', async () => {
    // Same simulation but for keychain preference when both backends fail
    const adapter = await createCredentialAdapter('keychain');
    const token = 'another-secret-token';

    let caughtError: Error | null = null;
    try {
      await adapter.setSecret('jira', token);
    } catch (err) {
      caughtError = new Error(sanitizeCredentialError(err, token));
    }

    expect(caughtError).not.toBeNull();
    const message = caughtError!.message;

    // No raw Electron internals
    expect(message).not.toContain('safeStorage.encryptString');
    expect(message).not.toContain('Error while encrypting');

    // No token material
    expect(message).not.toContain(token);

    // Clear SRGNT-owned error
    expect(message).toContain('Secure credential storage is not available on this system');
  });

  it('raw Electron safeStorage error from adapter.setSecret is sanitized in IPC path', async () => {
    // Edge case: what if the adapter somehow produces the raw Electron error
    // (e.g., safeStorage was available at createCredentialAdapter time but
    // became unavailable at setSecret time)? Simulate by injecting the error.
    const token = 'edge-case-token';
    const rawElectronError = new Error(
      'Error while encrypting the text provided to safeStorage.encryptString. Encryption is not available.',
    );

    // Simulate the IPC handler's catch block directly
    const result = sanitizeCredentialError(rawElectronError, token);

    // No Electron internals in output
    expect(result).not.toContain('safeStorage.encryptString');
    expect(result).not.toContain('Error while encrypting');
    // No token material
    expect(result).not.toContain(token);
    // Full sentence replaced with user-friendly message
    expect(result).toContain('Credential storage is unavailable.');
    expect(result).toContain('[credentials] Failed to store token:');
  });
});

/**
 * BUG-0020 IPC regression tests: sanitizeCredentialError
 *
 * The user-reported bug surfaced: "Error while encrypting the text provided to
 * safeStorage.encryptString. Encryption is not available."
 *
 * These tests verify that the sanitization logic used by the connectorCredentialSet
 * IPC handler strips Electron internals and token material from errors before
 * they reach the renderer.
 */
describe('sanitizeCredentialError (BUG-0020 regression)', () => {
  it('strips safeStorage.encryptString from error messages', () => {
    const error = new Error('Error while encrypting the text provided to safeStorage.encryptString. Encryption is not available.');
    const result = sanitizeCredentialError(error);

    expect(result).not.toContain('safeStorage.encryptString');
    expect(result).not.toContain('safeStorage');
  });

  it('replaces raw encryption error text with user-friendly message', () => {
    const error = new Error('Error while encrypting the text provided to safeStorage.encryptString. Encryption is not available.');
    const result = sanitizeCredentialError(error);

    expect(result).not.toContain('Error while encrypting the text provided to');
    expect(result).toContain('Credential storage is unavailable.');
  });

  it('redacts token material from error messages', () => {
    const token = 'my-secret-jira-token-12345';
    const error = new Error(`Failed to store token: ${token}`);
    const result = sanitizeCredentialError(error, token);

    expect(result).not.toContain(token);
    expect(result).toContain('[REDACTED]');
  });

  it('handles the exact user-reported error string with token redaction', () => {
    const token = 'ATATT3xFfGF0TOKEn';
    const error = new Error('Error while encrypting the text provided to safeStorage.encryptString. Encryption is not available.');
    const result = sanitizeCredentialError(error, token);

    // Must NOT contain any Electron internals
    expect(result).not.toContain('safeStorage');
    expect(result).not.toContain('encryptString');
    expect(result).not.toContain('Error while encrypting');

    // Must NOT contain token material
    expect(result).not.toContain(token);

    // Must contain sanitized messages
    expect(result).toContain('Credential storage is unavailable.');
    expect(result).toContain('[credentials] Failed to store token:');
  });

  it('preserves non-Electron error messages with redaction', () => {
    const token = 'my-api-token';
    const error = new Error('keytar service failed unexpectedly');
    const result = sanitizeCredentialError(error, token);

    expect(result).toContain('keytar service failed unexpectedly');
    expect(result).not.toContain(token);
    expect(result).toContain('[credentials] Failed to store token:');
  });

  it('handles non-Error thrown values', () => {
    const result = sanitizeCredentialError('some string error', 'api-secret-xyz');

    expect(result).not.toContain('api-secret-xyz');
    expect(result).toContain('[credentials] Failed to store token:');
  });

  it('replaces safeStorage.encryptString when it appears without the broader sentence', () => {
    const error = new Error('safeStorage.encryptString threw an internal error');
    const result = sanitizeCredentialError(error);

    expect(result).not.toContain('safeStorage.encryptString');
    expect(result).toContain('[credential backend]');
  });
});
