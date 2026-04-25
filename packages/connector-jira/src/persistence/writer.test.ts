/**
 * Tests for Jira markdown persistence writer
 *
 * Tests: stable path naming, file writing, stale detection/archive in place,
 * index management, and connector integration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildIssuePath, writeIssues, readIndex, classifyTasks, type FileAdapter } from './writer.js';
import type { Task } from '@srgnt/contracts';

function makeTask(overrides: Partial<Task> & { providerId?: string; project?: string } = {}): Task {
  return {
    envelope: {
      id: 'ent-1',
      canonicalType: 'Task',
      provider: 'jira',
      providerId: overrides.providerId ?? 'PROJ-123',
      createdAt: '2024-03-01T10:00:00Z',
      updatedAt: '2024-03-25T14:30:00Z',
    },
    title: overrides.title ?? 'Test Issue',
    description: overrides.description ?? 'Issue description',
    status: 'in_progress',
    priority: 'high',
    project: overrides.project ?? 'PROJ',
    providerMetadata: {},
    ...overrides,
  } as Task;
}

/** In-memory mock FileAdapter for tests */
function makeMockFiles(): {
  files: FileAdapter;
  store: Map<string, string>;
  mkdirs: Set<string>;
} {
  const store = new Map<string, string>();
  const mkdirs = new Set<string>();

  return {
    files: {
      async writeFile(path: string, content: string): Promise<void> {
        store.set(path, content);
      },
      async readFile(path: string): Promise<string> {
        const content = store.get(path);
        if (content === undefined) throw new Error(`not found: ${path}`);
        return content;
      },
      async mkdir(path: string): Promise<void> {
        mkdirs.add(path);
      },
      async delete(path: string): Promise<void> {
        store.delete(path);
      },
      async exists(path: string): Promise<boolean> {
        return store.has(path);
      },
    },
    store,
    mkdirs,
  };
}

describe('buildIssuePath', () => {
  it('uses the stable .jira/{projectKey}/{issueKey}.md format', () => {
    const task = makeTask({ providerId: 'PROJ-456', project: 'PROJ' });
    const path = buildIssuePath('/workspace', task);
    expect(path).toBe('/workspace/.jira/PROJ/PROJ-456.md');
  });

  it('uses UNKNOWN when project is missing', () => {
    const task = makeTask({ providerId: 'PROJ-456', project: undefined as unknown as string });
    const path = buildIssuePath('/workspace', task);
    expect(path).toBe('/workspace/.jira/UNKNOWN/PROJ-456.md');
  });

  it('uses UNKNOWN when providerId is missing', () => {
    const task = makeTask({ providerId: undefined as unknown as string });
    // Override envelope directly to force missing providerId
    (task.envelope as { providerId?: string }).providerId = undefined;
    const path = buildIssuePath('/workspace', task);
    expect(path).toBe('/workspace/.jira/PROJ/UNKNOWN.md');
  });
});

