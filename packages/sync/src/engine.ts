import { Schema } from '@effect/schema';
import { EmailString } from '@srgnt/contracts';

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

const SDateTimeString = Schema.String.pipe(Schema.pattern(datetimePattern));

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

export const SSyncAccount = Schema.Struct({
  id: Schema.String,
  email: EmailString,
  displayName: Schema.String,
  encryptionPublicKey: Schema.optional(Schema.String),
  createdAt: SDateTimeString,
  lastSyncAt: Schema.optional(SDateTimeString),
});

export type SyncAccount = Mutable<Schema.Schema.Type<typeof SSyncAccount>>;

export const SSyncDevice = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.Literal('desktop', 'mobile', 'tablet'),
  encryptionPublicKey: Schema.String,
  lastSeenAt: SDateTimeString,
  isCurrent: Schema.optionalWith(Schema.Boolean, { default: () => false }),
});

export type SyncDevice = Mutable<Schema.Schema.Type<typeof SSyncDevice>>;

export const SEncryptedPayload = Schema.Struct({
  iv: Schema.String,
  ciphertext: Schema.String,
  tag: Schema.optional(Schema.String),
  keyId: Schema.optional(Schema.String),
});

export type EncryptedPayload = Mutable<Schema.Schema.Type<typeof SEncryptedPayload>>;

export const SConflictRecord = Schema.Struct({
  entityId: Schema.String,
  localVersion: Schema.String,
  remoteVersion: Schema.String,
  conflictedAt: SDateTimeString,
  resolution: Schema.optionalWith(Schema.Literal('pending', 'local', 'remote', 'merged'), {
    default: () => 'pending' as const,
  }),
  resolvedAt: Schema.optional(SDateTimeString),
  resolvedBy: Schema.optional(Schema.String),
});

export type ConflictRecord = Mutable<Schema.Schema.Type<typeof SConflictRecord>>;

export interface SyncState {
  account: SyncAccount | null;
  devices: SyncDevice[];
  pendingConflicts: ConflictRecord[];
  lastSyncTimestamp: Date | null;
}

export class SyncEngine {
  private state: SyncState = {
    account: null,
    devices: [],
    pendingConflicts: [],
    lastSyncTimestamp: null,
  };

  setAccount(account: SyncAccount): void {
    this.state.account = account;
  }

  getAccount(): SyncAccount | null {
    return this.state.account;
  }

  addDevice(device: SyncDevice): void {
    const existing = this.state.devices.findIndex(d => d.id === device.id);
    if (existing >= 0) {
      this.state.devices[existing] = device;
    } else {
      this.state.devices.push(device);
    }
  }

  removeDevice(deviceId: string): void {
    this.state.devices = this.state.devices.filter(d => d.id !== deviceId);
  }

  getDevices(): SyncDevice[] {
    return [...this.state.devices];
  }

  addConflict(conflict: Omit<ConflictRecord, 'resolution'> & { resolution?: ConflictRecord['resolution'] }): void {
    this.state.pendingConflicts.push({
      ...conflict,
      resolution: conflict.resolution ?? 'pending',
    });
  }

  resolveConflict(entityId: string, resolution: ConflictRecord['resolution']): boolean {
    const conflict = this.state.pendingConflicts.find(c => c.entityId === entityId);
    if (!conflict) return false;

    conflict.resolution = resolution;
    conflict.resolvedAt = new Date().toISOString();
    return true;
  }

  getPendingConflicts(): ConflictRecord[] {
    return this.state.pendingConflicts.filter(c => c.resolution === 'pending');
  }

  getResolvedConflicts(): ConflictRecord[] {
    return this.state.pendingConflicts.filter(c => c.resolution !== 'pending');
  }

  updateLastSync(): void {
    this.state.lastSyncTimestamp = new Date();
  }

  getLastSync(): Date | null {
    return this.state.lastSyncTimestamp;
  }

  get stateSnapshot(): SyncState {
    return { ...this.state };
  }
}

export function createSyncEngine(): SyncEngine {
  return new SyncEngine();
}
