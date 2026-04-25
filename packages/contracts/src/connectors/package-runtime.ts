import { Schema } from '@effect/schema';
import { SConnectorManifest } from './manifest.js';
import { SemVerString, UrlString } from '../shared-schemas.js';

export const SConnectorPackageCapability = Schema.Literal(
  'http.fetch',
  'logger',
  'crypto.randomUUID',
  'workspace.root',
  'credentials.getToken', // token retrieval via privileged host boundary (DEC-0017)
  'files', // filesystem adapter for markdown persistence (Phase 21)
);

// Package runtime metadata — NOT the connector identity manifest
export const SConnectorPackageRuntime = Schema.Struct({
  sdkVersion: SemVerString, // host SDK version the package targets
  minHostVersion: SemVerString, // minimum compatible host SDK
  entrypoint: Schema.String.pipe(Schema.pattern(/^[^\s]+$/)), // exported symbol name or module path
  capabilities: Schema.Array(SConnectorPackageCapability), // declarative host capabilities requested by the package
  executionModel: Schema.Literal('worker', 'subprocess'), // DEC-0016 constraint
});

export const SConnectorPackageManifest = Schema.Struct({
  manifest: SConnectorManifest,
  runtime: SConnectorPackageRuntime,
  installedAt: Schema.optional(Schema.String),
  packageUrl: Schema.optional(UrlString),
});

export const SConnectorLifecycleState = Schema.Literal(
  'installed', 'verified', 'activated', 'loaded', 'connected', 'errored',
);

// Parsed types
export type ConnectorPackageCapability = Schema.Schema.Type<typeof SConnectorPackageCapability>;
export type ConnectorPackageRuntime = Schema.Schema.Type<typeof SConnectorPackageRuntime>;
export type ConnectorPackageManifest = Schema.Schema.Type<typeof SConnectorPackageManifest>;
export type ConnectorLifecycleState = Schema.Schema.Type<typeof SConnectorLifecycleState>;