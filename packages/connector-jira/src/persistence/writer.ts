/**
 * Jira issue markdown file writer
 *
 * Orchestrates writing one stable markdown file per Jira issue under a
 * connector-owned workspace subtree. Detects stale issues and archives them.
 *
 * All file I/O goes through the HostFileAdapter interface (via HostCapabilities.files).
 * This maintains the privileged host boundary — connectors never access the filesystem directly.
 *
 * Token is never written to any file.
 */
import type { Task } from '@srgnt/contracts';
import { renderIssueMarkdown } from './markdown.js';

// Connector-owned subtree root (relative to workspace root)
const JIRA_SUBDIR = '.jira';
const JIRA_INDEX_FILE = '.index.json';

interface JiraSyncIndex {
  version: string;
  syncedKeys: Record<string, { filePath: string; lastSyncedAt: string; archived?: boolean }>;
}

function defaultIndex(): JiraSyncIndex {
  return { version: '1.0.0', syncedKeys: {} };
}

/** Host-provided file system adapter */
export interface FileAdapter {
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  mkdir(path: string): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export interface WriteOptions {
  workspaceRoot: string;
  siteUrl?: string;
  /** If true, archive stale files in place instead of deleting them */
  archiveStale?: boolean;
  /** File adapter for I/O — injected via HostCapabilities.files */
  files: FileAdapter;
}

/**
 * Builds the stable file path for a Jira issue within the workspace.
 * Path: {workspaceRoot}/.jira/{projectKey}/{issueKey}.md
 */
export function buildIssuePath(workspaceRoot: string, task: Task): string {
  const projectKey = task.project ?? 'UNKNOWN';
  const issueKey = task.envelope.providerId ?? 'UNKNOWN';
  return `${workspaceRoot}/${JIRA_SUBDIR}/${projectKey}/${issueKey}.md`;
}

/**
 * Writes (or overwrites) one markdown file per issue.
 * Returns the set of issue keys that were written/updated.
 *
 * All I/O goes through the injected FileAdapter (from HostCapabilities.files).
 */
export async function writeIssues(
  tasks: Task[],
  options: WriteOptions
): Promise<{ written: string[]; archived: string[]; errors: string[] }> {
  const written: string[] = [];
  const archived: string[] = [];
  const errors: string[] = [];

  const indexPath = `${options.workspaceRoot}/${JIRA_SUBDIR}/${JIRA_INDEX_FILE}`;

  // Load or initialize the index
  let index = defaultIndex();
  try {
    const raw = await options.files.readFile(indexPath);
    index = JSON.parse(raw) as JiraSyncIndex;
  } catch {
    // Index doesn't exist yet — use default
  }

  const currentKeys = new Set<string>();

  // Ensure the jira directory exists
  await options.files.mkdir(`${options.workspaceRoot}/${JIRA_SUBDIR}`);

  for (const task of tasks) {
    try {
      const projectKey = task.project ?? 'UNKNOWN';
      const providerId = task.envelope.providerId;

      if (!providerId) {
        errors.push(`task missing providerId: ${task.envelope.id}`);
        continue;
      }

      const filePath = `${options.workspaceRoot}/${JIRA_SUBDIR}/${projectKey}/${providerId}.md`;

      // Ensure project subdirectory exists
      await options.files.mkdir(`${options.workspaceRoot}/${JIRA_SUBDIR}/${projectKey}`);

      // Render markdown
      const content = renderIssueMarkdown(task, {
        siteUrl: options.siteUrl,
        archived: false,
      });

      // Write idempotently — overwrites any existing file
      await options.files.writeFile(filePath, content);

      currentKeys.add(providerId);
      index.syncedKeys[providerId] = {
        filePath: `${JIRA_SUBDIR}/${projectKey}/${providerId}.md`,
        lastSyncedAt: new Date().toISOString(),
        // Clear archived flag if the issue is back in scope
        archived: false,
      };

      written.push(providerId);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      errors.push(`${task.envelope.providerId ?? 'unknown'}: ${err}`);
    }
  }

  // Handle stale issues — archive in place (ARCH-0009)
  if (options.archiveStale !== false && index.syncedKeys) {
    const staleKeys = Object.keys(index.syncedKeys).filter(
      (k) => !currentKeys.has(k) && !index.syncedKeys[k]!.archived
    );

    for (const staleKey of staleKeys) {
      const entry = index.syncedKeys[staleKey]!;
      const filePath = `${options.workspaceRoot}/${entry.filePath}`;

      try {
        await archiveInPlace(filePath, options.files);
        archived.push(staleKey);

        // Mark as archived in index (preserve traceability, don't delete)
        index.syncedKeys[staleKey] = {
          ...entry,
          archived: true,
        };
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        errors.push(`archive ${staleKey}: ${err}`);
      }
    }
  }

  // Persist updated index (errors here don't fail the whole operation)
  try {
    await options.files.writeFile(indexPath, JSON.stringify(index, null, 2));
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    errors.push(`index write: ${err}`);
  }

  return { written, archived, errors };
}

/**
 * Reads the currently synced keys from the index.
 */
export async function readIndex(workspaceRoot: string, files: FileAdapter): Promise<JiraSyncIndex> {
  const indexPath = `${workspaceRoot}/${JIRA_SUBDIR}/${JIRA_INDEX_FILE}`;
  try {
    const raw = await files.readFile(indexPath);
    return JSON.parse(raw) as JiraSyncIndex;
  } catch {
    return defaultIndex();
  }
}

/**
 * Marks a file as archived in place — updates frontmatter, does NOT delete or rename.
 * ARCH-0009: stable file path is preserved.
 */
async function archiveInPlace(filePath: string, files: FileAdapter): Promise<void> {
  let content: string;
  try {
    content = await files.readFile(filePath);
  } catch {
    // File doesn't exist — nothing to archive
    return;
  }

  // Parse frontmatter (--- ... --- ...)
  const parts = content.split(/^---$/m);
  if (parts.length < 3) {
    // No frontmatter — prepend archive markers
    const archivedContent = [
      '---',
      'is_archived: true',
      'archived_reason: left_scope',
      '---',
      '',
      '# Archived',
      '',
      'This issue is no longer in sync scope.',
      '',
      '---',
      '',
      content,
    ].join('\n');
    await files.writeFile(filePath, archivedContent);
    return;
  }

  // Reconstruct with updated frontmatter — keep body, keep path
  const frontmatter = parts[1];
  const body = parts.slice(2).join('---');

  let updatedFrontmatter = frontmatter
    .replace(/^is_archived:.*$/m, 'is_archived: true');

  if (!updatedFrontmatter.includes('archived_reason:')) {
    updatedFrontmatter += '\narchived_reason: left_scope';
  } else {
    updatedFrontmatter = updatedFrontmatter.replace(
      /^archived_reason:.*$/m,
      'archived_reason: left_scope'
    );
  }

  const archivedContent = `---\n${updatedFrontmatter}---\n\n# Archived\n\nThis issue is no longer in sync scope.\n\n---\n\n${body.trim()}`;

  await files.writeFile(filePath, archivedContent);
}

/**
 * Determines which tasks are new (not in index) vs existing updates.
 */
export function classifyTasks(tasks: Task[], index: JiraSyncIndex): { new: Task[]; updated: Task[] } {
  const newTasks: Task[] = [];
  const updatedTasks: Task[] = [];

  for (const task of tasks) {
    const key = task.envelope.providerId;
    if (key && index.syncedKeys[key] && !index.syncedKeys[key]!.archived) {
      updatedTasks.push(task);
    } else {
      newTasks.push(task);
    }
  }

  return { new: newTasks, updated: updatedTasks };
}