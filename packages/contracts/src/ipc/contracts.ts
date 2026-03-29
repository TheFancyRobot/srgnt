import { Schema } from "@effect/schema";
import { PositiveInt } from '../shared-schemas.js';
import { SLaunchContext } from '../entities/launch.js';

export const ipcChannels = {
  appGetVersion: 'app:get-version',
  appGetUserDataPath: 'app:get-user-data-path',
  appCheckForUpdates: 'app:check-for-updates',
  workspaceGetRoot: 'workspace:get-root',
  workspaceSetRoot: 'workspace:set-root',
  workspaceChooseRoot: 'workspace:choose-root',
  workspaceCreateDefaultRoot: 'workspace:create-default-root',
  connectorList: 'connector:list',
  connectorStatus: 'connector:status',
  connectorConnect: 'connector:connect',
  connectorDisconnect: 'connector:disconnect',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  skillList: 'skill:list',
  skillRun: 'skill:run',
  skillCancel: 'skill:cancel',
  approvalRequest: 'approval:request',
  approvalResolve: 'approval:resolve',
  terminalSpawn: 'terminal:spawn',
  terminalWrite: 'terminal:write',
  terminalResize: 'terminal:resize',
  terminalClose: 'terminal:close',
  terminalList: 'terminal:list',
  terminalLaunchWithContext: 'terminal:launch-with-context',
  launchApprovalRequired: 'launch:approval-required',
  launchApprovalResolve: 'launch:approval-resolve',
  runHistoryList: 'run-history:list',
  runHistoryGet: 'run-history:get',
  runLogSave: 'run-log:save',
  entitiesList: 'entities:list',
  briefingSave: 'briefing:save',
  briefingList: 'briefing:list',
  crashWriteTestLog: 'crash:write-test-log',
} as const;

type IpcChannelValue = (typeof ipcChannels)[keyof typeof ipcChannels];
export const ipcChannelValues = Object.values(ipcChannels) as [IpcChannelValue, ...IpcChannelValue[]];

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SIpcChannel = Schema.Literal(
  ...ipcChannelValues
);
export type IpcChannel = Schema.Schema.Type<typeof SIpcChannel>;

export const SIpcRequest = Schema.Struct({
  channel: SIpcChannel,
  payload: Schema.optional(Schema.Unknown),
  requestId: Schema.String,
});
export type IpcRequest = Schema.Schema.Type<typeof SIpcRequest>;

export const SIpcResponse = Schema.Struct({
  requestId: Schema.String,
  success: Schema.Boolean,
  data: Schema.optional(Schema.Unknown),
  error: Schema.optional(Schema.String),
});
export type IpcResponse = Schema.Schema.Type<typeof SIpcResponse>;

export const SAppVersionResponse = Schema.Struct({
  version: Schema.String,
});
export type AppVersionResponse = Schema.Schema.Type<typeof SAppVersionResponse>;

export const SUserDataPathResponse = Schema.Struct({
  path: Schema.String,
});
export type UserDataPathResponse = Schema.Schema.Type<typeof SUserDataPathResponse>;

export const SDesktopTheme = Schema.Literal('system', 'light', 'dark');
export type DesktopTheme = Schema.Schema.Type<typeof SDesktopTheme>;

export const SUpdateChannel = Schema.Literal('stable', 'beta', 'nightly');
export type UpdateChannel = Schema.Schema.Type<typeof SUpdateChannel>;

export const SDesktopConnectorPreferences = Schema.Struct({
  jira: Schema.Boolean,
  outlook: Schema.Boolean,
  teams: Schema.Boolean,
});
export type DesktopConnectorPreferences = Schema.Schema.Type<typeof SDesktopConnectorPreferences>;

export const SDesktopSettings = Schema.Struct({
  theme: SDesktopTheme,
  updateChannel: SUpdateChannel,
  telemetryEnabled: Schema.Boolean,
  crashReportsEnabled: Schema.Boolean,
  connectors: SDesktopConnectorPreferences,
  debugMode: Schema.Boolean,
  maxConcurrentRuns: Schema.Literal('1', '3', '5'),
});
export type DesktopSettings = Schema.Schema.Type<typeof SDesktopSettings>;

