import { Schema } from '@effect/schema';
import { PositiveInt, StringRecord } from '@srgnt/contracts';

export const SPtyProcessOptions = Schema.Struct({
  command: Schema.optional(Schema.String),
  args: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  env: Schema.optionalWith(StringRecord, { default: () => ({}) }),
  cwd: Schema.optional(Schema.String),
  rows: Schema.optionalWith(PositiveInt, { default: () => 24 }),
  cols: Schema.optionalWith(PositiveInt, { default: () => 80 }),
});

export type PtyProcessOptions = Schema.Schema.Type<typeof SPtyProcessOptions>;

export const SPtyProcess = Schema.Struct({
  pid: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  fd: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  exitCode: Schema.optional(Schema.Number.pipe(Schema.int())),
});

export type PtyProcess = Schema.Schema.Type<typeof SPtyProcess>;

export const SPtyServiceEvents = Schema.Literal('data', 'exit', 'error', 'resize');

export type PtyServiceEvents = Schema.Schema.Type<typeof SPtyServiceEvents>;
