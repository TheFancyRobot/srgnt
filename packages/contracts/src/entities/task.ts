import { SEntityEnvelope } from './base.js';
import { Schema } from "@effect/schema";

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const STask = Schema.Struct({
  envelope: SEntityEnvelope,
  title: Schema.String,
  description: Schema.optional(Schema.String),
  status: Schema.optional(Schema.Literal("open", "in_progress", "done", "cancelled")),
  priority: Schema.optional(Schema.Literal("low", "medium", "high", "critical")),
  dueDate: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
  assignee: Schema.optional(Schema.String),
  project: Schema.optional(Schema.String),
  labels: Schema.optional(Schema.Array(Schema.String)),
  providerMetadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});

export type Task = Schema.Schema.Type<typeof STask>;
