import { Schema } from '@effect/schema';
import { SemVerString } from '../shared-schemas.js';
import { SConnectorPackageCapability } from './package-runtime.js';

/**
 * Loader handshake contract between the privileged desktop host and an isolated
 * connector package runtime (worker or subprocess).
 *
 * The handshake is the only fail-closed gate that admits a remote package into
 * the activation flow. If any field fails validation the loader MUST refuse to
 * activate the package and set its lifecycleState to `errored` with a durable
 * `lastError` explanation.
 *
 * The handshake contract is intentionally narrow and declarative:
 *   - The host sends a descriptor describing the package it expects to load.
 *   - The isolated runtime responds with a ready payload describing what it
 *     actually exports.
 *   - The host validates that the reported identity, SDK version range and
 *     entrypoint shape match the expected package before moving it into the
 *     `loaded` state.
 */

// Host -> runtime handshake request. Sent exactly once when the runtime boots.
export const SLoaderHandshakeRequest = Schema.Struct({
  // Protocol version for the handshake itself, distinct from package SDK version.
  protocolVersion: Schema.Literal(1),
  // Connector id we expect the package to claim.
  expectedConnectorId: Schema.String,
  // Persistent package id (usually `${name}@${version}`).
  expectedPackageId: Schema.String,
  // Host SDK version currently running; the runtime may refuse to activate if
  // this lies outside its supported range.
  hostSdkVersion: SemVerString,
  // Declared capabilities the host is willing to grant, surfaced back in the
  // runtime response so diagnostics record the agreed-upon capability set.
  grantedCapabilities: Schema.Array(SConnectorPackageCapability),
});
export type LoaderHandshakeRequest = Schema.Schema.Type<typeof SLoaderHandshakeRequest>;

// Runtime -> host handshake response. This is the only message that moves a
// package out of the `activated` state into `loaded`.
export const SLoaderHandshakeResponse = Schema.Struct({
  protocolVersion: Schema.Literal(1),
  // Connector id the runtime actually reports. Must match the expected id.
  connectorId: Schema.String,
  // Package id the runtime actually reports. Must match the expected id.
  packageId: Schema.String,
  // The SDK version the runtime was built against. Must satisfy the package
  // record's `minHostVersion` compatibility check.
  sdkVersion: SemVerString,
  // Runtime-reported minimum host SDK version it supports. Must be <=
  // hostSdkVersion.
  minHostVersion: SemVerString,
  // Capabilities actually used by the loaded package. Must be a subset of the
  // granted capabilities. Used for least-privilege diagnostics.
  activeCapabilities: Schema.Array(SConnectorPackageCapability),
  // Declarative name of the entrypoint symbol the runtime exposes. Presence is
  // required; the runtime MUST refuse to boot if it cannot resolve a factory.
  entrypoint: Schema.String.pipe(Schema.pattern(/^[^\s]+$/)),
});
export type LoaderHandshakeResponse = Schema.Schema.Type<typeof SLoaderHandshakeResponse>;

// Failure payload the runtime may emit instead of a handshake response. Used
// when boot succeeds but the runtime detected a fatal condition before it was
// able to complete the handshake (e.g. missing entrypoint, unsupported SDK).
export const SLoaderHandshakeFailure = Schema.Struct({
  protocolVersion: Schema.Literal(1),
  code: Schema.Literal(
    'ENTRYPOINT_MISSING',
    'ENTRYPOINT_SHAPE_INVALID',
    'SDK_UNSUPPORTED',
    'CONNECTOR_ID_MISMATCH',
    'PACKAGE_ID_MISMATCH',
    'CAPABILITY_DENIED',
    'RUNTIME_CRASH',
  ),
  message: Schema.String,
  // Optional non-sensitive detail string. Must be safe for logs.
  detail: Schema.optional(Schema.String),
});
export type LoaderHandshakeFailure = Schema.Schema.Type<typeof SLoaderHandshakeFailure>;
