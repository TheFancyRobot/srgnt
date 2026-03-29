import { SEntityEnvelope } from './base.js';
import { Schema } from "@effect/schema";

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SMessage = Schema.Struct({
  envelope: SEntityEnvelope,
  subject: Schema.optional(Schema.String),
  body: Schema.String,
  sender: Schema.String,
  recipients: Schema.optional(Schema.Array(Schema.String)),
  sentAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  threadId: Schema.optional(Schema.String),
  isRead: Schema.optional(Schema.Boolean),
  providerMetadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});

export type Message = Schema.Schema.Type<typeof SMessage>;
