import { SEntityEnvelope } from './base.js';
import { Schema } from "@effect/schema";

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SArtifact = Schema.Struct({
  envelope: SEntityEnvelope,
  name: Schema.String,
  content: Schema.String,
  contentType: Schema.optional(Schema.Literal("markdown", "text", "html", "json")),
  sourceSkill: Schema.optional(Schema.String),
  createdAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  updatedAt: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
  tags: Schema.optional(Schema.Array(Schema.String)),
});

export type Artifact = Schema.Schema.Type<typeof SArtifact>;
