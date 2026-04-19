/**
 * Sync engine interface - defines the contract for encrypted sync operations.
 * Local workspace is the authoritative store; remote is an encrypted replica.
 */

/**
 * Sync status states.
 */
export enum SyncStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Syncing = 'syncing',
  Conflicted = 'conflicted',
  Error = 'error',
}

/**
 * Sync payload containing encrypted content and metadata envelope.
 */
export interface SyncPayload {
  // Encrypted content blob (ciphertext)
  encryptedContent: string;
  // Initialization vector used for encryption
  iv: string;
  // Authentication tag (if applicable)
  tag?: string;
  // Key identifier for key rotation support
  keyId?: string;
  // Plaintext metadata envelope
  metadata: SyncMetadata;
  // Device that created this payload
  deviceId: string;
  // Sequence number for ordering
  sequence: number;
}

/**
 * Plaintext metadata for a sync payload.
 */
export interface SyncMetadata {
  // Unique identifier for the entity being synced
  entityId: string;
  // Entity type (e.g., 'markdown-file', 'run-history')
  entityType: string;
  // Last modified timestamp (ISO 8601)
  lastModified: string;
  // Content hash for integrity verification
  contentHash: string;
  // Classification level
  classification: 'public' | 'internal' | 'confidential' | 'secret';
  // Sync eligibility
  eligibility: 'syncSafe' | 'encryptedOnly' | 'localOnly' | 'rebuildable';
}

/**
 * Result of a conflict resolution operation.
 */
export interface ConflictResolution {
  entityId: string;
  resolution: 'local' | 'remote' | 'merged';
  resolvedAt: string;
  mergedContent?: string;
}

/**
 * ISyncEngine - Core sync operations interface.
 * All methods operate on the local workspace as the authoritative store.
 */
export interface ISyncEngine {
  /**
   * Initialize the sync engine with account credentials.
   * Must be called before any other operations.
   */
  init(credentials: SyncCredentials): Promise<void>;

  /**
   * Push local changes to remote.
   * Returns payloads ready for transmission.
   */
  push(): Promise<SyncPayload[]>;

  /**
   * Pull remote changes and apply to local workspace.
   * Returns conflicts that need manual resolution.
   */
  pull(): Promise<SyncPayload[]>;

  /**
   * Resolve a conflict between local and remote versions.
   */
  resolveConflict(conflict: ConflictResolution): Promise<void>;

  /**
   * Get current sync status.
   */
  getStatus(): SyncStatus;

  /**
   * Get the last successful sync timestamp.
   */
  getLastSyncTime(): Date | null;

  /**
   * Check if there are pending changes to sync.
   */
  hasPendingChanges(): boolean;

  /**
   * Dispose of resources and stop sync operations.
   */
  dispose(): Promise<void>;
}

/**
 * Credentials for sync authentication.
 */
export interface SyncCredentials {
  userId: string;
  deviceId: string;
  authToken: string;
  encryptionKeyId: string;
}
