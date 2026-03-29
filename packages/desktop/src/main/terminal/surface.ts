import { Schema } from "@effect/schema";
import { StringRecord, PositiveInt } from '@srgnt/contracts';

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SWorkflowLaunchContext = Schema.Struct({
  workflowId: Schema.String,
  workflowName: Schema.String,
  artifactHome: Schema.String,
  connectorHome: Schema.String,
  skillHome: Schema.String,
  environment: Schema.optionalWith(StringRecord, { default: () => ({}) }),
});

export type WorkflowLaunchContext = Schema.Schema.Type<typeof SWorkflowLaunchContext>;

export const STerminalSurfaceConfig = Schema.Struct({
  defaultRows: Schema.optionalWith(PositiveInt, { default: () => 24 }),
  defaultCols: Schema.optionalWith(PositiveInt, { default: () => 80 }),
  shell: Schema.optionalWith(Schema.String, { default: () => '/bin/bash' }),
  maxSessions: Schema.optionalWith(PositiveInt, { default: () => 5 }),
  sessionTimeoutMs: Schema.optionalWith(PositiveInt, { default: () => 3600000 }),
});

export type TerminalSurfaceConfig = Schema.Schema.Type<typeof STerminalSurfaceConfig>;

export const STerminalPreviewRequest = Schema.Struct({
  sessionId: Schema.String,
  command: Schema.String,
  workingDirectory: Schema.optional(Schema.String),
});

export type TerminalPreviewRequest = Schema.Schema.Type<typeof STerminalPreviewRequest>;

export const STerminalPreviewResponse = Schema.Struct({
  preview: Schema.String,
  affectedArtifacts: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  requiresApproval: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  riskLevel: Schema.optionalWith(Schema.Literal("low", "medium", "high"), { default: () => "low" as const }),
});

export type TerminalPreviewResponse = Schema.Schema.Type<typeof STerminalPreviewResponse>;

export const SRunLogEntry = Schema.Struct({
  timestamp: Schema.String.pipe(Schema.pattern(datetimePattern)),
  level: Schema.Literal("debug", "info", "warn", "error"),
  message: Schema.String,
  sessionId: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});

export type RunLogEntry = Schema.Schema.Type<typeof SRunLogEntry>;

export interface TerminalPreviewService {
  preview(request: TerminalPreviewRequest): Promise<TerminalPreviewResponse>;
  approvePreview(sessionId: string, command: string): Promise<void>;
  denyPreview(sessionId: string, command: string): Promise<void>;
}
