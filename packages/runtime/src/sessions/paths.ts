import * as path from 'path';
import { workspaceDirectories } from '@srgnt/contracts';

/** File names inside one session directory. */
export const sessionFileNames = {
  events: 'events.jsonl',
  meta: 'meta.json',
  /** Derived, checkpointed markdown render of `events.jsonl` (STEP-24-05). */
  transcript: 'transcript.md',
} as const;

/** Directory holding one project's sessions, relative to the project directory. */
export const projectSessionsDirName = 'sessions';

/**
 * Project and session ids become directory names, so they are constrained to a
 * conservative alphabet rather than sanitized. The leading character must be
 * alphanumeric, which rules out `.`, `..`, and dotfiles; `/`, `\`, NUL, and
 * every other separator are simply not in the set.
 */
const safeIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export class SessionPathError extends Error {
  constructor(
    message: string,
    public readonly field: 'projectId' | 'sessionId'
  ) {
    super(message);
    this.name = 'SessionPathError';
  }
}

export function assertSafeId(field: 'projectId' | 'sessionId', id: string): string {
  if (typeof id !== 'string' || !safeIdPattern.test(id)) {
    throw new SessionPathError(
      `Unsafe ${field} for a directory name: ${JSON.stringify(id)}`,
      field
    );
  }
  return id;
}

export function isSafeId(id: string): boolean {
  return typeof id === 'string' && safeIdPattern.test(id);
}

export function projectDirectory(workspaceRoot: string, projectId: string): string {
  return path.join(workspaceRoot, workspaceDirectories.projects, assertSafeId('projectId', projectId));
}

export function projectSessionsDirectory(workspaceRoot: string, projectId: string): string {
  return path.join(projectDirectory(workspaceRoot, projectId), projectSessionsDirName);
}

export function sessionDirectory(
  workspaceRoot: string,
  projectId: string,
  sessionId: string
): string {
  return path.join(
    projectSessionsDirectory(workspaceRoot, projectId),
    assertSafeId('sessionId', sessionId)
  );
}

export interface SessionPaths {
  directory: string;
  events: string;
  meta: string;
  transcript: string;
}

export function sessionPaths(
  workspaceRoot: string,
  projectId: string,
  sessionId: string
): SessionPaths {
  const directory = sessionDirectory(workspaceRoot, projectId, sessionId);
  return {
    directory,
    events: path.join(directory, sessionFileNames.events),
    meta: path.join(directory, sessionFileNames.meta),
    transcript: path.join(directory, sessionFileNames.transcript),
  };
}
