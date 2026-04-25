/**
 * Tests for Jira API client
 */
import { describe, it, expect, vi } from 'vitest';
import { JiraApiClient, createJiraApiClient } from './client.js';
import { JiraApiError } from './errors.js';
import type { JiraConnectorSettings } from '@srgnt/contracts';

const validSettings: JiraConnectorSettings = {
  connectorId: 'jira',
  siteUrl: 'https://example.atlassian.net',
  accountEmail: 'user@example.com',
  scopeMode: 'projects',
  projectKeys: ['PROJ'],
};

describe('JiraApiError', () => {
  it('carries status, statusText, and Jira-specific fields', () => {
    const err = new JiraApiError('token expired', 401, 'Unauthorized', 'AUTHENTICATION_FAILED', 'Token has expired');
    expect(err.status).toBe(401);
    expect(err.statusText).toBe('Unauthorized');
    expect(err.atlassianErrorCode).toBe('AUTHENTICATION_FAILED');
    expect(err.atlassianErrorMessage).toBe('Token has expired');
  });

  it('is an Error subclass', () => {
    const err = new JiraApiError('bad', 500, 'Server Error', undefined, undefined, true);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(JiraApiError);
  });
});

describe('JiraApiClient construction', () => {
  it('throws on missing email', () => {
    expect(() => new JiraApiClient({ baseUrl: 'https://x.atlassian.net', email: '', token: 'tok' }))
      .toThrow('Jira account email is required');
  });

  it('throws on missing token', () => {
    expect(() => new JiraApiClient({ baseUrl: 'https://x.atlassian.net', email: 'u@x.com', token: '' }))
      .toThrow('Jira API token is required');
  });

  it('strips trailing slash from baseUrl', () => {
    const client = new JiraApiClient({ baseUrl: 'https://x.atlassian.net/', email: 'u@x.com', token: 'tok' });
    expect((client as unknown as { baseUrl: string }).baseUrl).toBe('https://x.atlassian.net');
  });

  it('createJiraApiClient throws on missing siteUrl', () => {
    const badSettings = { ...validSettings, siteUrl: '' } as JiraConnectorSettings;
    expect(() => createJiraApiClient(badSettings, 'tok')).toThrow('Jira site URL is required');
  });
});

describe('JiraApiClient.get — mocked fetch', () => {
  it('returns parsed JSON on 200', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify({ total: 1, issues: [] })),
    });

    const client = new JiraApiClient({ baseUrl: 'https://x.atlassian.net', email: 'u@x.com', token: 'tok' });
    globalThis.fetch = mockFetch;

    const result = await client.get('/rest/api/3/search', { params: { jql: 'project = PROJ' } });
    expect(result).toEqual({ total: 1, issues: [] });
    mockFetch.mockRestore();
  });

  it('throws JiraApiError on 401', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify({ errorCode: 'AUTHENTICATION_FAILED', message: 'Token expired' })),
    });

    const client = new JiraApiClient({ baseUrl: 'https://x.atlassian.net', email: 'u@x.com', token: 'tok' });
    globalThis.fetch = mockFetch;

    await expect(client.get('/rest/api/3/myself')).rejects.toThrow(JiraApiError);
    await expect(client.get('/rest/api/3/myself')).rejects.toMatchObject({
      status: 401,
      atlassianErrorCode: 'AUTHENTICATION_FAILED',
    });
    mockFetch.mockRestore();
  });
});
