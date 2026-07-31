import { createHash } from 'crypto';
import * as path from 'path';
import { workspaceDirectories } from '@srgnt/contracts';
import { projectDirectory } from '../sessions/paths.js';

/** Files inside one project directory, beside `sessions/`. */
export const projectFileNames = {
  project: 'project.json',
  /** Written before a merge starts; its presence means a merge is unfinished. */
  mergeJournal: 'merge.journal.json',
} as const;

/**
 * Project id = the first 12 hex chars of `sha256(path.resolve(rootDir))`.
 *
 * Deterministic and path-safe, so the same directory maps to the same project
 * across restarts with no lookup table to keep in sync. `path.resolve` — NOT
 * `realpath`: a symlinked checkout is deliberately its own project, because the
 * path the user opened is the identity they think in.
 *
 * 12 hex chars is ~48 bits, so a collision is possible in principle. It is not a
 * correctness risk because `ensureProjectForDir` compares the stored `rootDir`
 * before reusing a project and fails closed on a mismatch; the slice length is
 * therefore a tunable, not an invariant.
 */
export function deriveProjectId(rootDir: string): string {
  return createHash('sha256').update(path.resolve(rootDir)).digest('hex').slice(0, 12);
}

export function projectsDirectory(workspaceRoot: string): string {
  return path.join(workspaceRoot, workspaceDirectories.projects);
}

export function projectFilePath(workspaceRoot: string, projectId: string): string {
  return path.join(projectDirectory(workspaceRoot, projectId), projectFileNames.project);
}

export function mergeJournalPath(workspaceRoot: string, projectId: string): string {
  return path.join(projectDirectory(workspaceRoot, projectId), projectFileNames.mergeJournal);
}
