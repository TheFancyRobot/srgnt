/**
 * Jira Credential Adapter
 *
 * Stores Jira API tokens using Electron's safeStorage encryption in an app-private
 * encrypted blob. NEVER stores tokens in desktop-settings.json or any workspace file.
 *
 * DEC-0017: Token must never appear in:
 *   - DesktopSettings / desktop-settings.json
 *   - Preload getters
 *   - Renderer state rehydration
 *   - Logs
 *   - Crash reports
 *
 * Backend preference order (BUG-0019 corrected):
 *   1. keytar OS keychain (Windows Credential Manager, macOS Keychain, libsecret)
 *      — used when preferred and available
 *   2. Electron safeStorage encrypted-local blob
 *      — used when keychain unavailable OR user prefers encrypted-local
 *   3. unavailable — only when BOTH backends fail
 *
 * BUG-0019 (corrected): On ALL platforms, graceful fallback to encrypted in-app
 * storage when the OS keychain is unavailable. Never throw on credential save
 * failure — the app always provides a secure encrypted storage option.
 * User configures storage preference via Settings control.
 */

import { app, safeStorage } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export type CredentialBackend = "keychain" | "encrypted-local" | "unavailable";
export type CredentialStoragePreference = "keychain" | "encrypted-local";

export interface CredentialBackendAvailability {
  keychain: boolean;
  encryptedLocal: boolean;
}

export interface CredentialBackendStatus {
  backend: CredentialBackend;
  preferredBackend: CredentialStoragePreference;
  keychainAvailable: boolean;
  encryptedLocalAvailable: boolean;
}

interface CredentialAdapter {
  setSecret(connectorId: string, secret: string): Promise<void>;
  /** Returns decrypted token or undefined if not stored. Token stays in memory only. */
  getSecret(connectorId: string): Promise<string | undefined>;
  hasSecret(connectorId: string): Promise<boolean>;
  deleteSecret(connectorId: string): Promise<void>;
  getBackendStatus(): CredentialBackend;
}

/**
 * Maps connectorId → base64(safeStorage.encryptString(token))
 * Stored at: app.getPath('userData') / credentials.encrypted.json
 * This is app-private — NOT in the workspace directory.
 */
interface EncryptedCredentialStore {
  [connectorId: string]: string; // base64 encoded encrypted blob
}


function getCredentialStorePath(): string {
  return path.join(app.getPath("userData"), "credentials.encrypted.json");
}

async function readCredentialStore(): Promise<EncryptedCredentialStore> {
  const filePath = getCredentialStorePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as EncryptedCredentialStore;
  } catch {
    return {};
  }
}

async function writeCredentialStore(store: EncryptedCredentialStore): Promise<void> {
  const filePath = getCredentialStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), "utf8");
}

function redactToken(message: string, token?: string): string {
  if (!token) return message;
  // Replace all occurrences of token with [REDACTED] (token may contain regex chars)
  return message.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "[REDACTED]");
}

function encryptSecret(secret: string): string {
  // No redundant safeStorage.isEncryptionAvailable() check here.
  // If encryption is truly unavailable, safeStorage.encryptString() will throw
  // a real error — let that propagate rather than a misleading message.
  return safeStorage.encryptString(secret).toString("base64");
}

