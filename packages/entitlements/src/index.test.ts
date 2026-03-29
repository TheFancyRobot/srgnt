import { describe, it, expect } from 'vitest';
import { parseSync, safeParse } from '@srgnt/contracts';
import {
  SEntitlementTier,
  SEntitlement,
  SEntitlementGrant,
  getEntitlement,
  hasFeature,
  hasUnlimited,
  baseEntitlements,
  premiumEntitlements,
  enterpriseEntitlements,
} from './index.js';

describe('SEntitlementTier', () => {
  it('accepts valid tiers', () => {
    expect(parseSync(SEntitlementTier, 'free')).toBe('free');
    expect(parseSync(SEntitlementTier, 'premium')).toBe('premium');
    expect(parseSync(SEntitlementTier, 'enterprise')).toBe('enterprise');
  });

  it('rejects invalid tiers', () => {
    expect(safeParse(SEntitlementTier, 'unknown').success).toBe(false);
  });
});

describe('SEntitlement', () => {
  it('validates base entitlement shape', () => {
    const result = parseSync(SEntitlement, baseEntitlements[0]);
    expect(result.id).toBe('free');
    expect(result.tier).toBe('free');
    expect(result.features).toContain('daily-briefing');
  });
});

describe('SEntitlementGrant', () => {
  it('validates a grant with defaults', () => {
    const result = parseSync(SEntitlementGrant, {
      userId: 'user-1',
      entitlementId: 'free',
      grantedAt: '2024-01-01T00:00:00Z',
    });
    expect(result.source).toBe('system');
  });
});

describe('getEntitlement', () => {
  it('returns free tier', () => {
    expect(getEntitlement('free').id).toBe('free');
  });

  it('returns premium tier', () => {
    expect(getEntitlement('premium').id).toBe('premium');
  });

  it('returns enterprise tier', () => {
    expect(getEntitlement('enterprise').id).toBe('enterprise');
  });
});

describe('hasFeature', () => {
  it('returns true for included features', () => {
    expect(hasFeature(baseEntitlements[0], 'daily-briefing')).toBe(true);
  });

  it('returns false for excluded features', () => {
    expect(hasFeature(baseEntitlements[0], 'sso')).toBe(false);
  });
});

describe('hasUnlimited', () => {
  it('returns false for free tier limits', () => {
    expect(hasUnlimited(baseEntitlements[0], 'skills')).toBe(false);
  });

  it('returns true for enterprise unlimited limits', () => {
    expect(hasUnlimited(enterpriseEntitlements[0], 'skills')).toBe(true);
  });
});

describe('tier feature inheritance', () => {
  it('premium includes all free features', () => {
    for (const feature of baseEntitlements[0].features) {
      expect(premiumEntitlements[0].features).toContain(feature);
    }
  });

  it('enterprise includes all premium features', () => {
    for (const feature of premiumEntitlements[0].features) {
      expect(enterpriseEntitlements[0].features).toContain(feature);
    }
  });
});
