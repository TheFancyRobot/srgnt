import * as fs from 'fs/promises';
import * as path from 'path';
import {
  PROJECT_NAME_MAX_LENGTH,
  SProject,
  safeParse,
  type Project,
  type ProjectPermissionPolicy,
} from '@srgnt/contracts';
import { isSafeId, projectSessionsDirectory, projectDirectory } from '../sessions/paths.js';
import { writeJsonAtomic } from '../shared/atomic-json.js';
import {
  deriveProjectId,
  mergeJournalPath,
  projectFileNames,
  projectFilePath,
  projectsDirectory,
} from './paths.js';

/**
 * Two different directories hashed to the same truncated project id.
 *
 * Fail closed: reusing the existing project would silently merge two unrelated
 * checkouts, and overwriting it would steal the other directory's sessions.
 * Both are worse than refusing.
 */
export class ProjectIdCollisionError extends Error {
  constructor(
    readonly projectId: string,
    readonly requestedRootDir: string,
    readonly storedRootDir: string
  ) {
    super(
      `Project id ${projectId} is already used by ${storedRootDir}; refusing to reuse it for ${requestedRootDir}`
    );
    this.name = 'ProjectIdCollisionError';
  }
}

export class ProjectNotFoundError extends Error {
  constructor(readonly projectId: string) {
    super(`No project ${projectId}`);
    this.name = 'ProjectNotFoundError';
  }
}

/** A rename/defaults/merge argument that cannot be satisfied. */
export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectValidationError';
  }
}

/** A merge could not run or could not be resumed. Never overwrites, always reports. */
export class ProjectMergeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectMergeError';
  }
}

export interface ListProjectsResult {
  projects: Project[];
  /** Project directories that could not be read — reported, never fatal. */
  skipped: Array<{ projectId: string; reason: string }>;
}

export interface ProjectDefaultsPatch {
  /** Absent leaves the stored value alone; `null` clears it. */
  defaultHarnessId?: string | null;
  permissionPolicy?: ProjectPermissionPolicy | null;
}

export interface MergeRecoveryResult {
  resumed: string[];
  failed: Array<{ targetProjectId: string; reason: string }>;
}

/**
 * Durable marker written to the *target* before a merge moves anything.
 *
 * It carries the source's `rootDir`/`additionalDirectories` because step 4
 * deletes the source `project.json` — a resume after that point could not read
 * them back, and the target's path guard has to keep covering the moved
 * sessions' files. Deliberately no `movedSessionIds`: resume re-reads whatever
 * is still under the source, which is self-correcting and needs no fsync per
 * moved session.
 */
interface MergeJournal {
  sourceProjectId: string;
  targetProjectId: string;
  sourceRootDir: string;
  sourceAdditionalDirectories: string[];
  startedAt: string;
}

type ReadResult =
  | { kind: 'ok'; project: Project }
  | { kind: 'missing' }
  | { kind: 'corrupt'; reason: string };

function errno(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException | null)?.code;
}

/** Directory basename, bounded to the schema's name limit. Falls back to the path. */
export function defaultProjectName(resolvedRootDir: string): string {
  const base = path.basename(resolvedRootDir) || resolvedRootDir;
  return base.slice(0, PROJECT_NAME_MAX_LENGTH);
}

/** Trim + bound a user-supplied name, rejecting blank and over-long input. */
export function normalizeProjectName(name: string): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (trimmed === '') {
    throw new ProjectValidationError('Project name cannot be empty.');
  }
  if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
    throw new ProjectValidationError(
      `Project name is longer than ${PROJECT_NAME_MAX_LENGTH} characters.`
    );
  }
  return trimmed;
}

function unionPaths(...groups: ReadonlyArray<readonly string[]>): string[] {
  return [...new Set(groups.flat())];
}

