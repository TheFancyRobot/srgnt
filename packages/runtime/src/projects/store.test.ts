import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { workspaceDirectories } from '@srgnt/contracts';
import {
  ProjectIdCollisionError,
  ProjectMergeError,
  ProjectNotFoundError,
  ProjectStore,
  ProjectValidationError,
  createProjectStore,
  defaultProjectName,
} from './store.js';
import { deriveProjectId, mergeJournalPath, projectFilePath } from './paths.js';
import { SessionPathError } from '../sessions/paths.js';
import { createSessionStore } from '../sessions/store.js';

let workspaceRoot = '';
let store: ProjectStore;

/** A directory path that need not exist: the id is derived from the string. */
function dir(name: string): string {
  return path.join(workspaceRoot, 'checkouts', name);
}

beforeEach(async () => {
  workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-projects-'));
  store = createProjectStore(workspaceRoot);
});

afterEach(async () => {
  await fs.rm(workspaceRoot, { recursive: true, force: true });
});

describe('deriveProjectId', () => {
  it('is stable, path-safe, and resolves relative input', () => {
    const id = deriveProjectId('/a/b/c');
    expect(id).toMatch(/^[0-9a-f]{12}$/);
    expect(deriveProjectId('/a/b/c')).toBe(id);
    expect(deriveProjectId('/a/b/../b/c')).toBe(id);
    expect(deriveProjectId('/a/b/d')).not.toBe(id);
  });
});

describe('ensureProjectForDir', () => {
  it('auto-creates a project named after the directory basename', async () => {
    const project = await store.ensureProjectForDir(dir('srgnt'));

    expect(project.name).toBe('srgnt');
    expect(project.rootDir).toBe(path.resolve(dir('srgnt')));
    expect(project.additionalDirectories).toEqual([]);
    expect(project.id).toBe(deriveProjectId(dir('srgnt')));

    const onDisk = JSON.parse(await fs.readFile(projectFilePath(workspaceRoot, project.id), 'utf8'));
    expect(onDisk.rootDir).toBe(project.rootDir);
  });

  it('is idempotent for the same directory, and stable across store instances', async () => {
    const first = await store.ensureProjectForDir(dir('srgnt'));
    const again = await store.ensureProjectForDir(`${dir('srgnt')}/`);
    const afterRestart = await createProjectStore(workspaceRoot).ensureProjectForDir(dir('srgnt'));

    expect(again).toEqual(first);
    expect(afterRestart.id).toBe(first.id);
    expect(afterRestart.createdAt).toBe(first.createdAt);
  });

  it('serializes concurrent creates into one project with no torn write', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => store.ensureProjectForDir(dir('racy')))
    );

    const ids = new Set(results.map((project) => project.id));
    expect(ids.size).toBe(1);
    // Every caller must have seen the same fully-written record, not a
    // half-initialized one that merely happened to parse.
    expect(new Set(results.map((project) => project.createdAt)).size).toBe(1);
    expect((await store.list()).projects).toHaveLength(1);
  });

  it('allows two directories with the same basename', async () => {
    const a = await store.ensureProjectForDir(dir('app'));
    const b = await store.ensureProjectForDir(path.join(workspaceRoot, 'other', 'app'));

    expect(a.name).toBe('app');
    expect(b.name).toBe('app');
    expect(a.id).not.toBe(b.id);
  });

  it.each([
    ['a zero-byte project.json', ''],
    ['a truncated project.json', '{"id": "abc", "rootD'],
    ['a schema-invalid project.json', '{"id":"abc"}'],
  ])('repairs %s left by an interrupted create', async (_label, contents) => {
    const target = dir('interrupted');
    const projectId = deriveProjectId(target);
    const file = projectFilePath(workspaceRoot, projectId);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, contents, 'utf8');
    await fs.writeFile(`${file}.999.deadbeef.tmp`, 'leftover', 'utf8');

    const project = await store.ensureProjectForDir(target);

    expect(project.id).toBe(projectId);
    expect(project.rootDir).toBe(path.resolve(target));
    // The stray scratch file from the crashed write is swept, not inherited.
    expect(await fs.readdir(path.dirname(file))).toEqual(['project.json']);
  });

  it('never returns a partial record as an initialized project', async () => {
    const target = dir('partial');
    const projectId = deriveProjectId(target);
    const file = projectFilePath(workspaceRoot, projectId);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, '{"id":"' + projectId + '","name":"partial"}', 'utf8');

    await expect(store.get(projectId)).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect((await store.list()).skipped).toEqual([
      { projectId, reason: 'project.json failed schema validation' },
    ]);
  });

  it('fails closed when a truncated-hash collision would reuse another directory', async () => {
    const mine = dir('mine');
    const projectId = deriveProjectId(mine);
    // Stand in for a genuine 48-bit collision: a valid record under our id that
    // belongs to a different directory.
    const file = projectFilePath(workspaceRoot, projectId);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(
      file,
      JSON.stringify({
        id: projectId,
        name: 'someone-else',
        rootDir: '/somewhere/else',
        additionalDirectories: [],
        createdAt: '2026-07-01T00:00:00.000Z',
      }),
      'utf8'
    );

    await expect(store.ensureProjectForDir(mine)).rejects.toBeInstanceOf(ProjectIdCollisionError);
    // And the other directory's project is neither reused nor overwritten.
    expect((await store.get(projectId)).rootDir).toBe('/somewhere/else');
  });
});