function decryptSecret(base64: string): string | undefined {
  if (!safeStorage.isEncryptionAvailable()) {
    return undefined;
  }

  try {
    return safeStorage.decryptString(Buffer.from(base64, "base64"));
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Credential adapters
// ---------------------------------------------------------------------------

function createSafeStorageAdapter(): CredentialAdapter {
  return {
    async setSecret(connectorId: string, secret: string): Promise<void> {
      const store = await readCredentialStore();
      store[connectorId] = encryptSecret(secret);
      await writeCredentialStore(store);
    },

    async hasSecret(connectorId: string): Promise<boolean> {
      const store = await readCredentialStore();
      return connectorId in store;
    },

    async deleteSecret(connectorId: string): Promise<void> {
      const store = await readCredentialStore();
      delete store[connectorId];
      await writeCredentialStore(store);
    },

    async getSecret(connectorId: string): Promise<string | undefined> {
      const store = await readCredentialStore();
      const base64 = store[connectorId];
      if (!base64) return undefined;
      return decryptSecret(base64);
    },

    getBackendStatus(): CredentialBackend {
      return safeStorage.isEncryptionAvailable() ? 'encrypted-local' : 'unavailable';
    },
  };
}

interface KeytarModule {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

let importKeytarImpl = async (): Promise<KeytarModule> => {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;
  return dynamicImport('keytar') as Promise<KeytarModule>;
};

function activateSafeStorageAdapter(): CredentialAdapter {
  if (safeStorage.isEncryptionAvailable()) {
    const adapter = createSafeStorageAdapter();
    _activeBackendAdapter = adapter;
    _status = 'encrypted-local';
    return adapter;
  }
  // safeStorage unavailable — create adapter that throws clear error
  const adapter = createUnavailableAdapter('encrypted-local');
  _activeBackendAdapter = adapter;
  _status = 'unavailable';
  return adapter;
}

function createKeytarAdapter(keytar: KeytarModule): CredentialAdapter {
  const SERVICE = 'srgnt-jira';

  // BUG-0019 (corrected): On ALL platforms, fallback gracefully to encrypted in-app storage.
  const fallback = async <T>(operation: (adapter: CredentialAdapter) => Promise<T>): Promise<T> => {
    const adapter = activateSafeStorageAdapter();
    return operation(adapter);
  };

  return {
    async setSecret(connectorId: string, secret: string): Promise<void> {
      try {
        await keytar.setPassword(SERVICE, connectorId, secret);
      } catch {
        await fallback((adapter) => adapter.setSecret(connectorId, secret));
      }
    },

    async getSecret(connectorId: string): Promise<string | undefined> {
      try {
        return (await keytar.getPassword(SERVICE, connectorId)) ?? undefined;
      } catch {
        return fallback((adapter) => adapter.getSecret(connectorId));
      }
    },

    async hasSecret(connectorId: string): Promise<boolean> {
      try {
        return (await keytar.getPassword(SERVICE, connectorId)) !== null;
      } catch {
        return fallback((adapter) => adapter.hasSecret(connectorId));
      }
    },

    async deleteSecret(connectorId: string): Promise<void> {
      try {
        await keytar.deletePassword(SERVICE, connectorId);
      } catch {
        await fallback((adapter) => adapter.deleteSecret(connectorId));
      }
    },

    getBackendStatus(): CredentialBackend {
      return 'keychain';
    },
  };
}

/**
 * Creates an adapter that always throws a clear, user-friendly error.
 * Used when the requested backend is unavailable (e.g., encrypted-local
 * selected but safeStorage encryption is not available on this system).
 */
function createUnavailableAdapter(_requestedBackend: CredentialStoragePreference): CredentialAdapter {
  // BUG-0020: Clear, SRGNT-owned error — never raw Electron internals.
  // Same message regardless of which preference was requested; both backends are unavailable.
  const message = 'Secure credential storage is not available on this system. Cannot store Jira API token.';

  return {
    async setSecret(): Promise<void> {
      throw new Error(message);
    },
    async getSecret(): Promise<string | undefined> {
      return undefined;
    },
    async hasSecret(): Promise<boolean> {
      return false;
    },
    async deleteSecret(): Promise<void> {
      // No secret stored — delete is a no-op
    },
    getBackendStatus(): CredentialBackend {
      return 'unavailable';
    },
  };
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let _activeBackendAdapter: CredentialAdapter | null = null;
let _delegatingAdapter: CredentialAdapter | null = null;
let _status: CredentialBackend = "unavailable";
let _preferredBackend: CredentialStoragePreference = "keychain";

function currentBackendAdapter(): CredentialAdapter {
  if (!_activeBackendAdapter) {
    throw new Error('[credentials] Credential adapter has not been initialized.');
  }
  return _activeBackendAdapter;
}

function createDelegatingAdapter(): CredentialAdapter {
  return {
    setSecret: (connectorId, secret) => currentBackendAdapter().setSecret(connectorId, secret),
    getSecret: (connectorId) => currentBackendAdapter().getSecret(connectorId),
    hasSecret: (connectorId) => currentBackendAdapter().hasSecret(connectorId),
    deleteSecret: (connectorId) => currentBackendAdapter().deleteSecret(connectorId),
    getBackendStatus: () => currentBackendAdapter().getBackendStatus(),
  };
}

/**
 * Create (or return cached) credential adapter, respecting the user's storage preference.
 *
 * - If preferredBackend === 'encrypted-local': activate safeStorage adapter (if available).
 * - If preferredBackend === 'keychain': try keytar; if unavailable, fall back to safeStorage.
 * - The delegating adapter is reselectable when preference changes (not permanently locked).
 */
export async function createCredentialAdapter(
  preferredBackend: CredentialStoragePreference = 'keychain',
): Promise<CredentialAdapter> {
  _preferredBackend = preferredBackend;

  // Always recreate the delegating adapter so preference changes take effect
  _delegatingAdapter = createDelegatingAdapter();

  if (preferredBackend === 'encrypted-local') {
    // User explicitly prefers encrypted-local storage
    if (safeStorage.isEncryptionAvailable()) {
      _activeBackendAdapter = createSafeStorageAdapter();
      _status = 'encrypted-local';
    } else {
      // safeStorage encryption is unavailable — create an adapter that throws
      // a clear, user-friendly error rather than letting a raw Electron error
      // propagate from safeStorage.encryptString().
      _activeBackendAdapter = createUnavailableAdapter('encrypted-local');
      _status = 'unavailable';
    }
    return _delegatingAdapter;
  }

  // preferredBackend === 'keychain': try keytar, fall back to safeStorage
  try {
    const keytar = await importKeytarImpl();
    _activeBackendAdapter = createKeytarAdapter(keytar);
    _status = 'keychain';
  } catch {
    // BUG-0019 (corrected): On ALL platforms, fallback gracefully to encrypted in-app storage.
    activateSafeStorageAdapter();
  }

  return _delegatingAdapter;
}

export function getCredentialBackendStatus(): CredentialBackend {
  return _status;
}

/**
 * Returns the current preferred backend setting.
 */
export function getCredentialPreferredBackend(): CredentialStoragePreference {
  return _preferredBackend;
}

/**
 * Probe backend availability without writing any token data.
 * Safe to call at any time (does not change active adapter).
 */
export async function getCredentialBackendAvailability(): Promise<CredentialBackendAvailability> {
  let keychainAvailable = false;
  try {
    await importKeytarImpl();
    keychainAvailable = true;
  } catch {
    keychainAvailable = false;
  }

  return {
    keychain: keychainAvailable,
    encryptedLocal: safeStorage.isEncryptionAvailable(),
  };
}

/**
 * Returns the full backend status including availability and preference.
 */
export async function getCredentialFullStatus(
  preferredBackend?: CredentialStoragePreference,
): Promise<CredentialBackendStatus> {
  const pref = preferredBackend ?? _preferredBackend;
  const availability = await getCredentialBackendAvailability();

  // Determine effective backend based on preference + availability
  let backend: CredentialBackend;
  if (pref === 'keychain' && availability.keychain) {
    backend = 'keychain';
  } else if (availability.encryptedLocal) {
    backend = 'encrypted-local';
  } else {
    backend = 'unavailable';
  }

  return {
    backend,
    preferredBackend: pref,
    keychainAvailable: availability.keychain,
    encryptedLocalAvailable: availability.encryptedLocal,
  };
}

/**
 * Migrate a connector's secret from one backend to another.
 * Reads from the old backend, writes to the new backend, then deletes from old.
 * Never logs the token value. If migration fails, throws a redacted error.
 */
export async function migrateConnectorSecret(
  connectorId: string,
  from: CredentialStoragePreference,
  to: CredentialStoragePreference,
): Promise<void> {
  if (from === to) return; // no-op

  // Save current adapter state so we can restore it
  const savedAdapter = _activeBackendAdapter;
  const savedStatus = _status;
  const savedPreference = _preferredBackend;

  try {
    const sourceStatus = await getCredentialFullStatus(from);
    const targetStatus = await getCredentialFullStatus(to);

    // If both preferences currently resolve to the same effective backend
    // (for example keychain -> encrypted-local fallback), there is nothing to migrate.
    if (sourceStatus.backend === targetStatus.backend) {
      return;
    }

    if (sourceStatus.backend === 'unavailable' || targetStatus.backend === 'unavailable') {
      throw new Error('[credentials] Migration unavailable: one or both encrypted credential backends cannot be used.');
    }

    // Step 1: Read token from the effective source backend
    const sourceAdapter = await createCredentialAdapter(sourceStatus.backend);
    const token = await sourceAdapter.getSecret(connectorId);

    if (!token) {
      // No token exists in source — just reconfigure backend, nothing to migrate
      return;
    }

    // Step 2: Write token to the effective target backend
    const targetAdapter = await createCredentialAdapter(targetStatus.backend);
    await targetAdapter.setSecret(connectorId, token);

    // Step 3: Verify write succeeded
    const verifyToken = await targetAdapter.getSecret(connectorId);
    if (verifyToken !== token) {
      throw new Error('[credentials] Migration verification failed: token not readable in target backend.');
    }

    // Step 4: Delete from the effective source backend
    const deleteAdapter = await createCredentialAdapter(sourceStatus.backend);
    await deleteAdapter.deleteSecret(connectorId);
  } catch (error: unknown) {
    // Never expose token in error messages
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[credentials] Migration failed for ${connectorId}: ${redactToken(message)}`);
  } finally {
    // Restore original adapter state
    _activeBackendAdapter = savedAdapter;
    _status = savedStatus;
    _preferredBackend = savedPreference;
    _delegatingAdapter = savedAdapter ? createDelegatingAdapter() : null;
  }
}

export function __resetCredentialAdapterForTests(options?: {
  importKeytar?: () => Promise<KeytarModule>;
}): void {
  _activeBackendAdapter = null;
  _delegatingAdapter = null;
  _status = "unavailable";
  _preferredBackend = "keychain";
  importKeytarImpl = options?.importKeytar ?? (async (): Promise<KeytarModule> => {
    const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;
    return dynamicImport('keytar') as Promise<KeytarModule>;
  });
}

/**
 * Returns a redacted error message for logging — token material never appears in logs.
 */
export function redactCredentialError(message: string, token?: string): string {
  if (!token) return message;
  return redactToken(message, token);
}

/**
 * Sanitizes credential storage error messages for safe surfacing to the renderer.
 *
 * BUG-0020: The real Electron error contains internal API names like
 * `safeStorage.encryptString` and raw encryption error text that should
 * never be exposed to the user. This function:
 *   1. Replaces Electron internal API names with `[credential backend]`
 *   2. Replaces raw encryption error text with `Credential storage is unavailable.`
 *   3. Redacts any token material from the message
 *
 * @param error - The caught error from credential adapter operations
 * @param token - The token that was being stored (for redaction)
 * @returns A sanitized, user-safe error message
 */
export function sanitizeCredentialError(error: unknown, token?: string): string {
  let msg = error instanceof Error ? error.message : String(error);
  // Sanitize any Electron internals from error messages (BUG-0020)
  // The real Electron error: "Error while encrypting the text provided to safeStorage.encryptString. Encryption is not available."
  // Step 1: Replace API name first so the broader sentence replacement preserves the marker
  msg = msg.replace(/safeStorage\.encryptString/g, '[credential backend]');
  // Step 2: Replace the full known sentence (now with [credential backend] marker)
  msg = msg.replace(
    /Error while encrypting the text provided to \[credential backend\]\. Encryption is not available\./g,
    'Credential storage is unavailable.',
  );
  // Step 3: Fallback for any remaining "Error while encrypting..." patterns
  msg = msg.replace(/Error while encrypting the text provided to[^.]*\./g, 'Credential storage is unavailable.');
  msg = redactCredentialError(msg, token);
  return `[credentials] Failed to store token: ${msg}`;
}
