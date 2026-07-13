import { Schema } from 'effect';
import { SemVerString } from '../shared-schemas.js';

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/**
 * Workspace v2 layout (ARCH-0009).
 *
 * ~/srgnt-workspace/
 *   projects/            per-project session data (meta.json, events.jsonl, transcript.md)
 *   groups/templates/    reusable group + pipeline templates
 *   harnesses.json       configured harness definitions
 *   settings.json        desktop settings
 *
 * Aggregator-era (v1 / PARA) directories are ignored, never removed: bootstrap
 * is additive and must not touch user data.
 */

export const SWorkspaceDirectoryEntry = Schema.Struct({
  path: Schema.String,
  description: Schema.String,
});
export type WorkspaceDirectoryEntry = Schema.Schema.Type<typeof SWorkspaceDirectoryEntry>;

export const SWorkspaceSeedFile = Schema.Struct({
  path: Schema.String,
  description: Schema.String,
  defaultContent: Schema.String,
});
export type WorkspaceSeedFile = Schema.Schema.Type<typeof SWorkspaceSeedFile>;

export const SWorkspaceLayout = Schema.Struct({
  version: SemVerString,
  directories: Schema.optionalWith(Schema.Array(SWorkspaceDirectoryEntry), { default: () => [] }),
  seedFiles: Schema.optionalWith(Schema.Array(SWorkspaceSeedFile), { default: () => [] }),
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

/** Canonical workspace-relative directory paths. */
export const workspaceDirectories = {
  projects: 'projects',
  groups: 'groups',
  groupTemplates: 'groups/templates',
} as const;

/** Canonical workspace-relative file paths. */
export const workspaceFiles = {
  harnesses: 'harnesses.json',
  settings: 'settings.json',
} as const;

export const defaultWorkspaceLayout: WorkspaceLayout = {
  version: '2.0.0',
  directories: [
    {
      path: workspaceDirectories.projects,
      description: 'Per-project session data (meta records, event logs, transcripts)',
    },
    {
      path: workspaceDirectories.groups,
      description: 'Group session assets',
    },
    {
      path: workspaceDirectories.groupTemplates,
      description: 'Reusable group and pipeline templates',
    },
  ],
  seedFiles: [
    {
      path: workspaceFiles.harnesses,
      description: 'Configured harness definitions',
      defaultContent: '{\n  "version": 1,\n  "harnesses": []\n}\n',
    },
    {
      path: workspaceFiles.settings,
      description: 'Desktop settings',
      defaultContent: '{}\n',
    },
  ],
  metadata: {},
};
