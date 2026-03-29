import { SEntityEnvelope } from './base.js';
import { Schema } from "@effect/schema";
import { EmailString, UrlString } from '../shared-schemas.js';

export const SPerson = Schema.Struct({
  envelope: SEntityEnvelope,
  name: Schema.String,
  email: Schema.optional(EmailString),
  role: Schema.optional(Schema.String),
  team: Schema.optional(Schema.String),
  avatarUrl: Schema.optional(UrlString),
  providerMetadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});

export type Person = Schema.Schema.Type<typeof SPerson>;
