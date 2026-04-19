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

  // Check containment: resolved path must stay inside Notes
  const normalizedResolved = path.normalize(resolvedPath);
  const normalizedNotesDir = path.normalize(notesDir);

  if (!normalizedResolved.startsWith(normalizedNotesDir + path.sep) &&
      normalizedResolved !== normalizedNotesDir) {
    return null;
  }

  // Reject symlinked Notes root itself
  try {
    const notesDirStat = await fs.lstat(notesDir);
    if (notesDirStat.isSymbolicLink()) {
      return null;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      return null;
    }
  }

  // Reject symlinks on the final path AND any existing ancestor segment inside Notes.
  // This blocks paths like Notes/link-dir/file.md where link-dir is a symlink escaping Notes.
  const relativePath = path.relative(normalizedNotesDir, normalizedResolved);
  const segments = relativePath ? relativePath.split(path.sep).filter(Boolean) : [];
  let currentPath = normalizedNotesDir;

  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    try {
      const stat = await fs.lstat(currentPath);
      if (stat.isSymbolicLink()) {
        return null;
      }
    } catch (err) {
      // If a segment does not exist yet, remaining descendants cannot be symlinks yet.
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        break;
      }
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
  // Escape title for YAML double-quoted scalar: escape backslashes first, then double-quotes
  const escapedTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const frontmatter = `---
title: "${escapedTitle}"
created: "${createdAt}"
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

// Mtime-based content cache for search
const searchContentCache = new Map<string, { mtime: number; content: string }>();

/**
 * Walk workspace recursively to collect all .md files.
 * Reuses the same exclusion logic as listWorkspaceMarkdown.
 */
async function collectSearchFiles(workspaceRoot: string): Promise<string[]> {
  const workspacePath = path.normalize(workspaceRoot);
  const excludePath = path.normalize(path.join(workspaceRoot, '.command-center'));
  const files: string[] = [];
  const processedDirs = new Set<string>();

  async function walk(dirPath: string) {
    const normalized = path.normalize(dirPath);
    if (processedDirs.has(normalized)) return;
    processedDirs.add(normalized);
    if (normalized.startsWith(excludePath)) return;

    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(normalized, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const entryPath = path.join(normalized, entry.name);

      try {
        const stat = await fs.lstat(entryPath);
        if (stat.isSymbolicLink()) continue;

        if (entry.isDirectory()) {
          await walk(entryPath);
        } else if (entry.name.endsWith('.md')) {
          if (stat.size > MAX_FILE_SIZE_BYTES) continue;
          files.push(entryPath);
        }
      } catch {
        continue;
      }
    }
  }

  await walk(workspacePath);
  return files;
}

/**
 * Get file content with mtime-based caching.
 */
async function getCachedContent(filePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    const cached = searchContentCache.get(filePath);
    if (cached && cached.mtime === stat.mtimeMs) {
      return cached.content;
    }
    const content = await fs.readFile(filePath, 'utf-8');
    searchContentCache.set(filePath, { mtime: stat.mtimeMs, content });
    return content;
  } catch {
    return null;
  }
}

/**
 * Extract a snippet around the first occurrence of query in content.
 * Returns ~150-200 chars centered on the match, trimmed to word boundaries,
 * with the match wrapped in **bold** markdown.
 */
function extractSnippet(content: string, query: string): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerContent.indexOf(lowerQuery);

  if (matchIndex === -1) {
    // Fallback: return start of content
    const end = Math.min(content.length, 200);
    return content.slice(0, end) + (content.length > end ? '...' : '');
  }

  const SNIPPET_RADIUS = 100;
  const matchEnd = matchIndex + query.length;

  let start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  let end = Math.min(content.length, matchEnd + SNIPPET_RADIUS);

  // Expand to word boundaries
  if (start > 0) {
    const spaceBefore = content.lastIndexOf(' ', start);
    if (spaceBefore > start - 40) start = spaceBefore + 1;
  }
  if (end < content.length) {
    const spaceAfter = content.indexOf(' ', end);
    if (spaceAfter !== -1 && spaceAfter < end + 40) end = spaceAfter;
  }

  const prefix = start > 0 ? '...' : '';
  const suffix = end < content.length ? '...' : '';

  const before = content.slice(start, matchIndex);
  const matched = content.slice(matchIndex, matchEnd);
  const after = content.slice(matchEnd, end);

  return `${prefix}${before}**${matched}**${after}${suffix}`;
}

/**
 * Search all workspace markdown files for the given query.
 * Returns ranked results with snippets and scores.
 */
export async function searchNotes(
  workspaceRoot: string,
  query: string,
  maxResults: number = 20
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const workspacePath = path.normalize(workspaceRoot);
  const files = await collectSearchFiles(workspaceRoot);
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const filePath of files) {
    const fileName = path.basename(filePath, '.md');
    const relativePath = path.relative(workspacePath, filePath).replace(/\\/g, '/');

    // Score: title/filename matching
    let score = 0;
    if (fileName.toLowerCase() === lowerQuery) {
      score = 100;
    } else if (fileName.toLowerCase().includes(lowerQuery)) {
      score = 50;
    }

    const content = await getCachedContent(filePath);
    if (!content) continue;

    // Try frontmatter title for higher-quality title
    let title = fileName;
    const fmMatch = content.match(/^---\s*\ntitle:\s*(.+?)\s*$/m);
    if (fmMatch) title = fmMatch[1].trim();

    // Score: frontmatter title matching
    if (score === 0) {
      if (title.toLowerCase() === lowerQuery) {
        score = 100;
      } else if (title.toLowerCase().includes(lowerQuery)) {
        score = 50;
      }
    }

    // Score: body content matching
    if (score === 0) {
      if (content.toLowerCase().includes(lowerQuery)) {
        score = 10;
      } else {
        continue; // No match at all
      }
    }

    const snippet = extractSnippet(content, query);
    results.push({ title, path: relativePath, snippet, score });
  }

  // Sort by score descending, then path ascending for determinism
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.path.localeCompare(b.path);
  });

  return results.slice(0, maxResults);
}

// Workspace-wide markdown helpers

/**
 * Scoped walk of Notes/ subdirectory to find markdown files.
 * Excludes .command-center/, hidden directories, and symlinks.
 * Uses stat-first early filtering, bounded frontmatter reads, and early query
 * filtering to avoid unbounded full-file scanning for wikilink suggestions.
 */
export async function listWorkspaceMarkdown(
  workspaceRoot: string,
  query?: string,
  maxResults?: number
): Promise<WorkspaceMarkdownEntry[]> {
  const workspacePath = path.normalize(workspaceRoot);
  const notesDir = path.normalize(path.join(workspacePath, 'Notes'));
  const excludePath = path.normalize(path.join(workspacePath, '.command-center'));
  const effectiveMaxResults = maxResults ?? 20;

  // Only read a small prefix when trying to extract a frontmatter title.
  const FRONTMATTER_READ_LIMIT = 4 * 1024;

  const processedDirs = new Set<string>();
  const hasQuery = !!query?.trim();
  const lowerQuery = query?.trim().toLowerCase() ?? '';

  interface MarkdownCandidate {
    entryPath: string;
    entryName: string;
    relativePath: string;
    relativePathLower: string;
    baseNameLower: string;
    modifiedAt: string;
    modifiedAtMs: number;
  }

  function pushCandidate(list: MarkdownCandidate[], candidate: MarkdownCandidate): void {
    const insertIndex = list.findIndex((entry) => entry.modifiedAtMs < candidate.modifiedAtMs);
    if (insertIndex === -1) {
      list.push(candidate);
    } else {
      list.splice(insertIndex, 0, candidate);
    }
  }

  async function readFrontmatterTitle(filePath: string, fallbackTitle: string): Promise<string> {
    try {
      const fd = await fs.open(filePath, 'r');
      try {
        const buffer = Buffer.alloc(FRONTMATTER_READ_LIMIT);
        const { bytesRead } = await fd.read(buffer, 0, FRONTMATTER_READ_LIMIT, 0);
        const content = buffer.subarray(0, bytesRead).toString('utf-8');
        const frontmatterMatch = content.match(/^---\s*\ntitle:\s*(.+?)\s*$/m);
        if (!frontmatterMatch) {
          return fallbackTitle;
        }

        let extracted = frontmatterMatch[1].trim();
        if (extracted.startsWith('"') && extracted.endsWith('"') && extracted.length >= 2) {
          extracted = extracted
            .slice(1, -1)
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }

        return extracted || fallbackTitle;
      } finally {
        await fd.close();
      }
    } catch {
      return fallbackTitle;
    }
  }

  async function toWorkspaceEntry(
    candidate: MarkdownCandidate,
    readTitle: boolean,
  ): Promise<WorkspaceMarkdownEntry> {
    const fallbackTitle = candidate.entryName.replace(/\.md$/, '');
    const title = readTitle
      ? await readFrontmatterTitle(candidate.entryPath, fallbackTitle)
      : fallbackTitle;

    return {
      title,
      path: candidate.relativePath,
      modifiedAt: candidate.modifiedAt,
    };
  }

  const pathMatchedCandidates: MarkdownCandidate[] = [];
  const titleProbeCandidates: MarkdownCandidate[] = [];

  async function collectCandidates(dirPath: string): Promise<void> {
    const normalizedDir = path.normalize(dirPath);
    if (processedDirs.has(normalizedDir)) return;
    processedDirs.add(normalizedDir);

    if (normalizedDir.startsWith(excludePath)) return;

    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(normalizedDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const entryPath = path.join(normalizedDir, entry.name);

      if (entry.isDirectory()) {
        await collectCandidates(entryPath);
        continue;
      }

      if (!entry.name.endsWith('.md')) {
        continue;
      }

      try {
        const stat = await fs.lstat(entryPath);
        if (stat.isSymbolicLink()) continue;
        if (stat.size > MAX_FILE_SIZE_BYTES) continue;

        const relativePath = path.relative(workspacePath, entryPath).replace(/\\/g, '/');
        const candidate: MarkdownCandidate = {
          entryPath,
          entryName: entry.name,
          relativePath,
          relativePathLower: relativePath.toLowerCase(),
          baseNameLower: entry.name.replace(/\.md$/, '').toLowerCase(),
          modifiedAt: stat.mtime.toISOString(),
          modifiedAtMs: stat.mtime.getTime(),
        };

        if (!hasQuery) {
          pushCandidate(titleProbeCandidates, candidate);
          continue;
        }

        if (
          candidate.relativePathLower.includes(lowerQuery)
          || candidate.baseNameLower.includes(lowerQuery)
        ) {
          pushCandidate(pathMatchedCandidates, candidate);
        } else {
          pushCandidate(titleProbeCandidates, candidate);
        }
      } catch {
        continue;
      }
    }
  }

  try {
    await fs.access(notesDir);
  } catch {
    return [];
  }

  await collectCandidates(notesDir);

  const results: WorkspaceMarkdownEntry[] = [];

  for (const candidate of pathMatchedCandidates) {
    results.push(await toWorkspaceEntry(candidate, true));
  }

  for (const candidate of titleProbeCandidates) {
    const entry = await toWorkspaceEntry(candidate, true);
    if (hasQuery && !entry.title.toLowerCase().includes(lowerQuery)) {
      continue;
    }

    results.push(entry);
  }

  results.sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );

  return results.slice(0, effectiveMaxResults);
}

/**
 * Parses a wikilink target from [[Note Name]] or [[Note Name|Alias]] syntax.
 * Returns the display name (for title matching) and the display text (for alias).
 */
function parseWikilinkTarget(wikilink: string): {
  displayText: string;
  displayName: string;
} {
  const inner = wikilink.slice(2, -2); // Remove [[ and ]]
  const pipeIndex = inner.indexOf('|');

  if (pipeIndex !== -1) {
    return {
      displayName: inner.slice(0, pipeIndex).trim(),
      displayText: inner.slice(pipeIndex + 1).trim(),
    };
  }

  return {
    displayName: inner.trim(),
    displayText: inner.trim(),
  };
}

/**
 * Normalizes a path for matching: removes .md extension and normalizes separators.
 */
function normalizePathForMatch(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace(/\.md$/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Resolves a wikilink to a file path in the workspace.
 * Per DEC-0014:
 * - Can open existing files anywhere in workspace markdown tree
 * - Missing-link creation only allowed when target resolves inside Notes/
 * - Exclude .command-center/, hidden dirs, symlinks, non-markdown
 */
export async function resolveWikilink(
  workspaceRoot: string,
  wikilink: string,
  currentFilePath?: string
): Promise<{ resolved: boolean; path: string; line?: number }> {
  if (!wikilink.startsWith('[[') || !wikilink.endsWith(']]')) {
    return { resolved: false, path: '' };
  }

  const { displayName } = parseWikilinkTarget(wikilink);

  // Try to extract line number from [[Note#123]] or [[Note|Alias#45]]
  let targetLine: number | undefined;
  const hashMatch = displayName.match(/^(.+?)#(\d+)$/);
  if (hashMatch) {
    targetLine = parseInt(hashMatch[2], 10);
  }

  const workspacePath = path.normalize(workspaceRoot);
  const excludePath = path.normalize(path.join(workspaceRoot, '.command-center'));

  // Helper to validate path is not in excluded area
  const isValidPath = (p: string) => {
    const normalized = path.normalize(p);
    return !normalized.startsWith(excludePath) &&
           !path.basename(normalized).startsWith('.') &&
           normalized.endsWith('.md');
  };

  // Helper to check if file exists and is not a symlink
  const fileExists = async (p: string): Promise<boolean> => {
    try {
      const stat = await fs.lstat(p);
      return !stat.isSymbolicLink();
    } catch {
      return false;
    }
  };

  // Helper to strip Notes/ prefix for Notes-relative return convention
  const stripNotesPrefix = (workspaceRelPath: string): string => {
    const normalized = workspaceRelPath.replace(/\\/g, '/');
    if (normalized.startsWith('Notes/')) {
      return normalized.slice('Notes/'.length);
    }
    return normalized;
  };

  // Step 1: Try relative resolution from current file's directory
  if (currentFilePath) {
    const currentDir = path.dirname(path.join(workspacePath, currentFilePath));
    const relativePath = path.join(currentDir, `${displayName}.md`);

    if (isValidPath(relativePath) && await fileExists(relativePath)) {
      const relativeResult = path.relative(workspacePath, relativePath).replace(/\\/g, '/');
      return { resolved: true, path: stripNotesPrefix(relativeResult), line: targetLine };
    }
  }

  // Step 2: Try resolution from workspace root (for absolute-style wikilinks)
  const absolutePath = path.join(workspacePath, `${displayName}.md`);
  if (isValidPath(absolutePath) && await fileExists(absolutePath)) {
    const absoluteResult = path.relative(workspacePath, absolutePath).replace(/\\/g, '/');
    return { resolved: true, path: stripNotesPrefix(absoluteResult), line: targetLine };
  }

  // Step 3: Search for title match across workspace
  const results = await listWorkspaceMarkdown(workspaceRoot, undefined, 500);
  const targetWithoutLine = hashMatch ? hashMatch[1] : displayName;
  const normalizedTargetForSearch = normalizePathForMatch(targetWithoutLine);

  // First exact match on title
  const exactMatch = results.find(
    (entry) => normalizePathForMatch(entry.title) === normalizedTargetForSearch
  );
  if (exactMatch) {
    return { resolved: true, path: stripNotesPrefix(exactMatch.path), line: targetLine };
  }

  // Then fuzzy match on title or path
  const fuzzyMatch = results.find(
    (entry) =>
      normalizePathForMatch(entry.title).includes(normalizedTargetForSearch) ||
      normalizePathForMatch(entry.path).includes(normalizedTargetForSearch)
  );
  if (fuzzyMatch) {
    return { resolved: true, path: stripNotesPrefix(fuzzyMatch.path), line: targetLine };
  }

  // Step 4: Return unresolved with path for creation check
  // The caller can decide whether to create the file based on DEC-0014 rules
  // Return Notes-relative path (no Notes/ prefix) for notesReadFile/notesWriteFile compatibility
  return { resolved: false, path: `${displayName}.md`, line: targetLine };
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

  // Resolve wikilink
  ipcMain.handle(ipcChannels.notesResolveWikilink, async (_event, rawPayload) => {
    const payload = parseSync(SNotesResolveWikilinkRequest, rawPayload);
    return await resolveWikilink(workspaceRoot, payload.wikilink, payload.currentFilePath) as NotesResolveWikilinkResponse;
  });

  // List workspace markdown files (stub)
  ipcMain.handle(ipcChannels.notesListWorkspaceMarkdown, async (_event, rawPayload) => {
    const payload = parseSync(SNotesListWorkspaceMarkdownRequest, rawPayload ?? { query: '', maxResults: 20 });
    const files = await listWorkspaceMarkdown(workspaceRoot, payload.query, payload.maxResults);
    return { files } as NotesListWorkspaceMarkdownResponse;
  });
}