describe('writeIssues', () => {
  it('writes one markdown file per task at the stable path', async () => {
    const { files, store } = makeMockFiles();
    const task = makeTask({ providerId: 'PROJ-100', project: 'PROJ' });

    await writeIssues([task], {
      workspaceRoot: '/workspace',
      siteUrl: 'https://example.atlassian.net',
      files,
    });

    expect(store.has('/workspace/.jira/PROJ/PROJ-100.md')).toBe(true);
    const content = store.get('/workspace/.jira/PROJ/PROJ-100.md')!;
    expect(content).toContain('issue_key: PROJ-100');
    expect(content).toContain('# Test Issue');
  });

  it('includes source_url in frontmatter when siteUrl is provided', async () => {
    const { files, store } = makeMockFiles();
    const task = makeTask({ providerId: 'PROJ-200', project: 'PROJ' });

    await writeIssues([task], {
      workspaceRoot: '/workspace',
      siteUrl: 'https://example.atlassian.net',
      files,
    });

    const content = store.get('/workspace/.jira/PROJ/PROJ-200.md')!;
    expect(content).toContain('source_url: https://example.atlassian.net/browse/PROJ-200');
  });

  it('creates the .jira directory', async () => {
    const { files, mkdirs } = makeMockFiles();
    const task = makeTask({ providerId: 'PROJ-300', project: 'PROJ' });

    await writeIssues([task], {
      workspaceRoot: '/workspace',
      files,
    });

    expect(mkdirs.has('/workspace/.jira')).toBe(true);
  });

  it('creates per-project subdirectories', async () => {
    const { files, mkdirs } = makeMockFiles();
    const task = makeTask({ providerId: 'PROJ-400', project: 'PROJ' });

    await writeIssues([task], {
      workspaceRoot: '/workspace',
      files,
    });

    expect(mkdirs.has('/workspace/.jira/PROJ')).toBe(true);
  });

  it('reports written keys in return value', async () => {
    const { files } = makeMockFiles();
    const task = makeTask({ providerId: 'PROJ-500', project: 'PROJ' });

    const result = await writeIssues([task], {
      workspaceRoot: '/workspace',
      files,
    });

    expect(result.written).toContain('PROJ-500');
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors for tasks without providerId', async () => {
    const { files } = makeMockFiles();
    // Create a task and force-enable missing providerId by overriding envelope
    const badTask = makeTask({});
    (badTask.envelope as { providerId?: string }).providerId = undefined;

    const result = await writeIssues([badTask], {
      workspaceRoot: '/workspace',
      files,
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('missing providerId');
  });

  it('writes to .index.json after processing tasks', async () => {
    const { files, store } = makeMockFiles();
    const task = makeTask({ providerId: 'PROJ-600', project: 'PROJ' });

    await writeIssues([task], {
      workspaceRoot: '/workspace',
      files,
    });

    expect(store.has('/workspace/.jira/.index.json')).toBe(true);
    const index = JSON.parse(store.get('/workspace/.jira/.index.json')!);
    expect(index.syncedKeys['PROJ-600']).toBeDefined();
    expect(index.syncedKeys['PROJ-600']!.archived).toBe(false);
  });
});

describe('writeIssues — stale detection and archive-in-place', () => {
  it('archives in place when a previously-synced issue is absent from current result', async () => {
    const { files, store } = makeMockFiles();

    // Pre-populate the index with a stale issue
    store.set('/workspace/.jira/.index.json', JSON.stringify({
      version: '1.0.0',
      syncedKeys: {
        'PROJ-STALE': {
          filePath: '.jira/PROJ/PROJ-STALE.md',
          lastSyncedAt: '2024-03-01T00:00:00Z',
          archived: false,
        },
      },
    }));
    // Pre-write the file that will become stale
    store.set('/workspace/.jira/PROJ/PROJ-STALE.md', [
      '---',
      'provider: jira',
      'issue_key: PROJ-STALE',
      'project_key: PROJ',
      'source_url: ""',
      'synced_at: "2024-03-01T00:00:00Z"',
      'issue_updated_at: "2024-03-01T00:00:00Z"',
      'status: open',
      'priority: medium',
      'is_archived: false',
      '---',
      '',
      '# Old Issue',
    ].join('\n'));

    // Current sync only returns a different issue (PROJ-NEW), not PROJ-STALE
    const newTask = makeTask({ providerId: 'PROJ-NEW', project: 'PROJ' });

    const result = await writeIssues([newTask], {
      workspaceRoot: '/workspace',
      files,
    });

    expect(result.archived).toContain('PROJ-STALE');

    // The original file should be updated in place (not renamed to .archived.md)
    expect(store.has('/workspace/.jira/PROJ/PROJ-STALE.md')).toBe(true);
    expect(store.has('/workspace/.jira/PROJ/PROJ-STALE.archived.md')).toBe(false);

    // File should have archive markers in frontmatter
    const archivedContent = store.get('/workspace/.jira/PROJ/PROJ-STALE.md')!;
    expect(archivedContent).toContain('is_archived: true');
    expect(archivedContent).toContain('archived_reason: left_scope');

    // Index should mark it archived, not delete the entry
    const index = JSON.parse(store.get('/workspace/.jira/.index.json')!);
    expect(index.syncedKeys['PROJ-STALE']!.archived).toBe(true);
  });

  it('does NOT delete or rename the original file when archiving', async () => {
    const { files, store } = makeMockFiles();

    store.set('/workspace/.jira/.index.json', JSON.stringify({
      version: '1.0.0',
      syncedKeys: {
        'PROJ-OLD': {
          filePath: '.jira/PROJ/PROJ-OLD.md',
          lastSyncedAt: '2024-03-01T00:00:00Z',
          archived: false,
        },
      },
    }));
    store.set('/workspace/.jira/PROJ/PROJ-OLD.md', '---\nis_archived: false\n---\n# Old\n');

    const newTask = makeTask({ providerId: 'PROJ-NEW', project: 'PROJ' });

    await writeIssues([newTask], {
      workspaceRoot: '/workspace',
      files,
    });

    // Stable path still exists (archived in place)
    expect(store.has('/workspace/.jira/PROJ/PROJ-OLD.md')).toBe(true);
    // No side-channel archived file created
    expect(store.has('/workspace/.jira/PROJ/PROJ-OLD.archived.md')).toBe(false);
  });

  it('restores archived issue if it comes back into scope', async () => {
    const { files, store } = makeMockFiles();

    // Pre-populate with an archived issue
    store.set('/workspace/.jira/.index.json', JSON.stringify({
      version: '1.0.0',
      syncedKeys: {
        'PROJ-BACK': {
          filePath: '.jira/PROJ/PROJ-BACK.md',
          lastSyncedAt: '2024-03-01T00:00:00Z',
          archived: true,
        },
      },
    }));
    store.set('/workspace/.jira/PROJ/PROJ-BACK.md', '---\nis_archived: true\narchived_reason: left_scope\n---\n# Coming Back\n');

    // Current sync includes PROJ-BACK again
    const task = makeTask({ providerId: 'PROJ-BACK', project: 'PROJ', title: 'Coming Back' });

    await writeIssues([task], {
      workspaceRoot: '/workspace',
      files,
    });

    // File should be restored (archived flag cleared)
    const content = store.get('/workspace/.jira/PROJ/PROJ-BACK.md')!;
    expect(content).toContain('is_archived: false');

    // Index should also reflect restored state
    const index = JSON.parse(store.get('/workspace/.jira/.index.json')!);
    expect(index.syncedKeys['PROJ-BACK']!.archived).toBe(false);
  });
});

describe('readIndex', () => {
  it('returns default index when file does not exist', async () => {
    const { files } = makeMockFiles();

    const index = await readIndex('/workspace', files);

    expect(index.version).toBe('1.0.0');
    expect(index.syncedKeys).toEqual({});
  });

  it('reads and parses existing index', async () => {
    const { files, store } = makeMockFiles();
    store.set('/workspace/.jira/.index.json', JSON.stringify({
      version: '1.0.0',
      syncedKeys: {
        'PROJ-1': { filePath: '.jira/PROJ/PROJ-1.md', lastSyncedAt: '2024-03-01T00:00:00Z' },
        'PROJ-2': { filePath: '.jira/PROJ/PROJ-2.md', lastSyncedAt: '2024-03-02T00:00:00Z' },
      },
    }));

    const index = await readIndex('/workspace', files);

    expect(Object.keys(index.syncedKeys)).toHaveLength(2);
    expect(index.syncedKeys['PROJ-1']).toBeDefined();
    expect(index.syncedKeys['PROJ-2']).toBeDefined();
  });
});

describe('classifyTasks', () => {
  it('marks tasks in index as updated', () => {
    const index: Parameters<typeof classifyTasks>[1] = {
      version: '1.0.0',
      syncedKeys: {
        'PROJ-1': { filePath: '.jira/PROJ/PROJ-1.md', lastSyncedAt: '2024-03-01T00:00:00Z' },
        'PROJ-2': { filePath: '.jira/PROJ/PROJ-2.md', lastSyncedAt: '2024-03-02T00:00:00Z' },
      },
    };

    const tasks = [
      makeTask({ providerId: 'PROJ-1' }),
      makeTask({ providerId: 'PROJ-3' }), // not in index
    ];

    const result = classifyTasks(tasks, index);

    expect(result.updated).toHaveLength(1);
    expect(result.new).toHaveLength(1);
    expect(result.updated[0]!.envelope.providerId).toBe('PROJ-1');
    expect(result.new[0]!.envelope.providerId).toBe('PROJ-3');
  });

  it('skips archived keys when classifying updated', () => {
    const index: Parameters<typeof classifyTasks>[1] = {
      version: '1.0.0',
      syncedKeys: {
        'PROJ-ARCHIVED': {
          filePath: '.jira/PROJ/PROJ-ARCHIVED.md',
          lastSyncedAt: '2024-03-01T00:00:00Z',
          archived: true,
        },
        'PROJ-ACTIVE': {
          filePath: '.jira/PROJ/PROJ-ACTIVE.md',
          lastSyncedAt: '2024-03-02T00:00:00Z',
          archived: false,
        },
      },
    };

    const tasks = [
      makeTask({ providerId: 'PROJ-ARCHIVED' }),
      makeTask({ providerId: 'PROJ-ACTIVE' }),
    ];

    const result = classifyTasks(tasks, index);

    // Archived task should be classified as new (re-synced)
    expect(result.new.map((t) => t.envelope.providerId)).toContain('PROJ-ARCHIVED');
    // Active task should be classified as updated
    expect(result.updated.map((t) => t.envelope.providerId)).toContain('PROJ-ACTIVE');
  });
});

describe('connector integration', () => {
  it('writeIssues propagates file write errors', async () => {
    const failingFiles: FileAdapter = {
      async writeFile(_path: string, _content: string): Promise<void> {
        throw new Error('disk full');
      },
      async readFile(_path: string): Promise<string> {
        return '{}';
      },
      async mkdir(_path: string): Promise<void> {},
      async delete(_path: string): Promise<void> {},
      async exists(_path: string): Promise<boolean> {
        return false;
      },
    };

    const task = makeTask({ providerId: 'PROJ-ERROR', project: 'PROJ' });

    const result = await writeIssues([task], {
      workspaceRoot: '/workspace',
      files: failingFiles,
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('disk full');
  });
});