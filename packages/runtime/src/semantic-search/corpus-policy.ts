import * as fs from 'fs/promises';
import type { Dirent, Stats } from 'fs';
import * as path from 'path';
import { CorpusPolicyError } from './errors.js';
import type { CorpusPolicyConfig } from './config.js';
import { parseSync } from '@srgnt/contracts';
import { CorpusPolicyConfigSchema } from './config.js';

export interface CorpusFile {
  absolutePath: string;
  relativePath: string;
  size: number;
  mtimeMs: number;
}

export interface FilesystemClient {
  readdir(dirPath: string, options: { withFileTypes: true }): Promise<Dirent[]>;
  lstat(targetPath: string): Promise<Stats>;
}

export type CorpusPolicyFs = FilesystemClient;

export const realFilesystem: FilesystemClient = {
  readdir: fs.readdir,
  lstat: fs.lstat,
};

export function makeCorpusPolicyConfig(workspaceRoot: string): CorpusPolicyConfig {
  return parseSync(CorpusPolicyConfigSchema, { workspaceRoot });
}

export function isEscapedPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  try {
    return decodeURIComponent(normalized) !== normalized;
  } catch {
    return true;
  }
}

export function isExcludedDirectory(relativePath: string, config: CorpusPolicyConfig): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  if (!normalized) return false;

  const parts = normalized.split('/').filter(Boolean);
  if (parts.some((part) => part.startsWith('.'))) {
    return true;
  }

  if (isEscapedPath(normalized)) {
    return true;
  }

  return config.exclusions.some((exclusion) => {
    const normalizedExclusion = exclusion.replace(/\\/g, '/');
    return normalized === normalizedExclusion || normalized.startsWith(normalizedExclusion + '/');
  });
}

export function isExcludedPath(relativePath: string, config: CorpusPolicyConfig): boolean {
  const normalized = relativePath.replace(/\\/g, '/');

  try {
    if (decodeURIComponent(normalized) !== normalized) {
      return true;
    }
  } catch {
    return true;
  }

  const parts = normalized.split('/');
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('.')) return true;
  }

  for (const exclusion of config.exclusions) {
    const normalizedExclusion = exclusion.replace(/\\/g, '/');
    if (normalized === normalizedExclusion || normalized.startsWith(normalizedExclusion + '/')) {
      return true;
    }
  }

  if (parts.length > 0) {
    const fileName = parts[parts.length - 1];
    const hasValidExtension = config.acceptedExtensions.some((ext) =>
      fileName.toLowerCase().endsWith(ext.toLowerCase())
    );
    if (!hasValidExtension) return true;
  }

  return false;
}

export async function validateWorkspaceRoot(
  workspacePath: string,
  fsContext: FilesystemClient = realFilesystem
): Promise<Stats> {
  let rootStat: Stats;
  try {
    rootStat = await fsContext.lstat(workspacePath);
  } catch (err) {
    const errno = (err as NodeJS.ErrnoException).code;
    if (errno === 'EACCES' || errno === 'EPERM') {
      throw new CorpusPolicyError(
        `Permission denied reading workspace root: ${workspacePath}`,
        'permission-denied'
      );
    }
    throw new CorpusPolicyError(
      `Workspace root does not exist: ${workspacePath}`,
      'not-a-directory'
    );
  }

  if (rootStat.isSymbolicLink()) {
    throw new CorpusPolicyError(`Symlink rejected: ${workspacePath}`, 'symlink-rejected');
  }

  if (!rootStat.isDirectory()) {
    throw new CorpusPolicyError(
      `Workspace root is not a directory: ${workspacePath}`,
      'not-a-directory'
    );
  }

  return rootStat;
}

export async function walkCorpusFiles(
  dirPath: string,
  workspacePath: string,
  config: CorpusPolicyConfig,
  fsContext: FilesystemClient = realFilesystem,
  visitedDirs: Set<string> = new Set<string>(),
  files: CorpusFile[] = []
): Promise<CorpusFile[]> {
  const normalized = path.normalize(dirPath);
  if (visitedDirs.has(normalized)) return files;
  visitedDirs.add(normalized);

  let entries: Dirent[];
  try {
    entries = await fsContext.readdir(normalized, { withFileTypes: true });
  } catch (err) {
    const errno = (err as NodeJS.ErrnoException).code;
    if (errno === 'EACCES' || errno === 'EPERM') {
      throw new CorpusPolicyError(
        `Permission denied reading directory: ${normalized}`,
        'permission-denied'
      );
    }
    return files;
  }

  for (const entry of entries) {
    const entryPath = path.join(normalized, entry.name);

    let stat: Stats;
    try {
      stat = await fsContext.lstat(entryPath);
    } catch (err) {
      const errno = (err as NodeJS.ErrnoException).code;
      if (errno === 'EACCES' || errno === 'EPERM') {
        throw new CorpusPolicyError(`Permission denied: ${entryPath}`, 'permission-denied');
      }
      continue;
    }

    if (stat.isSymbolicLink()) {
      throw new CorpusPolicyError(`Symlink rejected: ${entryPath}`, 'symlink-rejected');
    }

    const relativePath = path.relative(workspacePath, entryPath);

    if (entry.isDirectory()) {
      if (isExcludedDirectory(relativePath, config)) {
        continue;
      }
      await walkCorpusFiles(entryPath, workspacePath, config, fsContext, visitedDirs, files);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (isExcludedPath(relativePath, config)) {
      continue;
    }

    if (stat.size > config.maxFileSizeBytes) {
      continue;
    }

    files.push({
      absolutePath: entryPath,
      relativePath: relativePath.replace(/\\/g, '/'),
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    });
  }

  return files;
}

export async function collectCorpusFiles(config: CorpusPolicyConfig): Promise<CorpusFile[]> {
  const workspacePath = path.resolve(config.workspaceRoot);
  await validateWorkspaceRoot(workspacePath, realFilesystem);

  const files = await walkCorpusFiles(
    workspacePath,
    workspacePath,
    config,
    realFilesystem,
    new Set<string>(),
    []
  );

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return files;
}
