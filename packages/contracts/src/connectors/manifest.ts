import { Schema } from "@effect/schema";
import { SemVerString, UrlString, PositiveInt } from '../shared-schemas.js';

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SConnectorCapability = Schema.Literal("query", "read", "write", "subscribe", "delete");
export type ConnectorCapability = Schema.Schema.Type<typeof SConnectorCapability>;

export const SConnectorAuthType = Schema.Literal("none", "api_key", "oauth2", "basic", "bearer");
export type ConnectorAuthType = Schema.Schema.Type<typeof SConnectorAuthType>;

export const SConnectorConfig = Schema.Struct({
  authType: Schema.optionalWith(SConnectorAuthType, { default: () => "none" as const }),
  baseUrl: Schema.optional(UrlString),
  apiVersion: Schema.optional(Schema.String),
  timeout: Schema.optionalWith(PositiveInt, { default: () => 30000 }),
  retryAttempts: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.nonNegative()), { default: () => 3 }),
});
export type ConnectorConfig = Schema.Schema.Type<typeof SConnectorConfig>;

export const SConnectorEntityMapping = Schema.Struct({
  canonicalType: Schema.String,
  providerType: Schema.String,
});
export type ConnectorEntityMapping = Schema.Schema.Type<typeof SConnectorEntityMapping>;

export const SRateLimit = Schema.Struct({
  requests: PositiveInt,
  windowMs: PositiveInt,
});

export const SConnectorCapabilityDef = Schema.Struct({
  capability: SConnectorCapability,
  supportedOperations: Schema.Array(Schema.String),
  entityMappings: Schema.optionalWith(Schema.Array(SConnectorEntityMapping), { default: () => [] }),
  rateLimit: Schema.optional(SRateLimit),
});
export type ConnectorCapabilityDef = Schema.Schema.Type<typeof SConnectorCapabilityDef>;

export const SConnectorManifest = Schema.Struct({
  id: Schema.String.pipe(Schema.pattern(/^.{1,64}$/)),
  name: Schema.String,
  version: SemVerString,
  description: Schema.String,
  provider: Schema.String,
  authType: SConnectorAuthType,
  config: Schema.optionalWith(SConnectorConfig, {
    default: () => ({ authType: "none" as const, timeout: 30000, retryAttempts: 3 }),
  }),
  capabilities: Schema.Array(SConnectorCapabilityDef),
  entityTypes: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  freshnessThresholdMs: Schema.optionalWith(PositiveInt, { default: () => 300000 }),
  metadata: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), { default: () => ({}) }),
});
export type ConnectorManifest = Schema.Schema.Type<typeof SConnectorManifest>;

export const SConnectorStatus = Schema.Literal("disconnected", "connecting", "connected", "error", "refreshing");
export type ConnectorStatus = Schema.Schema.Type<typeof SConnectorStatus>;

export const SConnectorHealth = Schema.Struct({
  status: SConnectorStatus,
  lastSyncAt: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
  lastError: Schema.optional(Schema.String),
  entityCounts: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Number }), { default: () => ({}) }),
});
export type ConnectorHealth = Schema.Schema.Type<typeof SConnectorHealth>;

export const SConnectorSession = Schema.Struct({
  connectorId: Schema.String,
  authType: SConnectorAuthType,
  authenticatedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  expiresAt: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
  metadata: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), { default: () => ({}) }),
});
export type ConnectorSession = Schema.Schema.Type<typeof SConnectorSession>;
