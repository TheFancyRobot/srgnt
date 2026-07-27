/**
 * @vitest-environment node
 */
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ipcChannels } from '@srgnt/contracts';
import { createProjectStore, deriveProjectId } from '@srgnt/runtime';

const { handlers, mockHandle } = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, payload: unknown) => unknown>();
  const mockHandle = vi.fn((channel: string, handler: (event: unknown, payload: unknown) => unknown) => {
    handlers.set(channel, handler);
  });
  return { handlers, mockHandle };
});

vi.mock('electron', () => ({ ipcMain: { handle: mockHandle } }));

import { createProjectsService } from './projects.js';

let workspaceRoot = '';
let otherRoot = '';
let currentRoot = '';

function invoke(channel: string, payload?: unknown): Promise<unknown> {
  const handler = handlers.get(channel);
  if (handler === undefined) throw new Error(`No handler for ${channel}`);
  return Promise.resolve(handler({}, payload));
}

beforeEach(async () => {
  handlers.clear();
  mockHandle.mockClear();
  workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-projects-svc-'));
  otherRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-projects-svc-other-'));
  currentRoot = workspaceRoot;
});

afterEach(async () => {
  await fs.rm(workspaceRoot, { recursive: true, force: true });
  await fs.rm(otherRoot, { recursive: true, force: true });
});

function service() {
  const created = createProjectsService({ getWorkspaceRoot: () => currentRoot });
  created.registerIpcHandlers();
  return created;
}

describe('createProjectsService', () => {
  it('registers every project channel', () => {
    service();
    expect([...handlers.keys()].sort()).toEqual(
      [
        ipcChannels.projectList,
        ipcChannels.projectEnsure,
        ipcChannels.projectRename,
        ipcChannels.projectMerge,
        ipcChannels.projectSetDefaults,
      ].sort(),
    );
  });

  it('auto-creates a project for a directory and lists it', async () => {
    service();
    const project = (await invoke(ipcChannels.projectEnsure, {
      rootDir: path.join(workspaceRoot, 'checkout'),
    })) as { id: string; name: string; rootDir: string };

    expect(project.name).toBe('checkout');
    expect(project.id).toBe(deriveProjectId(path.join(workspaceRoot, 'checkout')));

    const listed = (await invoke(ipcChannels.projectList)) as { projects: { id: string }[] };
    expect(listed.projects.map((entry) => entry.id)).toEqual([project.id]);
  });

  it('renames, sets defaults, and merges over IPC', async () => {
    service();
    const a = (await invoke(ipcChannels.projectEnsure, { rootDir: path.join(workspaceRoot, 'a') })) as { id: string };
    const b = (await invoke(ipcChannels.projectEnsure, { rootDir: path.join(workspaceRoot, 'b') })) as {
      id: string;
      rootDir: string;
    };

    const renamed = (await invoke(ipcChannels.projectRename, { projectId: a.id, name: 'Alpha' })) as {
      id: string;
      name: string;
    };
    expect(renamed).toMatchObject({ id: a.id, name: 'Alpha' });

    const withDefaults = (await invoke(ipcChannels.projectSetDefaults, {
      projectId: a.id,
      defaultHarnessId: 'pi',
      permissionPolicy: { read: 'allow' },
    })) as { defaultHarnessId?: string; permissionPolicy?: Record<string, string> };
    expect(withDefaults.defaultHarnessId).toBe('pi');
    expect(withDefaults.permissionPolicy).toEqual({ read: 'allow' });

    const merged = (await invoke(ipcChannels.projectMerge, {
      sourceProjectId: b.id,
      targetProjectId: a.id,
    })) as { id: string; additionalDirectories: string[] };
    expect(merged.id).toBe(a.id);
    expect(merged.additionalDirectories).toContain(b.rootDir);

    const listed = (await invoke(ipcChannels.projectList)) as { projects: { id: string }[] };
    expect(listed.projects.map((entry) => entry.id)).toEqual([a.id]);
  });

  it('rejects a payload that does not match the schema at the IPC boundary', async () => {
    service();
    await expect(invoke(ipcChannels.projectEnsure, { rootDir: 42 })).rejects.toThrow();
    await expect(invoke(ipcChannels.projectRename, { projectId: 'x' })).rejects.toThrow();
  });

  it('surfaces a readable error before a workspace root exists', async () => {
    currentRoot = '';
    service();
    await expect(invoke(ipcChannels.projectList)).rejects.toThrow(/No workspace root/);
  });

  it('re-roots when the workspace root changes and never writes to the old root', async () => {
    const projects = service();
    await projects.setWorkspaceRoot(workspaceRoot);
    const first = (await invoke(ipcChannels.projectEnsure, { rootDir: path.join(workspaceRoot, 'a') })) as {
      id: string;
    };

    currentRoot = otherRoot;
    await projects.setWorkspaceRoot(otherRoot);
    await invoke(ipcChannels.projectEnsure, { rootDir: path.join(otherRoot, 'b') });

    // The new root sees only its own project...
    const listed = (await invoke(ipcChannels.projectList)) as { projects: { id: string }[] };
    expect(listed.projects.map((entry) => entry.id)).not.toContain(first.id);
    // ...and the previous workspace is untouched.
    expect((await createProjectStore(workspaceRoot).list()).projects.map((entry) => entry.id)).toEqual([first.id]);
  });

  it('rolls an interrupted merge forward when the workspace root is set', async () => {
    const store = createProjectStore(workspaceRoot);
    const source = await store.ensureProjectForDir(path.join(workspaceRoot, 'source'));
    const target = await store.ensureProjectForDir(path.join(workspaceRoot, 'target'));
    await fs.mkdir(path.join(workspaceRoot, 'projects', source.id, 'sessions', 's1'), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, 'projects', target.id, 'merge.journal.json'),
      JSON.stringify({
        sourceProjectId: source.id,
        targetProjectId: target.id,
        sourceRootDir: source.rootDir,
        sourceAdditionalDirectories: [],
        startedAt: '2026-07-20T10:00:00.000Z',
      }),
      'utf8',
    );

    const projects = service();
    await projects.setWorkspaceRoot(workspaceRoot);

    const listed = (await invoke(ipcChannels.projectList)) as { projects: { id: string }[] };
    expect(listed.projects.map((entry) => entry.id)).toEqual([target.id]);
    expect(
      await fs.readdir(path.join(workspaceRoot, 'projects', target.id, 'sessions')),
    ).toEqual(['s1']);
  });

  it('does not throw when merge recovery fails', async () => {
    const store = createProjectStore(workspaceRoot);
    const target = await store.ensureProjectForDir(path.join(workspaceRoot, 'target'));
    await fs.writeFile(
      path.join(workspaceRoot, 'projects', target.id, 'merge.journal.json'),
      'not json',
      'utf8',
    );

    const projects = service();
    await expect(projects.setWorkspaceRoot(workspaceRoot)).resolves.toBeUndefined();
  });
});
