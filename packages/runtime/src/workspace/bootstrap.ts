import * as fs from 'fs/promises';
import * as path from 'path';
import {
  type WorkspaceLayout,
  type WorkspaceRoot,
  defaultWorkspaceLayout,
} from '@srgnt/contracts';

export interface BootstrapResult {
  workspaceRoot: WorkspaceRoot;
  created: boolean;
  missingDirectories: string[];
}

export class WorkspaceBootstrapError extends Error {
  constructor(
    message: string,
    public readonly cause?: 'permission-denied' | 'not-a-directory' | 'unknown'
  ) {
    super(message);
    this.name = 'WorkspaceBootstrapError';
  }
}

function resolveDirectoryPaths(workspaceRoot: string, layout: WorkspaceLayout): string[] {
  return layout.directories.map((dir) => path.join(workspaceRoot, dir.path));
}

function resolveSeedFiles(
  workspaceRoot: string,
  layout: WorkspaceLayout
): Array<{ path: string; defaultContent: string }> {
  return layout.seedFiles.map((file) => ({
    path: path.join(workspaceRoot, file.path),
    defaultContent: file.defaultContent,
  }));
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function createDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
}

async function validateWorkspaceRoot(workspaceRoot: string): Promise<void> {
  const exists = await directoryExists(workspaceRoot);
  if (!exists) {
    throw new WorkspaceBootstrapError(
      `Workspace root does not exist: ${workspaceRoot}`,
      'not-a-directory'
    );
  }

  const stat = await fs.stat(workspaceRoot);
  if (!stat.isDirectory()) {
    throw new WorkspaceBootstrapError(
      `Workspace root is not a directory: ${workspaceRoot}`,
      'not-a-directory'
    );
  }
}

function buildWorkspaceLayout(workspaceRoot: string, layout: WorkspaceLayout): WorkspaceLayout {
  return {
    ...layout,
    directories: layout.directories.map((dir) => ({
      ...dir,
      path: path.join(workspaceRoot, dir.path),
    })),
    seedFiles: layout.seedFiles.map((file) => ({
      ...file,
      path: path.join(workspaceRoot, file.path),
    })),
  };
}

function toBootstrapError(error: unknown, subject: string): WorkspaceBootstrapError {
  if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
    return new WorkspaceBootstrapError(`Permission denied: ${subject}`, 'permission-denied');
  }
  return new WorkspaceBootstrapError(
    `${subject}: ${(error as Error).message}`,
    'unknown'
  );
}

/**
 * Create or repair the workspace v2 layout under `workspaceRoot`:
 * `projects/`, `groups/templates/`, and seed `harnesses.json` / `settings.json`.
 *
 * Strictly additive: existing files are never overwritten and unknown
 * directories (including aggregator-era v1 layout dirs) are ignored, never
 * removed. Re-running on a complete workspace is a no-op (`created: false`).
 */
export async function bootstrapWorkspace(
  workspaceRoot: string,
  options: { create?: boolean } = {}
): Promise<BootstrapResult> {
  const layout = defaultWorkspaceLayout;

  if (options.create) {
    try {
      await createDirectory(workspaceRoot);
    } catch (error: unknown) {
      throw toBootstrapError(error, `creating workspace root ${workspaceRoot}`);
    }
  } else {
    await validateWorkspaceRoot(workspaceRoot);
  }

  const missingDirectories: string[] = [];
  let createdAnything = false;

  for (const dirPath of resolveDirectoryPaths(workspaceRoot, layout)) {
    const exists = await directoryExists(dirPath);
    if (!exists) {
      try {
        await createDirectory(dirPath);
        createdAnything = true;
      } catch (error: unknown) {
        missingDirectories.push(dirPath);
        throw toBootstrapError(error, `creating directory ${dirPath}`);
      }
    }
  }

  for (const seedFile of resolveSeedFiles(workspaceRoot, layout)) {
    const exists = await fileExists(seedFile.path);
    if (!exists) {
      try {
        // 'wx' guards against clobbering a file created between check and write.
        await fs.writeFile(seedFile.path, seedFile.defaultContent, { encoding: 'utf8', flag: 'wx' });
        createdAnything = true;
      } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
          continue;
        }
        throw toBootstrapError(error, `creating seed file ${seedFile.path}`);
      }
    }
  }

  return {
    workspaceRoot: {
      path: workspaceRoot,
      layout: buildWorkspaceLayout(workspaceRoot, layout),
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    },
    created: createdAnything,
    missingDirectories,
  };
}

/**
 * Report which v2 layout directories and seed files are absent without
 * creating anything.
 */
export async function validateWorkspace(
  workspaceRoot: string
): Promise<{ valid: boolean; missingDirectories: string[]; missingFiles: string[] }> {
  await validateWorkspaceRoot(workspaceRoot);

  const layout = defaultWorkspaceLayout;
  const missingDirectories: string[] = [];
  const missingFiles: string[] = [];

  for (const dirPath of resolveDirectoryPaths(workspaceRoot, layout)) {
    if (!(await directoryExists(dirPath))) {
      missingDirectories.push(dirPath);
    }
  }

  for (const seedFile of resolveSeedFiles(workspaceRoot, layout)) {
    if (!(await fileExists(seedFile.path))) {
      missingFiles.push(seedFile.path);
    }
  }

  return {
    valid: missingDirectories.length === 0 && missingFiles.length === 0,
    missingDirectories,
    missingFiles,
  };
}
