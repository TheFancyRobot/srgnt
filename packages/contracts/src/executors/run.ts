import { Schema } from "@effect/schema";
import { SemVerString, PositiveInt } from '../shared-schemas.js';

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SExecutorCapability = Schema.Literal("execute", "approve", "cancel", "query");
export type ExecutorCapability = Schema.Schema.Type<typeof SExecutorCapability>;

export const SExecutorStatus = Schema.Literal("idle", "running", "paused", "stopped", "error");
export type ExecutorStatus = Schema.Schema.Type<typeof SExecutorStatus>;

export const SRunStatus = Schema.Literal(
  "pending", "running", "waiting_for_approval", "completed", "failed", "cancelled"
);
export type RunStatus = Schema.Schema.Type<typeof SRunStatus>;

export const SApprovalRequest = Schema.Struct({
  id: Schema.String,
  capability: Schema.String,
  reason: Schema.String,
  requestedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  requestedBy: Schema.String,
  status: Schema.optionalWith(Schema.Literal("pending", "approved", "denied"), {
    default: () => "pending" as const,
  }),
  resolvedAt: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
  resolver: Schema.optional(Schema.String),
});
export type ApprovalRequest = Schema.Schema.Type<typeof SApprovalRequest>;

export const SExecutorContext = Schema.Struct({
  workspaceRoot: Schema.String,
  skillHome: Schema.String,
  connectorHome: Schema.String,
  artifactHome: Schema.String,
  runHistoryHome: Schema.optional(Schema.String),
  environment: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.String }), {
    default: () => ({}),
  }),
});
export type ExecutorContext = Schema.Schema.Type<typeof SExecutorContext>;

export const SSkillRunInput = Schema.Struct({
  skillName: Schema.String,
  skillVersion: Schema.String,
  parameters: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    default: () => ({}),
  }),
  context: SExecutorContext,
});
export type SkillRunInput = Schema.Schema.Type<typeof SSkillRunInput>;

export const SSkillRunOutput = Schema.Struct({
  status: SRunStatus,
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(Schema.String),
  artifacts: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  approvals: Schema.optionalWith(Schema.Array(SApprovalRequest), { default: () => [] }),
  logs: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  startedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  completedAt: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
  durationMs: Schema.optional(PositiveInt),
});
export type SkillRunOutput = Schema.Schema.Type<typeof SSkillRunOutput>;

export const SRunLogEntry = Schema.Struct({
  timestamp: Schema.String.pipe(Schema.pattern(datetimePattern)),
  level: Schema.Literal("debug", "info", "warn", "error"),
  message: Schema.String,
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});
export type RunLogEntry = Schema.Schema.Type<typeof SRunLogEntry>;

export const SSkillRunRecord = Schema.Struct({
  id: Schema.String,
  skillName: Schema.String,
  skillVersion: Schema.String,
  status: SRunStatus,
  input: SSkillRunInput,
  output: Schema.optional(SSkillRunOutput),
  logs: Schema.optionalWith(Schema.Array(SRunLogEntry), { default: () => [] }),
  createdAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  updatedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
});
export type SkillRunRecord = Schema.Schema.Type<typeof SSkillRunRecord>;

export const SExecutorManifest = Schema.Struct({
  name: Schema.String,
  version: SemVerString,
  description: Schema.optional(Schema.String),
  capabilities: Schema.optionalWith(Schema.Array(SExecutorCapability), { default: () => [] }),
  maxConcurrentRuns: Schema.optionalWith(PositiveInt, { default: () => 1 }),
  timeoutMs: Schema.optionalWith(PositiveInt, { default: () => 300000 }),
  metadata: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    default: () => ({}),
  }),
});
export type ExecutorManifest = Schema.Schema.Type<typeof SExecutorManifest>;
