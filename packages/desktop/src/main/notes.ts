import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';

export interface NoteEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  modifiedAt: string;
}

export interface SearchResult {
  title: string;
  path: string;
  snippet: string;
  score: number;
}

export interface WorkspaceMarkdownEntry {
  title: string;
  path: string;
  modifiedAt: string;
}

// File size limit: 5MB to bound search/indexing work
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Path helpers

export function getNotesDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, 'Notes');
}

export async function ensureNotesDir(workspaceRoot: string): Promise<void> {
  const notesDir = getNotesDir(workspaceRoot);
  await fs.mkdir(notesDir, { recursive: true });
}

/**
 * Validates that a requested path is within the Notes directory.
 * Uses path.resolve() containment check PLUS fs.lstat() symlink rejection.
 * Returns the resolved path if valid, null if validation fails.
 */
export async function validateNotesPath(
  workspaceRoot: string,
  requestedPath: string
): Promise<string | null> {
  const notesDir = getNotesDir(workspaceRoot);

  // Resolve the requested path to an absolute path
  const resolvedPath = path.resolve(notesDir, requestedPath);

  // Check containment: resolved path must start with notesDir
  // Using path.join ensures proper path normalization
  const normalizedResolved = path.normalize(resolvedPath);
  const normalizedNotesDir = path.normalize(notesDir);

  if (!normalizedResolved.startsWith(normalizedNotesDir + path.sep) &&
      normalizedResolved !== normalizedNotesDir) {
    return null;
  }

  // Reject symlinks using lstat
  try {
    const stat = await fs.lstat(resolvedPath);
    if (stat.isSymbolicLink()) {
      return null;
    }
  } catch (err) {
    // If file doesn't exist, that's okay for validation (read operations will handle missing files)
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      return null;
    }
  }

  return resolvedPath;
}

// Tree/list operations