describe('rename', () => {
  it('changes the name and updatedAt but never the id', async () => {
    const created = await store.ensureProjectForDir(dir('srgnt'));
    const renamed = await store.rename(created.id, '  Command Center  ');

    expect(renamed.id).toBe(created.id);
    expect(renamed.name).toBe('Command Center');
    expect(renamed.rootDir).toBe(created.rootDir);
    expect(renamed.updatedAt).not.toBe(created.updatedAt);
    expect((await store.get(created.id)).name).toBe('Command Center');
  });

  it('keeps the project reachable from the same directory after a rename', async () => {
    const created = await store.ensureProjectForDir(dir('srgnt'));
    await store.rename(created.id, 'Renamed');

    const reEnsured = await store.ensureProjectForDir(dir('srgnt'));
    expect(reEnsured.id).toBe(created.id);
    expect(reEnsured.name).toBe('Renamed');
  });

  it.each([['', 'empty'], ['   ', 'whitespace'], ['x'.repeat(121), 'over-long']])(
    'rejects a %s name (%s)',
    async (name) => {
      const created = await store.ensureProjectForDir(dir('srgnt'));
      await expect(store.rename(created.id, name)).rejects.toBeInstanceOf(ProjectValidationError);
      expect((await store.get(created.id)).name).toBe('srgnt');
    }
  );

  it('rejects an unknown project', async () => {
    await expect(store.rename('deadbeefcafe', 'x')).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it('rejects a path-unsafe project id rather than escaping the projects directory', async () => {
    await expect(store.rename('../../etc', 'x')).rejects.toBeInstanceOf(SessionPathError);
    await expect(store.get('..')).rejects.toBeInstanceOf(SessionPathError);
  });
});

describe('setDefaults', () => {
  it('stores and clears the per-project defaults', async () => {
    const created = await store.ensureProjectForDir(dir('srgnt'));

    const withDefaults = await store.setDefaults(created.id, {
      defaultHarnessId: 'pi',
      permissionPolicy: { read: 'allow', execute: 'ask' },
    });
    expect(withDefaults.defaultHarnessId).toBe('pi');
    expect(withDefaults.permissionPolicy).toEqual({ read: 'allow', execute: 'ask' });

    // Absent fields leave the stored value alone.
    const untouched = await store.setDefaults(created.id, {});
    expect(untouched.defaultHarnessId).toBe('pi');

    const cleared = await store.setDefaults(created.id, {
      defaultHarnessId: null,
      permissionPolicy: null,
    });
    expect(cleared.defaultHarnessId).toBeUndefined();
    expect(cleared.permissionPolicy).toBeUndefined();
    expect((await store.get(created.id)).defaultHarnessId).toBeUndefined();
  });
});

describe('list', () => {
  it('lists every project and reports unreadable ones without failing', async () => {
    const a = await store.ensureProjectForDir(dir('a'));
    const b = await store.ensureProjectForDir(dir('b'));
    await fs.mkdir(path.join(workspaceRoot, workspaceDirectories.projects, 'brokenproject'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(workspaceRoot, workspaceDirectories.projects, 'brokenproject', 'project.json'),
      'not json',
      'utf8'
    );

    const { projects, skipped } = await store.list();
    expect(projects.map((project) => project.id).sort()).toEqual([a.id, b.id].sort());
    expect(skipped).toEqual([
      { projectId: 'brokenproject', reason: 'project.json is not valid JSON' },
    ]);
  });

  it('returns nothing for a workspace with no projects directory yet', async () => {
    const empty = createProjectStore(path.join(workspaceRoot, 'nope'));
    expect(await empty.list()).toEqual({ projects: [], skipped: [] });
  });

  it('ignores a session-only project directory rather than reporting it broken', async () => {
    // SessionStore creates `projects/<id>/sessions/...` on demand; a directory
    // with no project.json is not a corrupt project.
    await fs.mkdir(path.join(workspaceRoot, workspaceDirectories.projects, 'sessionsonly', 'sessions'), {
      recursive: true,
    });
    expect(await store.list()).toEqual({ projects: [], skipped: [] });
  });
});

/** Seed `count` sessions under `projectId` through the real SessionStore. */
async function seedSessions(projectId: string, ids: string[]): Promise<void> {
  const sessions = createSessionStore(workspaceRoot);
  for (const id of ids) {
    await sessions.createSession({
      id,
      projectId,
      title: `session ${id}`,
      harnessId: 'mock',
      status: 'active',
      createdAt: '2026-07-20T10:00:00.000Z',
    });
    await sessions.appendEvent({ projectId, sessionId: id }, 'client/session_created', { id });
  }
  await sessions.close();
}

describe('merge', () => {
  it('moves every session, unions the path-guard dirs, and removes the source', async () => {
    const source = await store.ensureProjectForDir(dir('source'));
    const target = await store.ensureProjectForDir(dir('target'));
    await store.rename(target.id, 'Target');
    await seedSessions(source.id, ['s1', 's2']);
    await seedSessions(target.id, ['t1']);

    const merged = await store.merge(source.id, target.id);

    expect(merged.id).toBe(target.id);
    expect(merged.name).toBe('Target');
    expect(merged.additionalDirectories).toContain(source.rootDir);

    const sessions = createSessionStore(workspaceRoot);
    const listed = await sessions.listSessions(target.id);
    expect(listed.sessions.map((session) => session.id).sort()).toEqual(['s1', 's2', 't1']);
    // The moved event logs came with them — sessions keep their history.
    expect((await sessions.readEvents({ projectId: target.id, sessionId: 's1' })).events).toHaveLength(1);
    await sessions.close();

    await expect(store.get(source.id)).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect((await store.list()).projects.map((project) => project.id)).toEqual([target.id]);
  });

  it('rejects merging a project into itself', async () => {
    const project = await store.ensureProjectForDir(dir('solo'));
    await expect(store.merge(project.id, project.id)).rejects.toBeInstanceOf(ProjectMergeError);
    expect((await store.get(project.id)).id).toBe(project.id);
  });

  it('rejects an unknown source or target', async () => {
    const project = await store.ensureProjectForDir(dir('solo'));
    await expect(store.merge('deadbeefcafe', project.id)).rejects.toBeInstanceOf(ProjectNotFoundError);
    await expect(store.merge(project.id, 'deadbeefcafe')).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it('aborts loudly instead of overwriting a colliding session id', async () => {
    const source = await store.ensureProjectForDir(dir('source'));
    const target = await store.ensureProjectForDir(dir('target'));
    await seedSessions(source.id, ['shared']);
    await seedSessions(target.id, ['shared']);

    await expect(store.merge(source.id, target.id)).rejects.toBeInstanceOf(ProjectMergeError);

    const sessions = createSessionStore(workspaceRoot);
    // The target's own session is untouched and the source still has its copy.
    expect((await sessions.listSessions(target.id)).sessions[0]?.title).toBe('session shared');
    expect((await sessions.listSessions(source.id)).sessions).toHaveLength(1);
    await sessions.close();
  });
});

describe('recoverMerges', () => {
  it('does nothing when no merge is in flight', async () => {
    await store.ensureProjectForDir(dir('a'));
    expect(await store.recoverMerges()).toEqual({ resumed: [], failed: [] });
  });

  it('rolls a crashed merge forward without losing or duplicating a session', async () => {
    const source = await store.ensureProjectForDir(dir('source'));
    const target = await store.ensureProjectForDir(dir('target'));
    await seedSessions(source.id, ['s1', 's2', 's3']);
    await seedSessions(target.id, ['t1']);

    // Simulate a crash after the journal was written and ONE session dir moved.
    await fs.writeFile(
      mergeJournalPath(workspaceRoot, target.id),
      JSON.stringify({
        sourceProjectId: source.id,
        targetProjectId: target.id,
        sourceRootDir: source.rootDir,
        sourceAdditionalDirectories: [],
        startedAt: '2026-07-20T10:00:00.000Z',
      }),
      'utf8'
    );
    const projects = path.join(workspaceRoot, workspaceDirectories.projects);
    await fs.rename(
      path.join(projects, source.id, 'sessions', 's1'),
      path.join(projects, target.id, 'sessions', 's1')
    );

    const recovery = await createProjectStore(workspaceRoot).recoverMerges();
    expect(recovery).toEqual({ resumed: [target.id], failed: [] });

    const sessions = createSessionStore(workspaceRoot);
    const listed = await sessions.listSessions(target.id);
    expect(listed.sessions.map((session) => session.id)).toEqual(['s1', 's2', 's3', 't1']);
    expect(listed.skipped).toEqual([]);
    await sessions.close();

    await expect(store.get(source.id)).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect((await store.get(target.id)).additionalDirectories).toContain(source.rootDir);
    // Journal cleared, so a second recovery is a no-op rather than a re-run.
    expect(await createProjectStore(workspaceRoot).recoverMerges()).toEqual({ resumed: [], failed: [] });
  });

  it('finishes a merge that crashed after the source project.json was deleted', async () => {
    const source = await store.ensureProjectForDir(dir('source'));
    const target = await store.ensureProjectForDir(dir('target'));
    await seedSessions(source.id, ['s1']);

    await fs.writeFile(
      mergeJournalPath(workspaceRoot, target.id),
      JSON.stringify({
        sourceProjectId: source.id,
        targetProjectId: target.id,
        sourceRootDir: source.rootDir,
        sourceAdditionalDirectories: ['/extra/docs'],
        startedAt: '2026-07-20T10:00:00.000Z',
      }),
      'utf8'
    );
    // The journal is the only remaining record of the source's guarded dirs.
    await fs.rm(projectFilePath(workspaceRoot, source.id));

    expect(await store.recoverMerges()).toEqual({ resumed: [target.id], failed: [] });

    const merged = await store.get(target.id);
    expect(merged.additionalDirectories).toEqual(
      expect.arrayContaining(['/extra/docs', source.rootDir])
    );
    const sessions = createSessionStore(workspaceRoot);
    expect((await sessions.listSessions(target.id)).sessions.map((s) => s.id)).toEqual(['s1']);
    await sessions.close();
  });

  it('reports a malformed journal instead of throwing during startup', async () => {
    const target = await store.ensureProjectForDir(dir('target'));
    await fs.writeFile(mergeJournalPath(workspaceRoot, target.id), '{"nope": true}', 'utf8');

    const recovery = await store.recoverMerges();
    expect(recovery.resumed).toEqual([]);
    expect(recovery.failed).toEqual([{ targetProjectId: target.id, reason: 'malformed merge journal' }]);
  });
});

describe('bootstrap additivity', () => {
  it('never touches aggregator-era directories in the workspace', async () => {
    const legacy = path.join(workspaceRoot, '01_Projects');
    await fs.mkdir(legacy, { recursive: true });
    await fs.writeFile(path.join(legacy, 'note.md'), 'keep me', 'utf8');

    const source = await store.ensureProjectForDir(dir('a'));
    const target = await store.ensureProjectForDir(dir('b'));
    await store.merge(source.id, target.id);

    expect(await fs.readFile(path.join(legacy, 'note.md'), 'utf8')).toBe('keep me');
  });
});

describe('defaultProjectName', () => {
  it('falls back to the whole path when there is no basename', () => {
    expect(defaultProjectName('/')).toBe('/');
    expect(defaultProjectName('/a/b')).toBe('b');
  });

  it('bounds an absurdly long directory name to the schema limit', () => {
    expect(defaultProjectName(`/${'x'.repeat(400)}`)).toHaveLength(120);
  });
});
