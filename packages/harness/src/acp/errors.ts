import { RequestError } from '@agentclientprotocol/sdk';
import { Schema } from 'effect';

/**
 * Typed error taxonomy for the ACP wrapper (Schema.TaggedError per
 * effect-best-practices). Every failure surfaced by `@srgnt/harness`'s acp/
 * modules is one of these tags — callers never see raw SDK exceptions.
 */

/** The agent child process (or injected spawner) failed to produce a connection. */
export class SpawnFailed extends Schema.TaggedError<SpawnFailed>()('SpawnFailed', {
  message: Schema.String,
  /** The launch command that failed, when known. */
  command: Schema.optional(Schema.String),
  cause: Schema.optional(Schema.Unknown),
}) {}

/** `initialize` capability negotiation failed or returned an unusable response. */
export class InitializeFailed extends Schema.TaggedError<InitializeFailed>()('InitializeFailed', {
  message: Schema.String,
  /** Protocol version the client requested. */
  requestedProtocolVersion: Schema.optional(Schema.Number),
  cause: Schema.optional(Schema.Unknown),
}) {}

/** A prompt turn (`session/prompt`) failed before completing with a stop reason. */
export class TurnFailed extends Schema.TaggedError<TurnFailed>()('TurnFailed', {
  message: Schema.String,
  sessionId: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

/** The underlying connection closed (stream ended, process died) while in use. */
export class ConnectionLost extends Schema.TaggedError<ConnectionLost>()('ConnectionLost', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

/** The agent violated the protocol (JSON-RPC error, malformed frame, bad payload). */
export class ProtocolError extends Schema.TaggedError<ProtocolError>()('ProtocolError', {
  message: Schema.String,
  /** JSON-RPC error code when the failure came from a JSON-RPC error response. */
  code: Schema.optional(Schema.Number),
  /** ACP method that was in flight, when known. */
  method: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Unknown),
}) {}

/** Union of every error the acp/ wrapper can produce. */
export type AcpWrapperError =
  | SpawnFailed
  | InitializeFailed
  | TurnFailed
  | ConnectionLost
  | ProtocolError;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Maps a raw SDK/transport failure from an in-flight request into the wrapper
 * taxonomy: JSON-RPC errors become ProtocolError; anything after (or causing)
 * connection closure becomes ConnectionLost.
 */
export function fromSdkError(
  method: string,
  error: unknown,
  connectionClosed: boolean,
): ProtocolError | ConnectionLost {
  if (error instanceof RequestError) {
    return new ProtocolError({
      message: `ACP request ${method} failed: ${error.message}`,
      code: error.code,
      method,
      data: error.data,
    });
  }
  if (connectionClosed) {
    return new ConnectionLost({
      message: `ACP connection closed while calling ${method}: ${errorMessage(error)}`,
      cause: error,
    });
  }
  return new ProtocolError({
    message: `ACP request ${method} failed: ${errorMessage(error)}`,
    method,
    data: undefined,
  });
}
