import { Schema } from "@effect/schema";
import { SemVerString } from '../shared-schemas.js';

export const SSkillCapability = Schema.Literal(
  "read:tasks", "write:tasks", "read:calendar", "write:calendar",
  "read:messages", "write:messages", "read:contacts", "write:contacts",
  "read:artifacts", "write:artifacts", "exec:shell", "exec:http"
);

export const SApprovalRequirement = Schema.Struct({
  capability: SSkillCapability,
  reason: Schema.optional(Schema.String),
  fallbackBehavior: Schema.optional(Schema.Literal("block", "prompt", "allow")),
});

export type SkillCapability = Schema.Schema.Type<typeof SSkillCapability>;

export type ApprovalRequirement = Schema.Schema.Type<typeof SApprovalRequirement>;

export const SSkillInput = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  type: Schema.Literal("string", "number", "boolean", "date", "array", "object"),
  required: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  default: Schema.optional(Schema.Unknown),
});

export type SkillInput = Schema.Schema.Type<typeof SSkillInput>;

export const SSkillOutput = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  contentType: Schema.optionalWith(Schema.Literal("markdown", "json", "text"), {
    default: () => "markdown" as const,
  }),
});

export type SkillOutput = Schema.Schema.Type<typeof SSkillOutput>;

export const SSkillManifest = Schema.Struct({
  name: Schema.String.pipe(Schema.pattern(/^.{1,64}$/)),
  version: SemVerString,
  description: Schema.String,
  purpose: Schema.String,
  inputs: Schema.optionalWith(Schema.Array(SSkillInput), { default: () => [] }),
  outputs: Schema.optionalWith(Schema.Array(SSkillOutput), { default: () => [] }),
  requiredCapabilities: Schema.optionalWith(Schema.Array(SSkillCapability), { default: () => [] }),
  approvalRequirements: Schema.optionalWith(Schema.Array(SApprovalRequirement), { default: () => [] }),
  connectorDependencies: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  promptTemplate: Schema.optional(Schema.String),
  fixtures: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), { default: () => ({}) }),
  metadata: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), { default: () => ({}) }),
});

export type SkillManifest = Schema.Schema.Type<typeof SSkillManifest>;

export const SSkillManifestBundle = Schema.Struct({
  manifest: SSkillManifest,
  prompts: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  templates: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
});

export type SkillManifestBundle = Schema.Schema.Type<typeof SSkillManifestBundle>;