/**
 * Disk layer for project entities: `projects/<id>/project.json` beside the
 * `sessions/` tree `SessionStore` owns.
 *
 * "Project = directory" (ARCH-0009): nothing here creates a project by name.
 * `ensureProjectForDir` is the only constructor, it is idempotent, and its id is
 * derived from the directory — so two sessions opened in the same checkout, from
 * any harness, land in the same project without a registry to keep consistent.
 */
export class ProjectStore {
  /** Per-id serialization. Concurrent `ensureProjectForDir` calls must not both write. */
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(readonly workspaceRoot: string) {}

  /**
   * Both ids, always in sorted order so two callers taking the same pair can
   * never deadlock against each other. Merge touches two projects at once, and
   * a concurrent rename or setDefaults on either one would otherwise interleave
   * with a multi-step destructive move.
   */
  private withLocks<T>(ids: readonly string[], run: () => Promise<T>): Promise<T> {
    const [first, second] = [...new Set(ids)].sort();
    if (first === undefined) return run();
    if (second === undefined) return this.withLock(first, run);
    return this.withLock(first, () => this.withLock(second, run));
  }

  private withLock<T>(projectId: string, run: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(projectId) ?? Promise.resolve();
    // `then(run, run)`: a rejected predecessor must not poison every later
    // caller of the same id — the lock orders work, it does not propagate failure.
    const next = previous.then(run, run);
    const settled = next.then(
      () => undefined,
      () => undefined
    );
    this.locks.set(projectId, settled);
    void settled.then(() => {
      // Only clear if nobody queued behind us, or the next caller loses its turn.
      if (this.locks.get(projectId) === settled) this.locks.delete(projectId);
    });
    return next;
  }

