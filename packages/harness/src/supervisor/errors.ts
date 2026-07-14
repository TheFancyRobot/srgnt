import { Schema } from 'effect';

// The spawn-failure taxonomy is shared with the acp/ wrapper: a supervised
// process that never launches (ENOENT, EACCES) surfaces the same `SpawnFailed`
// the connection layer already maps into `initialize` failures.
export { SpawnFailed } from '../acp/errors.js';

/**
 * The restart policy's cap was reached: the process keeps crashing and the
 * supervisor has stopped respawning it. Carries the crash count and the last
 * stderr tail so the UI can explain *why* it gave up.
 */
export class SupervisorGaveUp extends Schema.TaggedError<SupervisorGaveUp>()('SupervisorGaveUp', {
  message: Schema.String,
  id: Schema.String,
  /** Consecutive crashes that exhausted the cap. */
  restarts: Schema.Number,
  /** stderr tail from the final crash, when available. */
  stderrTail: Schema.optional(Schema.String),
}) {}

/** `ensureRunning`/`dispose` was called for an id that was never registered. */
export class UnknownHandle extends Schema.TaggedError<UnknownHandle>()('UnknownHandle', {
  message: Schema.String,
  id: Schema.String,
}) {}
