import { Schema } from "@effect/schema";

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SEntityEnvelope = Schema.Struct({
  id: Schema.String,
  canonicalType: Schema.String,
  provider: Schema.optional(Schema.String),
  providerId: Schema.optional(Schema.String),
  raw: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  createdAt: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
  updatedAt: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
});

export const SCanonicalEntity = Schema.Struct({
  envelope: SEntityEnvelope,
});

export type EntityEnvelope = Schema.Schema.Type<typeof SEntityEnvelope>;

export type CanonicalEntity = Schema.Schema.Type<typeof SCanonicalEntity>;
