import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { DesktopSettings } from '@srgnt/contracts';
import {
  defaultDesktopSettings,
  getDesktopSettingsPath,
  mergeDesktopSettings,
  readDesktopSettings,
  writeDesktopSettings,
  ensureWorkspaceLayout,
} from '../settings.js';

/**
 * Resolve the workspace root the CLI should operate against.
 *
 * Precedence (highest first):
 *   1. explicit `--workspace <path>` flag (caller normalises to absolute path);
 *   2. `SRGNT_WORKSPACE` environment variable;
 *   3. `~/srgnt-workspace` default (matches `resolveDefaultWorkspaceRoot`).
 *
 * The CLI refuses to run if none of these resolve to an existing directory. It
 * never creates a workspace silently — that path belongs to the Electron
 * onboarding flow.
 */
export async function resolveCliWorkspaceRoot(options: {
  explicit?: string | undefined;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}): Promise<{ workspaceRoot: string; source: 'flag' | 'env' | 'default' }>  {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? os.homedir();

  let candidate: string | undefined;
  let source: 'flag' | 'env' | 'default' = 'default';

  if (options.explicit && options.explicit.trim() !== '') {
    candidate = path.resolve(options.explicit.trim());
    source = 'flag';
  } else if (env.SRGNT_WORKSPACE && env.SRGNT_WORKSPACE.trim() !== '') {
    candidate = path.resolve(env.SRGNT_WORKSPACE.trim());
    source = 'env';
  } else {
    candidate = path.join(homeDir, 'srgnt-workspace');
    source = 'default';
  }

  try {
    const stat = await fs.stat(candidate);
    if (!stat.isDirectory()) {
      throw new CliError(
        'WORKSPACE_NOT_A_DIRECTORY',
        `Workspace path is not a directory: ${candidate}`,
      );
    }
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      'WORKSPACE_NOT_FOUND',
      `Workspace directory does not exist: ${candidate}. Run the desktop app first or pass --workspace <path>.`,
    );
  }

  return { workspaceRoot: candidate, source };
}

/**
 * Load the current desktop settings for the workspace, ensuring they pass the
 * same merge/migration path the Electron main uses.
 */
export async function loadWorkspaceSettings(workspaceRoot: string): Promise<DesktopSettings> {
  const settings = await readDesktopSettings(workspaceRoot);
  // readDesktopSettings already runs mergeDesktopSettings, but be defensive so
  // the CLI never observes a mis-shaped persisted record.
  return mergeDesktopSettings(settings);
}

/**
 * Persist desktop settings from the CLI. Always writes the merged form so the
 * Electron main does not need to re-migrate on next boot.
 */
export async function persistWorkspaceSettings(
  workspaceRoot: string,
  next: DesktopSettings,
): Promise<void> {
  const merged = mergeDesktopSettings(next);
  await ensureWorkspaceLayout(workspaceRoot);
  await writeDesktopSettings(workspaceRoot, merged);
}

export function describeSettingsPath(workspaceRoot: string): string {
  return getDesktopSettingsPath(workspaceRoot);
}

export { defaultDesktopSettings };

/**
 * Structured CLI error so callers can map to exit codes and stable error codes
 * without losing the human-readable message.
 */
export class CliError extends Error {
  public readonly code: string;
  public readonly details?: string;

  constructor(code: string, message: string, details?: string) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.details = details;
  }
}
