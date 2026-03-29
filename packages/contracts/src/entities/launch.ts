import { Schema } from "@effect/schema";

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SLaunchIntent = Schema.Literal("readOnly", "artifactAffecting");

export const SLaunchContext = Schema.Struct({
  launchId: Schema.String,
  sourceWorkflow: Schema.String,
  sourceArtifactId: Schema.optional(Schema.String),
  sourceRunId: Schema.optional(Schema.String),
  workingDirectory: Schema.String,
  command: Schema.optional(Schema.String),
  env: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  labels: Schema.optional(Schema.Array(Schema.String)),
  intent: Schema.optionalWith(SLaunchIntent, { default: () => "artifactAffecting" as const }),
  createdAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
});

export const SLaunchTemplate = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  command: Schema.String,
  args: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  intent: SLaunchIntent,
  requiredCapabilities: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
});

export const SLaunchApprovalRequired = Schema.Struct({
  launchId: Schema.String,
  context: SLaunchContext,
  template: SLaunchTemplate,
  requestedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  status: Schema.optionalWith(Schema.Literal("pending", "approved", "denied", "expired"), {
    default: () => "pending" as const,
  }),
});

export type LaunchIntent = Schema.Schema.Type<typeof SLaunchIntent>;

export type LaunchContext = Schema.Schema.Type<typeof SLaunchContext>;

export type LaunchTemplate = Schema.Schema.Type<typeof SLaunchTemplate>;

export type LaunchApprovalRequired = Schema.Schema.Type<typeof SLaunchApprovalRequired>;
