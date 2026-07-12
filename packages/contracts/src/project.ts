import { Schema } from 'effect';

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/**
 * A project groups sessions around one working directory (ARCH-0009).
 * Client `fs/*` services offered to agents are path-guarded to
 * `rootDir` + `additionalDirectories`.
 */
export const SProject = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  rootDir: Schema.String,
  additionalDirectories: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  defaultHarnessId: Schema.optional(Schema.String),
  createdAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  updatedAt: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
});
export type Project = Schema.Schema.Type<typeof SProject>;
