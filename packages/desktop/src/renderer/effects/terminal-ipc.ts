import { Effect, Schema } from 'effect';
import type { TerminalLaunchWithContextRequest } from '@srgnt/contracts';

export class TerminalCloseError extends Schema.TaggedError<TerminalCloseError>()(
  'TerminalCloseError',
  { message: Schema.String, sessionId: Schema.String },
) {}

export class TerminalSpawnError extends Schema.TaggedError<TerminalSpawnError>()(
  'TerminalSpawnError',
  { message: Schema.String },
) {}

export class TerminalLaunchError extends Schema.TaggedError<TerminalLaunchError>()(
  'TerminalLaunchError',
  { message: Schema.String, launchId: Schema.String },
) {}

export class TerminalWriteError extends Schema.TaggedError<TerminalWriteError>()(
  'TerminalWriteError',
  { message: Schema.String, sessionId: Schema.String },
) {}

export class TerminalResizeError extends Schema.TaggedError<TerminalResizeError>()(
  'TerminalResizeError',
  { message: Schema.String, sessionId: Schema.String },
) {}

export class TerminalApprovalError extends Schema.TaggedError<TerminalApprovalError>()(
  'TerminalApprovalError',
  { message: Schema.String, approvalId: Schema.String },
) {}

export class SrgntBridgeError extends Schema.TaggedError<SrgntBridgeError>()(
  'SrgntBridgeError',
  { message: Schema.String, method: Schema.String },
) {}

function bridgeCall<T>(
  method: string,
  fn: () => Promise<T>,
): Effect.Effect<T, SrgntBridgeError> {
  return Effect.tryPromise({
    try: fn,
    catch: (cause) =>
      new SrgntBridgeError({ message: String(cause), method }),
  });
}

export interface SpawnResult {
  sessionId: string;
  pid: number;
}

export interface LaunchResult {
  sessionId: string;
  pid: number;
  launchId: string;
  status?: 'approved' | 'denied' | 'approval-pending';
  approvalId?: string;
}

export class TerminalIpc extends Effect.Service<TerminalIpc>()('TerminalIpc', {
  accessors: true,
  effect: Effect.gen(function* () {
    const spawn = Effect.fn('TerminalIpc.spawn')(function* (
      options?: { rows?: number; cols?: number },
    ) {
      return yield* bridgeCall('terminalSpawn', () =>
        window.srgnt.terminalSpawn(options),
      ).pipe(
        Effect.mapError(
          (e) => new TerminalSpawnError({ message: e.message }),
        ),
      );
    });

    const launchWithContext = Effect.fn('TerminalIpc.launchWithContext')(
      function* (request: TerminalLaunchWithContextRequest) {
        return yield* bridgeCall('terminalLaunchWithContext', () =>
          window.srgnt.terminalLaunchWithContext(request),
        ).pipe(
          Effect.mapError(
            (e) =>
              new TerminalLaunchError({
                message: e.message,
                launchId: request.launchContext.launchId,
              }),
          ),
        );
      },
    );

    const write = Effect.fn('TerminalIpc.write')(function* (
      sessionId: string,
      data: string,
    ) {
      return yield* bridgeCall('terminalWrite', () =>
        window.srgnt.terminalWrite(sessionId, data),
      ).pipe(
        Effect.mapError(
          (e) =>
            new TerminalWriteError({ message: e.message, sessionId }),
        ),
      );
    });

    const resize = Effect.fn('TerminalIpc.resize')(function* (
      sessionId: string,
      rows: number,
      cols: number,
    ) {
      return yield* bridgeCall('terminalResize', () =>
        window.srgnt.terminalResize(sessionId, rows, cols),
      ).pipe(
        Effect.mapError(
          (e) =>
            new TerminalResizeError({ message: e.message, sessionId }),
        ),
      );
    });

    const close = Effect.fn('TerminalIpc.close')(function* (
      sessionId: string,
    ) {
      return yield* bridgeCall('terminalClose', () =>
        window.srgnt.terminalClose(sessionId),
      ).pipe(
        Effect.mapError(
          (e) =>
            new TerminalCloseError({ message: e.message, sessionId }),
        ),
      );
    });

    const resolveLaunchApproval = Effect.fn(
      'TerminalIpc.resolveLaunchApproval',
    )(function* (approvalId: string, approved: boolean) {
      return yield* bridgeCall('resolveLaunchApproval', () =>
        window.srgnt.resolveLaunchApproval(approvalId, approved),
      ).pipe(
        Effect.mapError(
          (e) =>
            new TerminalApprovalError({
              message: e.message,
              approvalId,
            }),
        ),
      );
    });

    return {
      spawn,
      launchWithContext,
      write,
      resize,
      close,
      resolveLaunchApproval,
    };
  }),
}) {}

const layer = TerminalIpc.Default;

function runSafe<A, E>(
  effect: Effect.Effect<A, E, TerminalIpc>,
): void {
  Effect.runPromise(
    effect.pipe(Effect.provide(layer), Effect.catchAll(() => Effect.void)),
  );
}

async function runUnsafe<A, E>(
  effect: Effect.Effect<A, E, TerminalIpc>,
): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(layer)));
}

export { runSafe, runUnsafe };
