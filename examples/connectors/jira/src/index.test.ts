import { describe, expect, it } from 'vitest';
import { SConnectorManifest, parseSync } from '@srgnt/contracts';
import { jiraConnectorManifest, loadJiraFixtures } from './index.js';

describe('jira example connector', () => {
  it('re-exports a valid connector manifest', () => {
    expect(parseSync(SConnectorManifest, jiraConnectorManifest)).toEqual(jiraConnectorManifest);
  });

  it('exposes fixture-backed canonical entities', () => {
    const fixtures = loadJiraFixtures();

    expect(fixtures.tasks.length).toBeGreaterThan(0);
    expect(fixtures.persons.length).toBeGreaterThan(0);
  });
});
