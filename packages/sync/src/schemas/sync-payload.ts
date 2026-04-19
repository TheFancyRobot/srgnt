import { Schema } from '@effect/schema';

/**
 * Effect Schema definitions for sync payload validation.
 */

// Sync status enum
export const SSyncStatus = Schema.Literal(
  'connected',
  'disconnected',
  'syncing',
  'conflicted',
  'error'
);
export type SyncStatus = Schema.Schema.Type<typeof SSyncStatus>;

// Sync metadata schema
export const SSyncMetadata = Schema.Struct({
  entityId: Schema.String,
  entityType: Schema.String,
  lastModified: Schema.String,
  contentHash: Schema.String,
  classification: Schema.Literal('public', 'internal', 'confidential', 'secret'),
  eligibility: Schema.Literal('syncSafe', 'encryptedOnly', 'localOnly', 'rebuildable'),
});

export type SyncMetadata = Schema.Schema.Type<typeof SSyncMetadata>;

// Sync payload schema
export const SSyncPayload = Schema.Struct({
  encryptedContent: Schema.String,
  iv: Schema.String,
  tag: Schema.optional(Schema.String),
  keyId: Schema.optional(Schema.String),
  metadata: SSyncMetadata,
  deviceId: Schema.String,
  sequence: Schema.Number,
});

export type SyncPayload = Schema.Schema.Type<typeof SSyncPayload>;

// Device info schema
export const SDeviceInfo = Schema.Struct({
  deviceId: Schema.String,
  deviceName: Schema.String,
  deviceType: Schema.Literal('desktop', 'mobile', 'tablet'),
  isCurrent: Schema.Boolean,
  lastSeenAt: Schema.String,
  encryptionPublicKey: Schema.String,
});

export type DeviceInfo = Schema.Schema.Type<typeof SDeviceInfo>;

// Sync credentials schema
export const SSyncCredentials = Schema.Struct({
  userId: Schema.String,
  deviceId: Schema.String,
  authToken: Schema.String,
  encryptionKeyId: Schema.String,
});

export type SyncCredentials = Schema.Schema.Type<typeof SSyncCredentials>;

// Account info schema
export const SSubscriptionTier = Schema.Literal('free', 'premium');

export const SAccountInfo = Schema.Struct({
  userId: Schema.String,
  email: Schema.String,
  displayName: Schema.String,
  subscriptionTier: SSubscriptionTier,
  createdAt: Schema.String,
  lastSyncAt: Schema.optional(Schema.String),
});

export type AccountInfo = Schema.Schema.Type<typeof SAccountInfo>;
