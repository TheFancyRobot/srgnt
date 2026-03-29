import { Schema } from '@effect/schema';
import { NumberRecord } from '@srgnt/contracts';

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

const SDateTimeString = Schema.String.pipe(Schema.pattern(datetimePattern));

export const SEntitlementTier = Schema.Literal('free', 'premium', 'enterprise');
export type EntitlementTier = Schema.Schema.Type<typeof SEntitlementTier>;

export const SEntitlement = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  tier: SEntitlementTier,
  features: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  limits: Schema.optionalWith(NumberRecord, { default: () => ({}) }),
});

export type Entitlement = Schema.Schema.Type<typeof SEntitlement>;

export const SEntitlementGrant = Schema.Struct({
  userId: Schema.String,
  entitlementId: Schema.String,
  grantedAt: SDateTimeString,
  expiresAt: Schema.optional(SDateTimeString),
  source: Schema.optionalWith(Schema.Literal('purchase', 'trial', 'promotion', 'system'), {
    default: () => 'system' as const,
  }),
});

export type EntitlementGrant = Schema.Schema.Type<typeof SEntitlementGrant>;

export const baseEntitlements: Entitlement[] = [
  {
    id: 'free',
    name: 'Free',
    tier: 'free',
    features: [
      'daily-briefing',
      'jira-connector',
      'outlook-connector',
      'local-workspace',
    ],
    limits: {
      'skills': 5,
      'connectors': 3,
      'workspace-size-mb': 100,
    },
  },
];

export const premiumEntitlements: Entitlement[] = [
  {
    id: 'premium',
    name: 'Premium',
    tier: 'premium',
    features: [
      ...baseEntitlements[0].features,
      'teams-connector',
      'unlimited-skills',
      'sync',
      'custom-connectors',
      'priority-support',
    ],
    limits: {
      'skills': -1,
      'connectors': -1,
      'workspace-size-mb': 1000,
    },
  },
];

export const enterpriseEntitlements: Entitlement[] = [
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    features: [
      ...premiumEntitlements[0].features,
      'sso',
      'audit-logs',
      'dedicated-support',
      'custom-deployments',
    ],
    limits: {
      'skills': -1,
      'connectors': -1,
      'workspace-size-mb': -1,
    },
  },
];

export function getEntitlement(tier: EntitlementTier): Entitlement {
  switch (tier) {
    case 'free': return baseEntitlements[0];
    case 'premium': return premiumEntitlements[0];
    case 'enterprise': return enterpriseEntitlements[0];
    default: return baseEntitlements[0];
  }
}

export function hasFeature(entitlement: Entitlement, feature: string): boolean {
  return entitlement.features.includes(feature);
}

export function hasUnlimited(entitlement: Entitlement, limit: string): boolean {
  return entitlement.limits[limit] === -1;
}
