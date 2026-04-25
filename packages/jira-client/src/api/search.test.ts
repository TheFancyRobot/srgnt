/**
 * Tests for Jira search API with pagination
 */
import { describe, it, expect, vi } from 'vitest';
import { searchIssues } from './search.js';
import type { JiraApiClient } from './client.js';

describe('searchIssues', () => {
  it('calls GET with correct params', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      issues: [], total: 0, startAt: 0, maxResults: 100, names: {}, schemas: {},
    });
    const client = { get: mockGet } as unknown as JiraApiClient;
    await searchIssues(client, { jql: 'project = PROJ' });
    expect(mockGet).toHaveBeenCalledWith('/rest/api/3/search', expect.objectContaining({
      params: expect.objectContaining({ jql: 'project = PROJ' }),
    }));
  });

  it('throws on empty JQL', async () => {
    const client = {} as JiraApiClient;
    await expect(searchIssues(client, { jql: '' })).rejects.toThrow('JQL query is required');
    await expect(searchIssues(client, { jql: '   ' })).rejects.toThrow('JQL query is required');
  });
});
