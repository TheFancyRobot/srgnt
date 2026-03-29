import { Schema } from '@effect/schema';
import { PositiveInt, UnknownRecord } from '@srgnt/contracts';

export const SFredFeature = Schema.Literal(
  'ai-summarization',
  'smart-scheduling',
  'cross-connector-insights',
  'predictive-tasks',
  'natural-language-queries',
  'automated-follow-ups'
);

export type FredFeature = Schema.Schema.Type<typeof SFredFeature>;

export const SFredBoundary = Schema.Struct({
  canInvokeAi: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  canModifyWorkspace: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  canAccessExternalData: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  maxTokensPerRequest: Schema.optional(PositiveInt),
  rateLimitPerMinute: Schema.optional(PositiveInt),
});

export type FredBoundary = Schema.Schema.Type<typeof SFredBoundary>;

export const SFredRequest = Schema.Struct({
  feature: SFredFeature,
  context: Schema.optionalWith(UnknownRecord, { default: () => ({}) }),
  boundary: Schema.optional(SFredBoundary),
});

export type FredRequest = Schema.Schema.Type<typeof SFredRequest>;

export const SFredResponse = Schema.Struct({
  feature: SFredFeature,
  result: Schema.Unknown,
  confidence: Schema.optional(Schema.Number),
  artifacts: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  executionTimeMs: Schema.optional(PositiveInt),
});

export type FredResponse = Schema.Schema.Type<typeof SFredResponse>;

export interface FredIntegration {
  invoke(request: FredRequest): Promise<FredResponse>;
  getAvailableFeatures(): FredFeature[];
  checkEntitlement(feature: FredFeature): boolean;
}

export const defaultFredBoundary: FredBoundary = {
  canInvokeAi: true,
  canModifyWorkspace: false,
  canAccessExternalData: true,
  maxTokensPerRequest: 4096,
  rateLimitPerMinute: 10,
};

export const premiumFredBoundary: FredBoundary = {
  ...defaultFredBoundary,
  canModifyWorkspace: true,
  maxTokensPerRequest: 16384,
  rateLimitPerMinute: 60,
};

export const enterpriseFredBoundary: FredBoundary = {
  ...premiumFredBoundary,
  canModifyWorkspace: true,
};
