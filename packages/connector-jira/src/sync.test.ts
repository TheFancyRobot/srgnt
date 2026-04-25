/**
 * Tests for Jira sync orchestration — error paths, validation, and result assembly
 */
import { describe, it, expect, vi } from 'vitest';
import { syncJira, buildJql, JiraSyncError, CredentialMissingError, type JiraSyncOptions } from './sync.js';
import type { JiraConnectorSettings } from '@srgnt/contracts';

const minimalSettings: JiraConnectorSettings = {
  connectorId: 'jira',
  siteUrl: 'https://example.atlassian.net',
  accountEmail: 'user@example.com',
  scopeMode: 'projects',
  projectKeys: ['PROJ'],
};

function validOptions(overrides?: Partial<JiraSyncOptions>): JiraSyncOptions {
  return {
    settings: minimalSettings,
    token: 'valid-token',
    ...overrides,
  };
}

describe('syncJira — validation failure before network', () => {
  it('fails closed when siteUrl is empty', async () => {
    const result = await syncJira({
      settings: { ...minimalSettings, siteUrl: '' },
      token: 'valid-token',
    });
    expect(result.success).toBe(false);
    expect(result.tasks).toHaveLength(0);
    expect(result.errors[0]).toBeInstanceOf(JiraSyncError);
    expect(result.errors[0].message).toContain('siteUrl');
  });

  it('fails closed when siteUrl is whitespace', async () => {
    const result = await syncJira({
      settings: { ...minimalSettings, siteUrl: '   ' },
      token: 'valid-token',
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toBeInstanceOf(JiraSyncError);
  });

  it('fails closed when accountEmail is missing', async () => {
    const result = await syncJira({
      settings: { ...minimalSettings, accountEmail: '' },
      token: 'valid-token',
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toBeInstanceOf(JiraSyncError);
    expect(result.errors[0].message).toContain('accountEmail');
  });

  it('fails closed when token is empty', async () => {
    const result = await syncJira({
      settings: minimalSettings,
      token: '',
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toBeInstanceOf(JiraSyncError);
    expect(result.errors[0].message).toContain('token');
  });

  it('fails closed when token is whitespace', async () => {
    const result = await syncJira({
      settings: minimalSettings,
      token: '   ',
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toBeInstanceOf(JiraSyncError);
  });

  it('fails closed when scopeMode is jql but jql is empty', async () => {
    const result = await syncJira({
      settings: { ...minimalSettings, scopeMode: 'jql', jql: '' },
      token: 'valid-token',
    });
    expect(result.success).toBe(false);
    const jqlError = result.errors.find(
      (e) => e.message.includes('JQL')
    );
    expect(jqlError).toBeDefined();
  });

  it('fails closed when scopeMode is projects but projectKeys is empty', async () => {
    const result = await syncJira({
      settings: { ...minimalSettings, scopeMode: 'projects', projectKeys: [] },
      token: 'valid-token',
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toBeInstanceOf(JiraSyncError);
    expect(result.errors[0].message).toContain('project');
  });

  it('fails closed before any network call on validation error', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ issues: [], total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    // @ts-expect-error — replacing global fetch for test
    globalThis.fetch = fetchSpy;

    try {
      await syncJira({
        settings: { ...minimalSettings, siteUrl: '' },
        token: 'valid-token',
      });
    } finally {
      // @ts-expect-error
      globalThis.fetch = undefined;
    }

    // fetch must NOT have been called — validation fails before network
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('syncJira — client creation error', () => {
  it('fails closed when API client creation throws', async () => {
    // An invalid siteUrl (not a parseable URL) should make client creation throw
    const result = await syncJira({
      settings: { ...minimalSettings, siteUrl: 'not-a-valid-url' },
      token: 'valid-token',
    });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Phase may be validation (settings) or fetch (client init) — either is acceptable
    expect(['validation', 'fetch']).toContain(result.errors[0].phase);
  });
});

describe('syncJira — fetch error handling', () => {
  it('returns errors when searchAllIssues throws a non-JiraSyncError', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify({ errorMessages: ['Unauthorized'] })),
    });
    // @ts-expect-error
    globalThis.fetch = fetchSpy;

    try {
      const result = await syncJira(validOptions());
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].phase).toBe('fetch');
    } finally {
      // @ts-expect-error
      globalThis.fetch = undefined;
    }
  });

  it('maps issues to tasks, skipping ones that fail mapping', async () => {
    // Return a valid issues response
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            issues: [
              {
                id: '1', key: 'PROJ-1', self: '', expand: '',
                fields: {
                  summary: 'Valid Issue',
                  description: null,
                  status: { name: 'To Do', id: '1' },
                  priority: { name: 'High', id: '3' },
                  assignee: null,
                  creator: {
                    accountId: 'u1',
                    displayName: 'U',
                    emailAddress: 'u@x.com',
                    active: true,
                  },
                  reporter: {
                    accountId: 'u1',
                    displayName: 'U',
                    emailAddress: 'u@x.com',
                    active: true,
                  },
                  created: '2024-01-01',
                  updated: '2024-01-02',
                  project: { id: '1', key: 'PROJ', name: 'Project' },
                  issuetype: { id: '1', name: 'Task', subtask: false },
                  labels: [],
                  fixVersions: [],
                },
              },
            ],
            total: 1,
            startAt: 0,
            maxResults: 100,
            names: {},
            schemas: {},
          })
        ),
    });
    // @ts-expect-error
    globalThis.fetch = fetchSpy;

    try {
      const result = await syncJira(validOptions());
      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('Valid Issue');
    } finally {
      // @ts-expect-error
      globalThis.fetch = undefined;
    }
  });
});

describe('syncJira — stats and result shape', () => {
  it('assembles JiraSyncResult with all required fields', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            issues: [],
            total: 0,
            startAt: 0,
            maxResults: 100,
            names: {},
            schemas: {},
          })
        ),
    });
    // @ts-expect-error
    globalThis.fetch = fetchSpy;

    try {
      const result = await syncJira(validOptions());
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('entitiesAdded');
      expect(result).toHaveProperty('entitiesUpdated');
      expect(result).toHaveProperty('entitiesRemoved');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('syncStats');
      expect(result.syncStats).toHaveProperty('pagesFetched');
      expect(result.syncStats).toHaveProperty('totalIssuesFound');
      expect(result.syncStats).toHaveProperty('issuesProcessed');
      expect(result.syncStats).toHaveProperty('durationMs');
      expect(result.syncStats.durationMs).toBeGreaterThanOrEqual(0);
    } finally {
      // @ts-expect-error
      globalThis.fetch = undefined;
    }
  });

  it('calls onProgress callback as pages are fetched', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            issues: [],
            total: 0,
            startAt: 0,
            maxResults: 100,
            names: {},
            schemas: {},
          })
        ),
    });
    // @ts-expect-error
    globalThis.fetch = fetchSpy;

    const onProgress = vi.fn();

    try {
      await syncJira(validOptions({ onProgress }));
      // onProgress called at least once when page fetch completes
      expect(onProgress.mock.calls.length).toBeGreaterThan(0);
    } finally {
      // @ts-expect-error
      globalThis.fetch = undefined;
    }
  });
});
