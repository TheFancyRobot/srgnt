import { Schema } from "@effect/schema";
import { SemVerString } from '../shared-schemas.js';

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SWorkspaceDirectoryType = Schema.Literal(
  "daily", "projects", "people", "meetings", "systems", "dashboards", "inbox", "notes"
);
export type WorkspaceDirectoryType = Schema.Schema.Type<typeof SWorkspaceDirectoryType>;

export const SCommandCenterSubdirectory = Schema.Literal(
  "config", "skills", "connectors", "state", "logs", "cache", "templates", "approvals", "runs"
);
export type CommandCenterSubdirectory = Schema.Schema.Type<typeof SCommandCenterSubdirectory>;

export const SWorkspaceDirectoryEntry = Schema.Struct({
  type: SWorkspaceDirectoryType,
  path: Schema.String,
  description: Schema.String,
});

export const SCommandCenterConfig = Schema.Struct({
  root: Schema.optionalWith(Schema.String, { default: () => '.command-center' }),
  subdirectories: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.String }), {
    default: () => ({}),
  }),
});

export const SWorkspaceLayout = Schema.Struct({
  version: SemVerString,
  rootDirectories: Schema.optionalWith(Schema.Array(SWorkspaceDirectoryEntry), { default: () => [] }),
  commandCenter: Schema.optionalWith(SCommandCenterConfig, {
    default: () => ({ root: '.command-center', subdirectories: {} }),
  }),
  metadata: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    default: () => ({}),
  }),
});
export type WorkspaceLayout = Schema.Schema.Type<typeof SWorkspaceLayout>;

export const SWorkspaceRoot = Schema.Struct({
  path: Schema.String,
  layout: SWorkspaceLayout,
  createdAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  lastAccessedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
});
export type WorkspaceRoot = Schema.Schema.Type<typeof SWorkspaceRoot>;

export const SPersistenceContract = Schema.Struct({
  format: Schema.Literal("json", "yaml", "markdown"),
  schema: Schema.String,
  validator: Schema.optional(Schema.String),
  fileExtension: Schema.String,
});
export type PersistenceContract = Schema.Schema.Type<typeof SPersistenceContract>;

export const SFileBackedRecord = Schema.Struct({
  path: Schema.String,
  format: Schema.Literal("json", "yaml", "markdown"),
  schema: Schema.String,
  content: Schema.String,
  checksum: Schema.optional(Schema.String),
  lastModified: Schema.String.pipe(Schema.pattern(datetimePattern)),
  metadata: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    default: () => ({}),
  }),
});
export type FileBackedRecord = Schema.Schema.Type<typeof SFileBackedRecord>;

export const defaultWorkspaceLayout: WorkspaceLayout = {
  version: '1.0.0',
  rootDirectories: [
    { type: 'daily', path: 'Daily', description: 'Daily notes and briefings' },
    { type: 'projects', path: 'Projects', description: 'Project-specific notes and artifacts' },
    { type: 'people', path: 'People', description: 'Person and contact information' },
    { type: 'meetings', path: 'Meetings', description: 'Meeting notes and follow-ups' },
    { type: 'systems', path: 'Systems', description: 'System documentation and runbooks' },
    { type: 'dashboards', path: 'Dashboards', description: 'Dashboard and status views' },
    { type: 'inbox', path: 'Inbox', description: 'Inbox for unprocessed items' },
    { type: 'notes', path: 'Notes', description: 'Operational notes and artifacts' },
  ],
  commandCenter: {
    root: '.command-center',
    subdirectories: {
      config: '.command-center/config',
      skills: '.command-center/skills',
      connectors: '.command-center/connectors',
      state: '.command-center/state',
      logs: '.command-center/logs',
      cache: '.command-center/cache',
      templates: '.command-center/templates',
      approvals: '.command-center/approvals',
      runs: '.command-center/runs',
    },
  },
  metadata: {},
};
