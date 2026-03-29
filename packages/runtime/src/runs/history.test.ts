import { describe, it, expect, beforeEach } from 'vitest';
import { createRunHistory, RunHistory } from './history.js';

describe('RunHistory', () => {
  let history: RunHistory;

  const fixtureInput = {
    skillName: 'daily-briefing',
    skillVersion: '1.0.0',
    parameters: {},
    context: {
      workspaceRoot: '/test/workspace',
      skillHome: '/test/workspace/.command-center/skills',
      connectorHome: '/test/workspace/.command-center/connectors',
      artifactHome: '/test/workspace/.command-center/artifacts',
      environment: {} as Record<string, string>,
    },
  };

  beforeEach(() => {
    history = new RunHistory();
  });

  it('starts empty', () => {
    expect(history.size).toBe(0);
    expect(history.listRuns()).toEqual([]);
  });

  it('creates runs', () => {
    const run = history.createRun('daily-briefing', '1.0.0', fixtureInput);
    expect(run.id).toMatch(/^run-/);
    expect(run.status).toBe('pending');
    expect(run.skillName).toBe('daily-briefing');
    expect(history.size).toBe(1);
  });

  it('updates runs', () => {
    const run = history.createRun('daily-briefing', '1.0.0', fixtureInput);
    const updated = history.updateRun(run.id, {
      status: 'completed',
      result: { briefing: '# Summary' },
      artifacts: [],
      approvals: [],
      logs: [],
      startedAt: '2024-03-25T10:00:00Z',
      completedAt: '2024-03-25T10:01:00Z',
      durationMs: 60000,
    });
    expect(updated).toBe(true);
    expect(history.getRun(run.id)?.status).toBe('completed');
  });

  it('returns false for updating non-existent run', () => {
    expect(history.updateRun('non-existent', { status: 'completed', startedAt: '2024-03-25T10:00:00Z', artifacts: [], approvals: [], logs: [] })).toBe(false);
  });

  it('lists runs by skill', () => {
    history.createRun('daily-briefing', '1.0.0', fixtureInput);
    history.createRun('other-skill', '1.0.0', fixtureInput);
    const runs = history.listRunsBySkill('daily-briefing');
    expect(runs).toHaveLength(1);
    expect(runs[0].skillName).toBe('daily-briefing');
  });

  it('lists runs by status', () => {
    const run = history.createRun('daily-briefing', '1.0.0', fixtureInput);
    history.updateRun(run.id, { status: 'completed', startedAt: '2024-03-25T10:00:00Z', artifacts: [], approvals: [], logs: [] });
    history.createRun('other-skill', '1.0.0', fixtureInput);
    const completed = history.listRunsByStatus('completed');
    expect(completed).toHaveLength(1);
    expect(completed[0].skillName).toBe('daily-briefing');
  });

  it('removes runs', () => {
    const run = history.createRun('daily-briefing', '1.0.0', fixtureInput);
    expect(history.removeRun(run.id)).toBe(true);
    expect(history.size).toBe(0);
    expect(history.removeRun('non-existent')).toBe(false);
  });

  it('clears runs', () => {
    history.createRun('daily-briefing', '1.0.0', fixtureInput);
    history.createRun('other-skill', '1.0.0', fixtureInput);
    history.clear();
    expect(history.size).toBe(0);
  });
});

describe('createRunHistory', () => {
  it('creates a run history instance', () => {
    const history = createRunHistory();
    const run = history.createRun('test', '1.0.0', {
      skillName: 'test',
      skillVersion: '1.0.0',
      parameters: {},
      context: {
        workspaceRoot: '/test',
        skillHome: '/test/skills',
        connectorHome: '/test/connectors',
        artifactHome: '/test/artifacts',
        environment: {} as Record<string, string>,
      },
    });
    expect(run.status).toBe('pending');
  });
});