export const SDesktopSettingsResponse = Schema.Struct({
  workspaceRoot: Schema.String,
  settings: SDesktopSettings,
});
export type DesktopSettingsResponse = Schema.Schema.Type<typeof SDesktopSettingsResponse>;

export const SUpdateCheckResponse = Schema.Struct({
  status: Schema.Literal('available', 'not-available', 'error', 'skipped'),
  channel: SUpdateChannel,
  checkedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  message: Schema.String,
  version: Schema.optional(Schema.String),
});
export type UpdateCheckResponse = Schema.Schema.Type<typeof SUpdateCheckResponse>;

export const SConnectorListEntry = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  status: Schema.String,
});

export const SConnectorListResponse = Schema.Struct({
  connectors: Schema.Array(SConnectorListEntry),
});
export type ConnectorListResponse = Schema.Schema.Type<typeof SConnectorListResponse>;

export const SSkillListEntry = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
});

export const SSkillListResponse = Schema.Struct({
  skills: Schema.Array(SSkillListEntry),
});
export type SkillListResponse = Schema.Schema.Type<typeof SSkillListResponse>;

export const SSkillRunRequest = Schema.Struct({
  skillName: Schema.String,
  skillVersion: Schema.String,
  parameters: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    default: () => ({}),
  }),
});
export type SkillRunRequest = Schema.Schema.Type<typeof SSkillRunRequest>;

export const SSkillRunResponse = Schema.Struct({
  runId: Schema.String,
  status: Schema.String,
});
export type SkillRunResponse = Schema.Schema.Type<typeof SSkillRunResponse>;

export const SIpcApprovalRequest = Schema.Struct({
  id: Schema.String,
  capability: Schema.String,
  reason: Schema.String,
  requestedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  requestedBy: Schema.String,
});
export type IpcApprovalRequest = Schema.Schema.Type<typeof SIpcApprovalRequest>;

export const SApprovalResolveRequest = Schema.Struct({
  id: Schema.String,
  approved: Schema.Boolean,
});
export type ApprovalResolveRequest = Schema.Schema.Type<typeof SApprovalResolveRequest>;

export const STerminalSpawnRequest = Schema.Struct({
  rows: Schema.optionalWith(PositiveInt, { default: () => 24 }),
  cols: Schema.optionalWith(PositiveInt, { default: () => 80 }),
});
export type TerminalSpawnRequest = Schema.Schema.Type<typeof STerminalSpawnRequest>;

export const STerminalSpawnResponse = Schema.Struct({
  sessionId: Schema.String,
  pid: Schema.Number,
});
export type TerminalSpawnResponse = Schema.Schema.Type<typeof STerminalSpawnResponse>;

export const STerminalWriteRequest = Schema.Struct({
  sessionId: Schema.String,
  data: Schema.String,
});
export type TerminalWriteRequest = Schema.Schema.Type<typeof STerminalWriteRequest>;

export const STerminalResizeRequest = Schema.Struct({
  sessionId: Schema.String,
  rows: Schema.Number.pipe(Schema.int(), Schema.positive()),
  cols: Schema.Number.pipe(Schema.int(), Schema.positive()),
});
export type TerminalResizeRequest = Schema.Schema.Type<typeof STerminalResizeRequest>;

export const STerminalCloseRequest = Schema.Struct({
  sessionId: Schema.String,
});
export type TerminalCloseRequest = Schema.Schema.Type<typeof STerminalCloseRequest>;

export const STerminalListEntry = Schema.Struct({
  id: Schema.String,
  pid: Schema.Number,
  isActive: Schema.Boolean,
  startedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
});

export const STerminalListResponse = Schema.Struct({
  sessions: Schema.Array(STerminalListEntry),
});
export type TerminalListResponse = Schema.Schema.Type<typeof STerminalListResponse>;

