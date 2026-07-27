import { Schema } from 'effect';

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/** Longest project name we accept, so `project.json` and the switcher stay sane. */
export const PROJECT_NAME_MAX_LENGTH = 120;

/** What a stored project policy says about one tool-call kind. */
export const SProjectPermissionDecision = Schema.Literal('allow', 'reject', 'ask');
export type ProjectPermissionDecision = Schema.Schema.Type<typeof SProjectPermissionDecision>;

/**
 * Per-project standing permission answers, keyed by the permission engine's
 * normalized tool-call kind (`read`, `edit`, `execute`, …).
 *
 * Storage + lookup only this phase (STEP-24-02). `ask` is stored explicitly so a
 * project can pin a kind back to prompting; an absent kind means the same thing,
 * because default-ask is the ARCH-0009 invariant and never relaxes on its own.
 * The policy *editing* UI is Phase 25.
 */
export const SProjectPermissionPolicy = Schema.Record({
  key: Schema.String,
  value: SProjectPermissionDecision,
});
export type ProjectPermissionPolicy = Schema.Schema.Type<typeof SProjectPermissionPolicy>;

/**
 * A project groups sessions around one working directory (ARCH-0009).
 * Client `fs/*` services offered to agents are path-guarded to
 * `rootDir` + `additionalDirectories`.
 */
export const SProject = Schema.Struct({
  id: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(PROJECT_NAME_MAX_LENGTH)),
  rootDir: Schema.String,
  additionalDirectories: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  defaultHarnessId: Schema.optional(Schema.String),
  permissionPolicy: Schema.optional(SProjectPermissionPolicy),
  createdAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  updatedAt: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
});
export type Project = Schema.Schema.Type<typeof SProject>;