export async function listNotes(
  workspaceRoot: string,
  subPath?: string
): Promise<NoteEntry[]> {
  const basePath = getNotesDir(workspaceRoot);
  const targetPath = subPath ? path.join(basePath, subPath) : basePath;

  const validatedPath = await validateNotesPath(workspaceRoot, subPath ?? '');
  if (!validatedPath) {
    return [];
  }

  let dirEntries: import('node:fs').Dirent[];
  try {
    dirEntries = await fs.readdir(targetPath, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  const result: NoteEntry[] = [];
  for (const entry of dirEntries) {
    // Skip hidden directories and files
    if (entry.name.startsWith('.')) {
      continue;
    }

    const entryPath = path.join(targetPath, entry.name);
    
    // Reject symlinks
    try {
      const stat = await fs.lstat(entryPath);
      if (stat.isSymbolicLink()) {
        continue;
      }
    } catch {
      continue;
    }

    // Only include directories and markdown files
    if (!entry.isDirectory() && !entry.name.endsWith('.md')) {
      continue;
    }

    let modifiedAt: string;
    try {
      const stat = await fs.stat(entryPath);
      modifiedAt = stat.mtime.toISOString();
    } catch {
      modifiedAt = new Date().toISOString();
    }

    result.push({
      name: entry.name,
      path: entryPath,
      isDirectory: entry.isDirectory(),
      modifiedAt,
    });
  }

  // Sort: directories first, then files, alphabetically
  result.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

// Read operations

export async function readNote(
  workspaceRoot: string,
  filePath: string
): Promise<{ content: string; modifiedAt: string }> {
  const validatedPath = await validateNotesPath(workspaceRoot, filePath);
  if (!validatedPath) {
    throw new Error(`Invalid path: ${filePath}`);
  }

  // Check file size before reading
  const stat = await fs.stat(validatedPath);
  if (stat.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large: ${stat.size} bytes (max: ${MAX_FILE_SIZE_BYTES})`);
  }

  const content = await fs.readFile(validatedPath, 'utf-8');
  const modifiedAt = stat.mtime.toISOString();

  return { content, modifiedAt };
}

// Write operations (atomic per DEC-0008)

export async function writeNote(
  workspaceRoot: string,
  filePath: string,
  content: string
): Promise<{ path: string; modifiedAt: string }> {
  const validatedPath = await validateNotesPath(workspaceRoot, filePath);
  if (!validatedPath) {
    throw new Error(`Invalid path: ${filePath}`);
  }

  // Check content size
  const contentBytes = Buffer.byteLength(content, 'utf-8');
  if (contentBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Content too large: ${contentBytes} bytes (max: ${MAX_FILE_SIZE_BYTES})`);
  }

  const dir = path.dirname(validatedPath);
  const tempPath = `${validatedPath}.tmp`;

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Step 1: Write to .tmp sibling file
  await fs.writeFile(tempPath, content, 'utf-8');

  // Step 2: fsync the temp file to ensure it's written to disk
  const tempFd = await fsSync.promises.open(tempPath, 'r+');
  try {
    await tempFd.sync();
  } finally {
    await tempFd.close();
  }

  // Step 3: rename temp to final path
  // On Unix this is atomic if tempPath and validatedPath are on the same filesystem
  await fs.rename(tempPath, validatedPath);

  const modifiedAt = new Date().toISOString();
  return { path: validatedPath, modifiedAt };
}

// Create operations

export async function createNote(
  workspaceRoot: string,
  filePath: string,
  title: string
): Promise<{ path: string; createdAt: string }> {
  const validatedPath = await validateNotesPath(workspaceRoot, filePath);
  if (!validatedPath) {
    throw new Error(`Invalid path: ${filePath}`);
  }

  // Check if file already exists
  try {
    await fs.access(validatedPath);
    throw new Error(`File already exists: ${filePath}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  const createdAt = new Date().toISOString();
  const frontmatter = `---
title: ${title}
created: ${createdAt}
---

`;

  // Use atomic write for new file as well
  const dir = path.dirname(validatedPath);
  await fs.mkdir(dir, { recursive: true });

  const tempPath = `${validatedPath}.tmp`;
  await fs.writeFile(tempPath, frontmatter, 'utf-8');

  const fd = await fsSync.promises.open(tempPath, 'r+');
  try {
    await fd.sync();
  } finally {
    await fd.close();
  }

  await fs.rename(tempPath, validatedPath);

  return { path: validatedPath, createdAt };
}

export async function createFolder(
  workspaceRoot: string,
  dirPath: string
): Promise<{ path: string }> {
  const validatedPath = await validateNotesPath(workspaceRoot, dirPath);
  if (!validatedPath) {
    throw new Error(`Invalid path: ${dirPath}`);
  }

  // Check if directory already exists
  try {
    const stat = await fs.stat(validatedPath);
    if (stat.isDirectory()) {
      throw new Error(`Directory already exists: ${dirPath}`);
    }
    throw new Error(`Path exists but is not a directory: ${dirPath}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  await fs.mkdir(validatedPath, { recursive: true });

  return { path: validatedPath };
}

// Destructive operations

export async function deleteEntry(
  workspaceRoot: string,
  pathToDelete: string,
  isDirectory: boolean
): Promise<{ deleted: boolean }> {
  const validatedPath = await validateNotesPath(workspaceRoot, pathToDelete);
  if (!validatedPath) {
    throw new Error(`Invalid path: ${pathToDelete}`);
  }

  if (isDirectory) {
    // Check if directory is empty - reject recursive delete
    const entries = await fs.readdir(validatedPath);
    if (entries.length > 0) {
      throw new Error(`Cannot delete non-empty directory: ${pathToDelete}`);
    }
    await fs.rmdir(validatedPath);
  } else {
    await fs.unlink(validatedPath);
  }

  return { deleted: true };
}

export async function renameEntry(
  workspaceRoot: string,
  oldPath: string,
  newName: string
): Promise<{ newPath: string }> {
  const validatedOldPath = await validateNotesPath(workspaceRoot, oldPath);
  if (!validatedOldPath) {
    throw new Error(`Invalid path: ${oldPath}`);
  }

  // Validate new name doesn't contain path separators
  if (newName.includes('/') || (process.platform === 'win32' && newName.includes('\\'))) {
    throw new Error(`Invalid name: ${newName}`);
  }

  // Prevent hidden files
  if (newName.startsWith('.')) {
    throw new Error(`Cannot create hidden files/directories: ${newName}`);
  }

  const dir = path.dirname(validatedOldPath);
  const newPath = path.join(dir, newName);

  // Validate the new path is still within Notes
  const validatedNewPath = await validateNotesPath(workspaceRoot, path.relative(getNotesDir(workspaceRoot), newPath));
  if (!validatedNewPath) {
    throw new Error(`Invalid new path: ${newPath}`);
  }

  // Check if new path already exists (fail on collision)
  try {
    await fs.access(validatedNewPath);
    throw new Error(`Destination already exists: ${newName}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  await fs.rename(validatedOldPath, validatedNewPath);

  return { newPath: validatedNewPath };
}

// Search (stub — returns empty until Step 07)

export async function searchNotes(
  _workspaceRoot: string,
  _query: string,
  _maxResults?: number
): Promise<SearchResult[]> {
  // Stub implementation - full search will be implemented in Step 07
  return [];
}

// Workspace-wide markdown helpers (stub — returns empty until Steps 05/07)

export async function listWorkspaceMarkdown(
  _workspaceRoot: string,
  _query?: string,
  _maxResults?: number
): Promise<WorkspaceMarkdownEntry[]> {
  // Stub implementation - full search will be implemented in Step 07
  return [];
}

export async function resolveWikilink(
  _workspaceRoot: string,
  _wikilink: string
): Promise<{ resolved: boolean; path: string; line?: number }> {
  // Stub implementation - will be implemented when wikilink resolution is needed
  return { resolved: false, path: '' };
}

// IPC handler registration
import { ipcMain } from 'electron';
import {
  ipcChannels,
  parseSync,
  SNotesCreateFileRequest,
  SNotesCreateFolderRequest,
  SNotesDeleteRequest,
  SNotesListDirRequest,
  SNotesListWorkspaceMarkdownRequest,
  SNotesReadFileRequest,
  SNotesRenameRequest,
  SNotesResolveWikilinkRequest,
  SNotesSearchRequest,
  SNotesWriteFileRequest,
  type NotesListDirResponse,
  type NotesReadFileResponse,
  type NotesWriteFileResponse,
  type NotesCreateFileResponse,
  type NotesCreateFolderResponse,
  type NotesDeleteResponse,
  type NotesRenameResponse,
  type NotesSearchResponse,
  type NotesResolveWikilinkResponse,
  type NotesListWorkspaceMarkdownResponse,
} from '@srgnt/contracts';

export function registerNotesHandlers(workspaceRoot: string): void {
  ipcMain.removeHandler(ipcChannels.notesListDir);
  ipcMain.removeHandler(ipcChannels.notesReadFile);
  ipcMain.removeHandler(ipcChannels.notesWriteFile);
  ipcMain.removeHandler(ipcChannels.notesCreateFile);
  ipcMain.removeHandler(ipcChannels.notesCreateFolder);
  ipcMain.removeHandler(ipcChannels.notesDelete);
  ipcMain.removeHandler(ipcChannels.notesRename);
  ipcMain.removeHandler(ipcChannels.notesSearch);
  ipcMain.removeHandler(ipcChannels.notesResolveWikilink);
  ipcMain.removeHandler(ipcChannels.notesListWorkspaceMarkdown);

  // List directory contents
  ipcMain.handle(ipcChannels.notesListDir, async (_event, rawPayload) => {
    const payload = parseSync(SNotesListDirRequest, rawPayload ?? { dirPath: '' });
    const entries = await listNotes(workspaceRoot, payload.dirPath || undefined);
    return { entries } as NotesListDirResponse;
  });

  // Read a note file
  ipcMain.handle(ipcChannels.notesReadFile, async (_event, rawPayload) => {
    const payload = parseSync(SNotesReadFileRequest, rawPayload);
    return await readNote(workspaceRoot, payload.filePath) as NotesReadFileResponse;
  });

  // Write a note file (atomic write)
  ipcMain.handle(ipcChannels.notesWriteFile, async (_event, rawPayload) => {
    const payload = parseSync(SNotesWriteFileRequest, rawPayload);
    return await writeNote(workspaceRoot, payload.filePath, payload.content) as NotesWriteFileResponse;
  });

  // Create a new note file with frontmatter
  ipcMain.handle(ipcChannels.notesCreateFile, async (_event, rawPayload) => {
    const payload = parseSync(SNotesCreateFileRequest, rawPayload);
    return await createNote(workspaceRoot, payload.filePath, payload.title) as NotesCreateFileResponse;
  });

  // Create a new folder
  ipcMain.handle(ipcChannels.notesCreateFolder, async (_event, rawPayload) => {
    const payload = parseSync(SNotesCreateFolderRequest, rawPayload);
    return await createFolder(workspaceRoot, payload.dirPath) as NotesCreateFolderResponse;
  });

  // Delete a file or empty folder
  ipcMain.handle(ipcChannels.notesDelete, async (_event, rawPayload) => {
    const payload = parseSync(SNotesDeleteRequest, rawPayload);
    return await deleteEntry(workspaceRoot, payload.path, payload.isDirectory) as NotesDeleteResponse;
  });

  // Rename a file or folder
  ipcMain.handle(ipcChannels.notesRename, async (_event, rawPayload) => {
    const payload = parseSync(SNotesRenameRequest, rawPayload);
    return await renameEntry(workspaceRoot, payload.oldPath, payload.newName) as NotesRenameResponse;
  });

  // Search notes (stub)
  ipcMain.handle(ipcChannels.notesSearch, async (_event, rawPayload) => {
    const payload = parseSync(SNotesSearchRequest, rawPayload ?? { query: '', maxResults: 20 });
    const results = await searchNotes(workspaceRoot, payload.query, payload.maxResults);
    return { results } as NotesSearchResponse;
  });

  // Resolve wikilink (stub)
  ipcMain.handle(ipcChannels.notesResolveWikilink, async (_event, rawPayload) => {
    const payload = parseSync(SNotesResolveWikilinkRequest, rawPayload);
    return await resolveWikilink(workspaceRoot, payload.wikilink) as NotesResolveWikilinkResponse;
  });

  // List workspace markdown files (stub)
  ipcMain.handle(ipcChannels.notesListWorkspaceMarkdown, async (_event, rawPayload) => {
    const payload = parseSync(SNotesListWorkspaceMarkdownRequest, rawPayload ?? { query: '', maxResults: 20 });
    const files = await listWorkspaceMarkdown(workspaceRoot, payload.query, payload.maxResults);
    return { files } as NotesListWorkspaceMarkdownResponse;
  });
}