export const STerminalLaunchWithContextRequest = Schema.Struct({
  launchContext: SLaunchContext,
  rows: Schema.optionalWith(PositiveInt, { default: () => 24 }),
  cols: Schema.optionalWith(PositiveInt, { default: () => 80 }),
});
export type TerminalLaunchWithContextRequest = Schema.Schema.Type<typeof STerminalLaunchWithContextRequest>;

export const STerminalLaunchWithContextResponse = Schema.Struct({
  sessionId: Schema.String,
  pid: Schema.Number,
  launchId: Schema.String,
});
export type TerminalLaunchWithContextResponse = Schema.Schema.Type<typeof STerminalLaunchWithContextResponse>;

export const SRunHistoryEntry = Schema.Struct({
  id: Schema.String,
  launchId: Schema.String,
  command: Schema.String,
  startTime: Schema.String.pipe(Schema.pattern(datetimePattern)),
  endTime: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
  exitCode: Schema.optional(Schema.Number),
  outputSummary: Schema.String,
  redactedFields: Schema.Array(Schema.String),
});

export const SRunHistoryListResponse = Schema.Struct({
  runs: Schema.Array(SRunHistoryEntry),
});
export type RunHistoryListResponse = Schema.Schema.Type<typeof SRunHistoryListResponse>;

export const SRunHistoryGetRequest = Schema.Struct({
  launchId: Schema.String,
});

export const SRunHistoryGetResponse = Schema.Struct({
  run: Schema.optional(SRunHistoryEntry),
});
export type RunHistoryGetResponse = Schema.Schema.Type<typeof SRunHistoryGetResponse>;

export const SRunLogSaveRequest = Schema.Struct({
  content: Schema.String,
  runId: Schema.String,
  launchId: Schema.String,
});
export type RunLogSaveRequest = Schema.Schema.Type<typeof SRunLogSaveRequest>;

export const SRunLogSaveResponse = Schema.Struct({
  path: Schema.String,
});
export type RunLogSaveResponse = Schema.Schema.Type<typeof SRunLogSaveResponse>;

export const SLaunchApprovalPayload = Schema.Struct({
  approvalId: Schema.String,
  launchContext: SLaunchContext,
  command: Schema.String,
  riskLevel: Schema.Literal('low', 'medium', 'high'),
  requiresApproval: Schema.Boolean,
});
export type LaunchApprovalPayload = Schema.Schema.Type<typeof SLaunchApprovalPayload>;

export const SLaunchApprovalResolveRequest = Schema.Struct({
  approvalId: Schema.String,
  approved: Schema.Boolean,
});
export type LaunchApprovalResolveRequest = Schema.Schema.Type<typeof SLaunchApprovalResolveRequest>;

export const SRedactionPolicy = Schema.Struct({
  maxOutputLength: PositiveInt,
  redactPatterns: Schema.Array(Schema.String),
  sensitiveEnvKeys: Schema.Array(Schema.String),
});
export type RedactionPolicySchema = Schema.Schema.Type<typeof SRedactionPolicy>;

export const SEntitiesListResponse = Schema.Struct({
  entities: Schema.Array(Schema.Unknown),
});
export type EntitiesListResponse = Schema.Schema.Type<typeof SEntitiesListResponse>;

export const SBriefingSaveMetadata = Schema.Struct({
  id: Schema.String,
  runId: Schema.String,
  generatedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  sources: Schema.Record({ key: Schema.String, value: Schema.String }),
});

export const SBriefingSaveRequest = Schema.Struct({
  content: Schema.String,
  metadata: SBriefingSaveMetadata,
});
export type BriefingSaveRequest = Schema.Schema.Type<typeof SBriefingSaveRequest>;

export const SBriefingSaveResponse = Schema.Struct({
  path: Schema.String,
});
export type BriefingSaveResponse = Schema.Schema.Type<typeof SBriefingSaveResponse>;

export const SBriefingListEntry = Schema.Struct({
  id: Schema.String,
  path: Schema.String,
  generatedAt: Schema.String,
});

export const SBriefingListResponse = Schema.Struct({
  briefings: Schema.Array(SBriefingListEntry),
});
export type BriefingListResponse = Schema.Schema.Type<typeof SBriefingListResponse>;
