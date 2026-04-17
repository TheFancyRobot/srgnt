/**
 * Semantic search workspace watcher.
 *
 * Watches workspace markdown files for changes and triggers incremental reindexing.
 * Uses Node.js fs.watch for cross-platform compatibility.
 */

import { watch, existsSync, type FSWatcher } from 'node:fs';
import * as path from 'node:path';

export interface WorkspaceWatcherOptions {
  readonly workspaceRoot: string;
  readonly indexRoot: string;
  readonly onFileChange: (relativePath: string, event: 'add' | 'change' | 'unlink') => void;
  readonly debounceMs?: number;
}

interface WatchedFile {
  path: string;
  timer: ReturnType<typeof setTimeout> | null;
}

// Excluded patterns for paths
const EXCLUDED_PATTERNS = [
  '.agent-vault',
  '.git',
  'node_modules',
];

function isExcluded(filePath: string, indexRoot: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const normalizedIndexRoot = indexRoot.replace(/\\/g, '/');

  // Exclude the index directory
  if (normalized.startsWith(normalizedIndexRoot)) {
    return true;
  }

  // Exclude common patterns
  for (const pattern of EXCLUDED_PATTERNS) {
    if (normalized.includes(pattern)) {
      return true;
    }
  }

  // Exclude hidden files (starting with .)
  const parts = normalized.split('/');
  if (parts.some((part) => part.startsWith('.') && part.length > 1)) {
    return true;
  }

  // Exclude backup files
  if (normalized.endsWith('.md~') || normalized.endsWith('.md.bak')) {
    return true;
  }

  return false;
}

export class WorkspaceWatcher {
  private watcher: FSWatcher | null = null;
  private watchedFiles = new Map<string, WatchedFile>();
  private readonly workspaceRoot: string;
  private readonly indexRoot: string;
  private readonly onFileChange: (relativePath: string, event: 'add' | 'change' | 'unlink') => void;
  private readonly debounceMs: number;

  constructor(options: WorkspaceWatcherOptions) {
    this.workspaceRoot = options.workspaceRoot;
    this.indexRoot = options.indexRoot;
    this.onFileChange = options.onFileChange;
    this.debounceMs = options.debounceMs ?? 500;
  }

  start(): void {
    if (this.watcher) {
      return;
    }

    console.log('[semantic-search-watcher] starting for', this.workspaceRoot);

    this.watcher = watch(
      this.workspaceRoot,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;

        const fullPath = path.join(this.workspaceRoot, filename);
        const relativePath = filename;

        // Skip excluded paths
        if (isExcluded(fullPath, this.indexRoot)) {
          return;
        }

        // Skip non-markdown files
        if (!relativePath.endsWith('.md') && !relativePath.endsWith('.markdown')) {
          return;
        }

        // Map fs event to our event type
        let event: 'add' | 'change' | 'unlink';
        if (eventType === 'rename') {
          event = existsSync(fullPath) ? 'add' : 'unlink';
        } else {
          event = 'change';
        }

        this.debouncedNotify(relativePath, event);
      },
    );

    this.watcher.on('error', (err) => {
      console.error('[semantic-search-watcher] error:', err);
    });

    console.log('[semantic-search-watcher] started');
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Clear all pending timers
    for (const [, file] of this.watchedFiles) {
      if (file.timer) {
        clearTimeout(file.timer);
      }
    }
    this.watchedFiles.clear();

    console.log('[semantic-search-watcher] stopped');
  }

  private debouncedNotify(relativePath: string, event: 'add' | 'change' | 'unlink'): void {
    const existing = this.watchedFiles.get(relativePath);

    if (existing?.timer) {
      clearTimeout(existing.timer);
      existing.timer = null;
    }

    const timer = setTimeout(() => {
      this.watchedFiles.delete(relativePath);
      console.log('[semantic-search-watcher] file', event, relativePath);
      this.onFileChange(relativePath, event);
    }, this.debounceMs);

    this.watchedFiles.set(relativePath, { path: relativePath, timer });
  }
}

export function createWorkspaceWatcher(options: WorkspaceWatcherOptions): WorkspaceWatcher {
  return new WorkspaceWatcher(options);
}
