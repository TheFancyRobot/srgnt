import { describe, it, expect } from 'vitest';
import { parseSync } from '../shared-schemas.js';
import {
  SLaunchIntent,
  SLaunchContext,
  SLaunchTemplate,
  SLaunchApprovalRequired,
} from './launch.js';

describe('SLaunchIntent', () => {
  it('accepts "readOnly"', () => {
    expect(parseSync(SLaunchIntent, 'readOnly')).toBe('readOnly');
  });

  it('accepts "artifactAffecting"', () => {
    expect(parseSync(SLaunchIntent, 'artifactAffecting')).toBe('artifactAffecting');
  });

  it('rejects invalid intent values', () => {
    expect(() => parseSync(SLaunchIntent, 'readWrite')).toThrow();
  });
});

describe('SLaunchContext', () => {
  const validDatetime = '2025-06-15T10:30:00Z';

  it('validates minimal context with only required fields', () => {
    const result = parseSync(SLaunchContext, {
      launchId: 'launch-1',
      sourceWorkflow: 'workflow-1',
      workingDirectory: '/home/user/project',
      createdAt: validDatetime,
    });
    expect(result.launchId).toBe('launch-1');
    expect(result.sourceWorkflow).toBe('workflow-1');
  });

  it('validates full context with all optional fields', () => {
    const result = parseSync(SLaunchContext, {
      launchId: 'launch-1',
      sourceWorkflow: 'workflow-1',
      sourceArtifactId: 'artifact-1',
      sourceRunId: 'run-1',
      workingDirectory: '/home/user/project',
      command: 'npm test',
      env: { NODE_ENV: 'test' },
      labels: ['ci', 'nightly'],
      intent: 'readOnly',
      createdAt: validDatetime,
    });
    expect(result.sourceArtifactId).toBe('artifact-1');
    expect(result.command).toBe('npm test');
    expect(result.env).toEqual({ NODE_ENV: 'test' });
    expect(result.labels).toEqual(['ci', 'nightly']);
    expect(result.intent).toBe('readOnly');
  });

  it('defaults intent to "artifactAffecting" when omitted', () => {
    const result = parseSync(SLaunchContext, {
      launchId: 'launch-1',
      sourceWorkflow: 'workflow-1',
      workingDirectory: '/home/user/project',
      createdAt: validDatetime,
    });
    expect(result.intent).toBe('artifactAffecting');
  });

  it('rejects invalid datetime pattern for createdAt', () => {
    expect(() =>
      parseSync(SLaunchContext, {
        launchId: 'launch-1',
        sourceWorkflow: 'workflow-1',
        workingDirectory: '/home/user/project',
        createdAt: 'not-a-datetime',
      }),
    ).toThrow();
  });
});

describe('SLaunchTemplate', () => {
  it('validates minimal template', () => {
    const result = parseSync(SLaunchTemplate, {
      id: 'tmpl-1',
      name: 'Test Runner',
      description: 'Runs tests',
      command: 'npm test',
      intent: 'artifactAffecting',
    });
    expect(result.id).toBe('tmpl-1');
    expect(result.name).toBe('Test Runner');
  });

  it('defaults args to empty array when omitted', () => {
    const result = parseSync(SLaunchTemplate, {
      id: 'tmpl-1',
      name: 'Test Runner',
      description: 'Runs tests',
      command: 'npm test',
      intent: 'artifactAffecting',
    });
    expect(result.args).toEqual([]);
  });

  it('defaults requiredCapabilities to empty array when omitted', () => {
    const result = parseSync(SLaunchTemplate, {
      id: 'tmpl-1',
      name: 'Test Runner',
      description: 'Runs tests',
      command: 'npm test',
      intent: 'artifactAffecting',
    });
    expect(result.requiredCapabilities).toEqual([]);
  });
});

describe('SLaunchApprovalRequired', () => {
  const validDatetime = '2025-06-15T10:30:00Z';

  it('validates complete approval request', () => {
    const result = parseSync(SLaunchApprovalRequired, {
      launchId: 'launch-1',
      context: {
        launchId: 'launch-1',
        sourceWorkflow: 'workflow-1',
        workingDirectory: '/home/user/project',
        createdAt: validDatetime,
      },
      template: {
        id: 'tmpl-1',
        name: 'Test Runner',
        description: 'Runs tests',
        command: 'npm test',
        intent: 'artifactAffecting',
      },
      requestedAt: validDatetime,
    });
    expect(result.launchId).toBe('launch-1');
    expect(result.template.id).toBe('tmpl-1');
  });

  it('defaults status to "pending" when omitted', () => {
    const result = parseSync(SLaunchApprovalRequired, {
      launchId: 'launch-1',
      context: {
        launchId: 'launch-1',
        sourceWorkflow: 'workflow-1',
        workingDirectory: '/home/user/project',
        createdAt: validDatetime,
      },
      template: {
        id: 'tmpl-1',
        name: 'Test Runner',
        description: 'Runs tests',
        command: 'npm test',
        intent: 'artifactAffecting',
      },
      requestedAt: validDatetime,
    });
    expect(result.status).toBe('pending');
  });
});
