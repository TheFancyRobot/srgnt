import { describe, it, expect } from 'vitest';
import { parseSync, safeParse } from '../shared-schemas.js';
import {
  SWorkspaceLayout,
  SWorkspaceRoot,
  defaultWorkspaceLayout,
  workspaceDirectories,
  workspaceFiles,
} from './layout.js';

describe('SWorkspaceLayout', () => {
  it('validates a minimal layout', () => {
    const layout = parseSync(SWorkspaceLayout, { version: '2.0.0' });
    expect(layout.directories).toEqual([]);
    expect(layout.seedFiles).toEqual([]);
  });

  it('rejects a non-semver version', () => {
    expect(safeParse(SWorkspaceLayout, { version: 'two' }).success).toBe(false);
  });

  it('rejects directory entries without a path', () => {
    const result = safeParse(SWorkspaceLayout, {
      version: '2.0.0',
      directories: [{ description: 'missing path' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('defaultWorkspaceLayout (workspace v2)', () => {
  it('is a valid SWorkspaceLayout', () => {
    expect(() => parseSync(SWorkspaceLayout, defaultWorkspaceLayout)).not.toThrow();
  });

  it('declares exactly the v2 directories', () => {
    expect(defaultWorkspaceLayout.directories.map((dir) => dir.path)).toEqual([
      'projects',
      'groups',
      'groups/templates',
    ]);
  });

  it('declares exactly the v2 seed files', () => {
    expect(defaultWorkspaceLayout.seedFiles.map((file) => file.path)).toEqual([
      'harnesses.json',
      'settings.json',
    ]);
  });

  it('contains no PARA aggregator directories', () => {
    const paths = defaultWorkspaceLayout.directories.map((dir) => dir.path);
    for (const legacy of ['Daily', 'Projects', 'People', 'Meetings', '.command-center']) {
      expect(paths.some((p) => p === legacy || p.startsWith(`${legacy}/`))).toBe(false);
    }
  });

  it('seeds harnesses.json with a valid empty harness list', () => {
    const seed = defaultWorkspaceLayout.seedFiles.find((f) => f.path === workspaceFiles.harnesses);
    expect(seed).toBeDefined();
    expect(JSON.parse(seed!.defaultContent)).toEqual({ version: 1, harnesses: [] });
  });

  it('seeds settings.json with parseable JSON', () => {
    const seed = defaultWorkspaceLayout.seedFiles.find((f) => f.path === workspaceFiles.settings);
    expect(seed).toBeDefined();
    expect(() => JSON.parse(seed!.defaultContent)).not.toThrow();
  });

  it('exposes canonical path constants matching the layout', () => {
    expect(workspaceDirectories.projects).toBe('projects');
    expect(workspaceDirectories.groupTemplates).toBe('groups/templates');
    expect(workspaceFiles.harnesses).toBe('harnesses.json');
    expect(workspaceFiles.settings).toBe('settings.json');
  });
});

describe('SWorkspaceRoot', () => {
  it('round-trips a workspace root record', () => {
    const root = {
      path: '/home/user/srgnt-workspace',
      layout: { version: '2.0.0' },
      createdAt: '2026-07-12T00:00:00.000Z',
      lastAccessedAt: '2026-07-12T00:00:00.000Z',
    };
    expect(() => parseSync(SWorkspaceRoot, root)).not.toThrow();
  });

  it('rejects malformed timestamps', () => {
    const root = {
      path: '/home/user/srgnt-workspace',
      layout: { version: '2.0.0' },
      createdAt: 'yesterday',
      lastAccessedAt: '2026-07-12T00:00:00.000Z',
    };
    expect(safeParse(SWorkspaceRoot, root).success).toBe(false);
  });
});
