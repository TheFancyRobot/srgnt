import { describe, it, expect } from 'vitest';
import {
  jiraFixtures,
  loadJiraFixtures,
  mapJiraIssueToTask,
  mapJiraPersonToPerson,
  jiraConnectorManifest,
} from './data.js';
import jiraConnectorPackage, { factory, manifest, runtime } from './index.js';

describe('jiraFixtures', () => {
  it('has issues', () => {
    expect(jiraFixtures.issues.length).toBeGreaterThan(0);
  });

  it('has persons', () => {
    expect(jiraFixtures.persons.length).toBeGreaterThan(0);
  });
});

describe('loadJiraFixtures', () => {
  it('loads tasks and persons', () => {
    const { tasks, persons } = loadJiraFixtures();
    expect(tasks).toHaveLength(3);
    expect(persons).toHaveLength(2);
  });

  it('maps issues to tasks correctly', () => {
    const { tasks } = loadJiraFixtures();
    const task = tasks.find((t) => t.envelope.providerId === 'PROJ-123');
    expect(task?.title).toBe('Implement user authentication');
    expect(task?.status).toBe('in_progress');
    expect(task?.priority).toBe('high');
  });
});

describe('mapJiraIssueToTask', () => {
  it('maps all status values', () => {
    const statusTests = [
      { status: 'To Do', expected: 'open' },
      { status: 'In Progress', expected: 'in_progress' },
      { status: 'Done', expected: 'done' },
    ];

    for (const { status, expected } of statusTests) {
      const issue = { ...jiraFixtures.issues[0], status };
      const task = mapJiraIssueToTask(issue);
      expect(task.status).toBe(expected);
    }
  });

  it('maps priority correctly', () => {
    const issue = { ...jiraFixtures.issues[0], priority: 'Critical' };
    const task = mapJiraIssueToTask(issue);
    expect(task.priority).toBe('critical');
  });
});

describe('mapJiraPersonToPerson', () => {
  it('maps person correctly', () => {
    const person = mapJiraPersonToPerson(jiraFixtures.persons[0]);
    expect(person.name).toBe('Alice Engineer');
    expect(person.email).toBe('alice@example.com');
    expect(person.envelope.provider).toBe('jira');
  });
});

describe('jiraConnectorManifest', () => {
  it('has correct id', () => {
    expect(jiraConnectorManifest.id).toBe('jira');
  });

  it('has read and write capabilities', () => {
    expect(jiraConnectorManifest.capabilities.length).toBe(2);
    expect(jiraConnectorManifest.capabilities.map((c) => c.capability)).toContain('read');
    expect(jiraConnectorManifest.capabilities.map((c) => c.capability)).toContain('write');
  });

  it('has correct entity types', () => {
    expect(jiraConnectorManifest.entityTypes).toContain('Task');
    expect(jiraConnectorManifest.entityTypes).toContain('Person');
  });
});

describe('jiraConnectorPackage export shape', () => {
  it('exports manifest, runtime, and factory through both named and default exports', () => {
    expect(manifest).toBe(jiraConnectorManifest);
    expect(runtime.entrypoint).toBe('createJiraConnector');
    expect(factory).toBeDefined();
    expect(jiraConnectorPackage.manifest).toBe(jiraConnectorManifest);
    expect(jiraConnectorPackage.runtime).toBe(runtime);
    expect(jiraConnectorPackage.factory).toBe(factory);
  });
});