  private async readProject(projectId: string): Promise<ReadResult> {
    const file = projectFilePath(this.workspaceRoot, projectId);
    let raw: string;
    try {
      raw = await fs.readFile(file, 'utf8');
    } catch (error) {
      if (errno(error) === 'ENOENT') return { kind: 'missing' };
      return { kind: 'corrupt', reason: `unreadable: ${String(error)}` };
    }
    // A zero-byte file is the classic interrupted-write leftover.
    if (raw.trim() === '') return { kind: 'corrupt', reason: 'empty project.json' };
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return { kind: 'corrupt', reason: 'project.json is not valid JSON' };
    }
    const parsed = safeParse(SProject, value);
    if (!parsed.success) return { kind: 'corrupt', reason: 'project.json failed schema validation' };
    // The directory name IS the id. A record claiming another id would make
    // every path derived from it point somewhere else.
    if (parsed.data.id !== projectId) {
      return { kind: 'corrupt', reason: `project.json id ${parsed.data.id} != directory ${projectId}` };
    }
    return { kind: 'ok', project: parsed.data };
  }

  /** Drop scratch files a crashed atomic write left behind. Best effort. */
  private async sweepTempFiles(projectId: string): Promise<void> {
    const directory = projectDirectory(this.workspaceRoot, projectId);
    let entries: string[];
    try {
      entries = await fs.readdir(directory);
    } catch {
      return;
    }
    await Promise.all(
      entries
        .filter((entry) => entry.startsWith(`${projectFileNames.project}.`) && entry.endsWith('.tmp'))
        .map((entry) => fs.rm(path.join(directory, entry), { force: true }))
    );
  }

  private async write(project: Project): Promise<Project> {
    const parsed = safeParse(SProject, project);
    if (!parsed.success) {
      throw new ProjectValidationError(`Invalid project record for ${project.id}`);
    }
    await fs.mkdir(projectDirectory(this.workspaceRoot, parsed.data.id), { recursive: true });
    await writeJsonAtomic(projectFilePath(this.workspaceRoot, parsed.data.id), parsed.data);
    return parsed.data;
  }

  /**
   * The only way a project comes into being. Idempotent for a directory, safe
   * under concurrency (per-id lock), and self-repairing after an interrupted
   * create — a partial `project.json` is rewritten rather than returned.
   */
  async ensureProjectForDir(rootDir: string): Promise<Project> {
    const resolved = path.resolve(rootDir);
    const projectId = deriveProjectId(resolved);
    return this.withLock(projectId, async () => {
      const existing = await this.readProject(projectId);
      if (existing.kind === 'ok') {
        if (existing.project.rootDir !== resolved) {
          throw new ProjectIdCollisionError(projectId, resolved, existing.project.rootDir);
        }
        return existing.project;
      }
      // `corrupt` is normally repaired rather than rejected: the record carries
      // no trustworthy `rootDir`, so rewriting it steals nothing, and leaving it
      // broken would wedge this directory forever.
      //
      // Unless sessions already live under this id. Then the directory demonstrably
      // belonged to some project, the truncated-hash collision this guard exists
      // for becomes reachable, and rebinding would hand another root's history to
      // this one. Fail closed and let a human look.
      if (existing.kind === 'corrupt' && (await this.sessionIds(projectId)).length > 0) {
        throw new ProjectIdCollisionError(
          projectId,
          resolved,
          'unreadable project.json beside existing sessions'
        );
      }
      await this.sweepTempFiles(projectId);
      const now = new Date().toISOString();
      return this.write({
        id: projectId,
        name: defaultProjectName(resolved),
        rootDir: resolved,
        additionalDirectories: [],
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  async get(projectId: string): Promise<Project> {
    const result = await this.readProject(projectId);
    if (result.kind !== 'ok') throw new ProjectNotFoundError(projectId);
    return result.project;
  }

  async list(): Promise<ListProjectsResult> {
    const directory = projectsDirectory(this.workspaceRoot);
    let entries: string[];
    try {
      entries = (await fs.readdir(directory, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch (error) {
      if (errno(error) === 'ENOENT') return { projects: [], skipped: [] };
      throw error;
    }

    const projects: Project[] = [];
    const skipped: ListProjectsResult['skipped'] = [];
    for (const projectId of entries.sort()) {
      if (!isSafeId(projectId)) {
        skipped.push({ projectId, reason: 'unsafe project directory name' });
        continue;
      }
      const result = await this.readProject(projectId);
      if (result.kind === 'ok') projects.push(result.project);
      else if (result.kind === 'corrupt') skipped.push({ projectId, reason: result.reason });
      // `missing` is a session-only directory (SessionStore creates the tree on
      // demand), not an error worth surfacing.
    }
    return { projects, skipped };
  }

  /** Changes `name` only. The id is derived from the directory and never moves. */
  async rename(projectId: string, name: string): Promise<Project> {
    const nextName = normalizeProjectName(name);
    return this.withLock(projectId, async () => {
      const current = await this.get(projectId);
      return this.write({ ...current, name: nextName, updatedAt: new Date().toISOString() });
    });
  }

  /** Per-project defaults. `null` clears a field; absent leaves it alone. */
  async setDefaults(projectId: string, patch: ProjectDefaultsPatch): Promise<Project> {
    return this.withLock(projectId, async () => {
      const current = await this.get(projectId);
      const next: {
        -readonly [K in keyof Project]: Project[K];
      } = { ...current, updatedAt: new Date().toISOString() };
      if (patch.defaultHarnessId !== undefined) {
        if (patch.defaultHarnessId === null) delete next.defaultHarnessId;
        else next.defaultHarnessId = patch.defaultHarnessId;
      }
      if (patch.permissionPolicy !== undefined) {
        if (patch.permissionPolicy === null) delete next.permissionPolicy;
        else next.permissionPolicy = patch.permissionPolicy;
      }
      return this.write(next);
    });
  }

  private async sessionIds(projectId: string): Promise<string[]> {
    return this.sessionIdsIn(projectSessionsDirectory(this.workspaceRoot, projectId));
  }

  private async sessionIdsIn(sessionsDirectory: string): Promise<string[]> {
    try {
      return (await fs.readdir(sessionsDirectory, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && isSafeId(entry.name))
        .map((entry) => entry.name);
    } catch (error) {
      if (errno(error) === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * Move every source session under the target, union the path-guard
   * directories, and remove the source. Irreversible.
   *
   * Multi-step and therefore *not* atomic on its own, so a journal is written to
   * the target first and every later step is idempotent: a crash anywhere leaves
   * a journal that {@link recoverMerges} replays to completion. Nothing is ever
   * overwritten — a session id that already exists under the target aborts the
   * merge loudly instead.
   *
   * Holds BOTH projects' locks (sorted, so a concurrent pair cannot deadlock),
   * because the move is multi-step and destructive: a rename or setDefaults
   * landing halfway through would be lost or would write into a directory this
   * is about to delete.
   */
  async merge(sourceProjectId: string, targetProjectId: string): Promise<Project> {
    if (sourceProjectId === targetProjectId) {
      throw new ProjectMergeError('Cannot merge a project into itself.');
    }
    return this.withLocks([sourceProjectId, targetProjectId], () =>
      this.mergeLocked(sourceProjectId, targetProjectId)
    );
  }

  private async mergeLocked(sourceProjectId: string, targetProjectId: string): Promise<Project> {
    const source = await this.get(sourceProjectId);
    const target = await this.get(targetProjectId);

    const journal: MergeJournal = {
      sourceProjectId,
      targetProjectId,
      sourceRootDir: source.rootDir,
      sourceAdditionalDirectories: [...source.additionalDirectories],
      startedAt: new Date().toISOString(),
    };
    await fs.mkdir(projectDirectory(this.workspaceRoot, targetProjectId), { recursive: true });
    await writeJsonAtomic(mergeJournalPath(this.workspaceRoot, targetProjectId), journal);

    return this.applyMerge(journal, target);
  }

  /**
   * Rewrite one moved session's `projectId` to the merge target. Tolerant: a
   * session whose meta is missing or unreadable must not wedge the merge, since
   * its events have already moved and recovery has to stay idempotent.
   */
  private async retargetSessionMeta(targetProjectId: string, sessionId: string): Promise<void> {
    const metaPath = path.join(
      projectSessionsDirectory(this.workspaceRoot, targetProjectId),
      sessionId,
      'meta.json'
    );
    let raw: string;
    try {
      raw = await fs.readFile(metaPath, 'utf8');
    } catch (error) {
      if (errno(error) === 'ENOENT') return;
      throw error;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof parsed !== 'object' || parsed === null) return;
    const current = parsed as Record<string, unknown>;
    if (current.projectId === targetProjectId) return;
    await writeJsonAtomic(metaPath, {
      ...current,
      projectId: targetProjectId,
      updatedAt: new Date().toISOString(),
    });
  }

  /** Steps 2-5 of a merge. Idempotent, so both `merge` and recovery use it. */
  private async applyMerge(journal: MergeJournal, target: Project | undefined): Promise<Project> {
    const { sourceProjectId, targetProjectId } = journal;
    const sourceSessions = projectSessionsDirectory(this.workspaceRoot, sourceProjectId);
    const targetSessions = projectSessionsDirectory(this.workspaceRoot, targetProjectId);
    const ids = await this.sessionIds(sourceProjectId);

    // Every destination is checked BEFORE the first rename. Discovering a
    // collision on the Nth id mid-loop would leave N-1 sessions already moved
    // and a journal on disk that replays into the same collision forever —
    // sessions split across two projects with no way out.
    const collisions: string[] = [];
    for (const sessionId of ids) {
      try {
        await fs.access(path.join(targetSessions, sessionId));
        collisions.push(sessionId);
      } catch (error) {
        if (errno(error) !== 'ENOENT') throw error;
      }
    }
    if (collisions.length > 0) {
      // Nothing has moved, so the journal describes work that will never be
      // valid. Drop it rather than leaving recovery to retry it every boot.
      await fs.rm(mergeJournalPath(this.workspaceRoot, targetProjectId), { force: true });
      throw new ProjectMergeError(
        `Session${collisions.length > 1 ? 's' : ''} ${collisions.join(', ')} already exist${
          collisions.length > 1 ? '' : 's'
        } under project ${targetProjectId}; merge aborted without moving anything.`
      );
    }

    if (ids.length > 0) await fs.mkdir(targetSessions, { recursive: true });

    // A crash between a rename below and its retarget leaves that session
    // already under the target, where `sessionIds(sourceProjectId)` can no
    // longer see it — so a later recovery pass would never revisit it and its
    // `projectId` would point at the source project this function deletes.
    // Sweeping the target first makes the retarget as re-derivable as the move.
    // `retargetSessionMeta` is a no-op once the id already matches.
    for (const sessionId of await this.sessionIdsIn(targetSessions)) {
      await this.retargetSessionMeta(targetProjectId, sessionId);
    }

    for (const sessionId of ids) {
      await fs.rename(path.join(sourceSessions, sessionId), path.join(targetSessions, sessionId));
      // The moved session's own `meta.json` still claims the source project,
      // which is deleted below — `listSessions(target)` would return sessions
      // whose `projectId` points at nothing, and any lookup built from that id
      // (readMeta, readEvents, resume) would miss. Written directly because
      // SessionStore.updateMeta refuses identity changes by design.
      await this.retargetSessionMeta(targetProjectId, sessionId);
    }

    const current = target ?? (await this.get(targetProjectId));
    const merged = await this.write({
      ...current,
      // The source's root has to keep being path-guarded or the moved sessions'
      // files fall outside every allowed directory.
      additionalDirectories: unionPaths(current.additionalDirectories, journal.sourceAdditionalDirectories, [
        journal.sourceRootDir,
      ]),
      updatedAt: new Date().toISOString(),
    });

    await fs.rm(projectDirectory(this.workspaceRoot, sourceProjectId), { recursive: true, force: true });
    await fs.rm(mergeJournalPath(this.workspaceRoot, targetProjectId), { force: true });
    return merged;
  }

  /**
   * Roll every unfinished merge forward. Call once at startup, before anything
   * lists sessions — until it runs, a crashed merge has sessions split across two
   * projects. Never throws: one wedged journal must not stop the app booting.
   */
  async recoverMerges(): Promise<MergeRecoveryResult> {
    const result: MergeRecoveryResult = { resumed: [], failed: [] };
    const directory = projectsDirectory(this.workspaceRoot);
    let entries: string[];
    try {
      entries = (await fs.readdir(directory, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && isSafeId(entry.name))
        .map((entry) => entry.name);
    } catch (error) {
      if (errno(error) === 'ENOENT') return result;
      throw error;
    }

    for (const targetProjectId of entries.sort()) {
      let journal: MergeJournal;
      try {
        journal = JSON.parse(
          await fs.readFile(mergeJournalPath(this.workspaceRoot, targetProjectId), 'utf8')
        ) as MergeJournal;
      } catch (error) {
        if (errno(error) !== 'ENOENT') {
          result.failed.push({ targetProjectId, reason: `unreadable merge journal: ${String(error)}` });
        }
        continue;
      }
      if (
        typeof journal?.sourceProjectId !== 'string' ||
        journal.targetProjectId !== targetProjectId ||
        typeof journal.sourceRootDir !== 'string'
      ) {
        result.failed.push({ targetProjectId, reason: 'malformed merge journal' });
        continue;
      }
      journal.sourceAdditionalDirectories = Array.isArray(journal.sourceAdditionalDirectories)
        ? journal.sourceAdditionalDirectories.filter((entry) => typeof entry === 'string')
        : [];
      try {
        // Same pair of locks as `merge`: recovery runs at startup, but nothing
        // stops a project operation racing it once the app is up.
        await this.withLocks([journal.sourceProjectId, targetProjectId], () =>
          this.applyMerge(journal, undefined)
        );
        result.resumed.push(targetProjectId);
      } catch (error) {
        result.failed.push({ targetProjectId, reason: String(error) });
      }
    }
    return result;
  }
}

export function createProjectStore(workspaceRoot: string): ProjectStore {
  return new ProjectStore(workspaceRoot);
}
