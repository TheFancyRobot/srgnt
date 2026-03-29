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
  const dirs: string[] = [];

  for (const dir of layout.rootDirectories) {
    dirs.push(path.join(workspaceRoot, dir.path));
  }

  for (const [, dirPath] of Object.entries(layout.commandCenter.subdirectories)) {
    dirs.push(path.join(workspaceRoot, dirPath));
  }

  return dirs;
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
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
  const rootDirectories = layout.rootDirectories.map((dir) => ({
    ...dir,
    path: path.join(workspaceRoot, dir.path),
  }));

  const subdirectories: Record<string, string> = {};
  for (const [key, dirPath] of Object.entries(layout.commandCenter.subdirectories)) {
    subdirectories[key] = path.join(workspaceRoot, dirPath);
  }

  return {
    ...layout,
    rootDirectories,
    commandCenter: {
      ...layout.commandCenter,
      subdirectories,
    },
  }
}

export async function bootstrapWorkspace(
  workspaceRoot: string,
  options: { create?: boolean } = {}
): Promise<BootstrapResult> {
  const layout = defaultWorkspaceLayout;

  if (options.create) {
    try {
      await createDirectory(workspaceRoot);
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
        throw new WorkspaceBootstrapError(
          `Permission denied creating workspace root: ${workspaceRoot}`,
          'permission-denied'
        );
      }
      throw new WorkspaceBootstrapError(
        `Failed to create workspace root: ${(error as Error).message}`,
        'unknown'
      );
    }
  } else {
    await validateWorkspaceRoot(workspaceRoot);
  }

  const targetDirs = resolveDirectoryPaths(workspaceRoot, layout);
  const missingDirectories: string[] = [];
  const createdDirs: string[] = [];

  for (const dirPath of targetDirs) {
    const exists = await directoryExists(dirPath);
    if (!exists) {
      try {
        await createDirectory(dirPath);
        createdDirs.push(dirPath);
      } catch (error: unknown) {
        missingDirectories.push(dirPath);
        if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
          throw new WorkspaceBootstrapError(
            `Permission denied creating directory: ${dirPath}`,
            'permission-denied'
          );
        }
        throw new WorkspaceBootstrapError(
          `Failed to create directory ${dirPath}: ${(error as Error).message}`,
          'unknown'
        );
      }
    }
  }

  const resolvedLayout = buildWorkspaceLayout(workspaceRoot, layout);

  return {
    workspaceRoot: {
      path: workspaceRoot,
      layout: resolvedLayout,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    },
    created: createdDirs.length > 0,
    missingDirectories,
  };
}

export async function validateWorkspace(
  workspaceRoot: string
): Promise<{ valid: boolean; missingDirectories: string[] }> {
  await validateWorkspaceRoot(workspaceRoot);

  const layout = defaultWorkspaceLayout;
  const targetDirs = resolveDirectoryPaths(workspaceRoot, layout);
  const missingDirectories: string[] = [];

  for (const dirPath of targetDirs) {
    const exists = await directoryExists(dirPath);
    if (!exists) {
      missingDirectories.push(dirPath);
    }
  }

  return {
    valid: missingDirectories.length === 0,
    missingDirectories,
  };
}