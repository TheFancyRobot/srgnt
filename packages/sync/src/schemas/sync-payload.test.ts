import { describe, it, expect } from 'vitest';
import { Schema } from '@effect/schema';
import {
  SSyncStatus,
  SSyncMetadata,
  SSyncPayload,
  SDeviceInfo,
  SSyncCredentials,
  SSubscriptionTier,
  SAccountInfo,
} from './sync-payload.js';

describe('SSyncStatus', () => {
  it('accepts every documented status', () => {
    for (const status of ['connected', 'disconnected', 'syncing', 'conflicted', 'error']) {
      expect(Schema.decodeUnknownSync(SSyncStatus)(status)).toBe(status);
    }
  });

  it('rejects an unknown status', () => {
    expect(() => Schema.decodeUnknownSync(SSyncStatus)('idle')).toThrow();
  });
});

describe('SSyncMetadata', () => {
  const baseline = {
    entityId: 'note-1',
    entityType: 'Note',
    lastModified: '2026-04-19T00:00:00.000Z',
    contentHash: 'sha256:abc',
    classification: 'internal' as const,
    eligibility: 'syncSafe' as const,
  };

  it('round-trips a valid metadata record', () => {
    expect(Schema.decodeUnknownSync(SSyncMetadata)(baseline)).toEqual(baseline);
  });

  it('rejects an unknown classification', () => {
    expect(() =>
      Schema.decodeUnknownSync(SSyncMetadata)({ ...baseline, classification: 'top-secret' }),
    ).toThrow();
  });

  it('rejects missing contentHash', () => {
    const { contentHash: _omit, ...rest } = baseline;
    expect(() => Schema.decodeUnknownSync(SSyncMetadata)(rest)).toThrow();
  });
});

describe('SSyncPayload', () => {
  const metadata = {
    entityId: 'note-1',
    entityType: 'Note',
    lastModified: '2026-04-19T00:00:00.000Z',
    contentHash: 'sha256:abc',
    classification: 'public' as const,
    eligibility: 'syncSafe' as const,
  };

  it('round-trips the minimal payload', () => {
    const payload = {
      encryptedContent: 'ciphertext',
      iv: 'nonce',
      metadata,
      deviceId: 'device-a',
      sequence: 7,
    };
    expect(Schema.decodeUnknownSync(SSyncPayload)(payload)).toEqual(payload);
  });

  it('accepts optional tag and keyId', () => {
    const parsed = Schema.decodeUnknownSync(SSyncPayload)({
      encryptedContent: 'c',
      iv: 'i',
      tag: 'auth-tag',
      keyId: 'key-1',
      metadata,
      deviceId: 'device-a',
      sequence: 1,
    });
    expect(parsed.tag).toBe('auth-tag');
    expect(parsed.keyId).toBe('key-1');
  });

  it('rejects a non-numeric sequence', () => {
    expect(() =>
      Schema.decodeUnknownSync(SSyncPayload)({
        encryptedContent: 'c',
        iv: 'i',
        metadata,
        deviceId: 'device-a',
        sequence: '7',
      }),
    ).toThrow();
  });
});

describe('SDeviceInfo', () => {
  it('round-trips a desktop device', () => {
    const device = {
      deviceId: 'desk-1',
      deviceName: 'Work Laptop',
      deviceType: 'desktop' as const,
      isCurrent: true,
      lastSeenAt: '2026-04-19T00:00:00.000Z',
      encryptionPublicKey: 'pubkey-base64',
    };
    expect(Schema.decodeUnknownSync(SDeviceInfo)(device)).toEqual(device);
  });

  it('rejects an unknown device type', () => {
    expect(() =>
      Schema.decodeUnknownSync(SDeviceInfo)({
        deviceId: 'x',
        deviceName: 'x',
        deviceType: 'watch',
        isCurrent: false,
        lastSeenAt: '2026-04-19T00:00:00.000Z',
        encryptionPublicKey: 'k',
      }),
    ).toThrow();
  });
});

describe('SSyncCredentials', () => {
  it('requires all four fields', () => {
    const creds = {
      userId: 'u',
      deviceId: 'd',
      authToken: 't',
      encryptionKeyId: 'k',
    };
    expect(Schema.decodeUnknownSync(SSyncCredentials)(creds)).toEqual(creds);
    const { authToken: _omit, ...rest } = creds;
    expect(() => Schema.decodeUnknownSync(SSyncCredentials)(rest)).toThrow();
  });
});

describe('SSubscriptionTier + SAccountInfo', () => {
  it('accepts free and premium tiers', () => {
    expect(Schema.decodeUnknownSync(SSubscriptionTier)('free')).toBe('free');
    expect(Schema.decodeUnknownSync(SSubscriptionTier)('premium')).toBe('premium');
  });

  it('parses an account without lastSyncAt', () => {
    const account = {
      userId: 'u',
      email: 'alice@example.com',
      displayName: 'Alice',
      subscriptionTier: 'premium' as const,
      createdAt: '2026-04-19T00:00:00.000Z',
    };
    const parsed = Schema.decodeUnknownSync(SAccountInfo)(account);
    expect(parsed.lastSyncAt).toBeUndefined();
  });

  it('rejects an invalid tier', () => {
    expect(() =>
      Schema.decodeUnknownSync(SAccountInfo)({
        userId: 'u',
        email: 'e',
        displayName: 'd',
        subscriptionTier: 'enterprise',
        createdAt: '2026-04-19T00:00:00.000Z',
      }),
    ).toThrow();
  });
});
