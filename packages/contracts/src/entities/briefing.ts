import { SEntityEnvelope } from './base.js';
import { Schema } from "@effect/schema";

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SBriefingSection = Schema.Struct({
  title: Schema.String,
  items: Schema.Array(Schema.String),
});

export const SBriefingMetadata = Schema.Struct({
  id: Schema.String,
  runId: Schema.String,
  generatedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  sources: Schema.Record({ key: Schema.String, value: Schema.String }),
});

export const SDailyBriefing = Schema.Struct({
  envelope: SEntityEnvelope,
  metadata: SBriefingMetadata,
  priorities: SBriefingSection,
  schedule: SBriefingSection,
  attentionNeeded: SBriefingSection,
  blockers: SBriefingSection,
  content: Schema.String,
});

export type BriefingSection = Schema.Schema.Type<typeof SBriefingSection>;

export type BriefingMetadata = Schema.Schema.Type<typeof SBriefingMetadata>;

export type DailyBriefing = Schema.Schema.Type<typeof SDailyBriefing>;
