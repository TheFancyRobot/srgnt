import { SEntityEnvelope } from './base.js';
import { Schema } from "@effect/schema";

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SEvent = Schema.Struct({
  envelope: SEntityEnvelope,
  title: Schema.String,
  description: Schema.optional(Schema.String),
  startTime: Schema.String.pipe(Schema.pattern(datetimePattern)),
  endTime: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
  location: Schema.optional(Schema.String),
  attendees: Schema.optional(Schema.Array(Schema.String)),
  organizer: Schema.optional(Schema.String),
  recurrence: Schema.optional(Schema.String),
  providerMetadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});

export type Event = Schema.Schema.Type<typeof SEvent>;
