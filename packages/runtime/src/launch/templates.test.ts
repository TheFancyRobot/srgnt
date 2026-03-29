import { describe, it, expect } from 'vitest';
import {
  LAUNCH_TEMPLATES,
  getTemplateById,
  requiresApproval,
  createLaunchContext,
} from './templates.js';
import { SLaunchContext, SLaunchTemplate, safeParse } from '@srgnt/contracts';
import type { LaunchTemplate } from '@srgnt/contracts';

describe('SLaunchContext schema', () => {
  it('validates a complete context object', () => {
    const result = safeParse(SLaunchContext, {
      launchId: 'launch-123-abc',
      sourceWorkflow: 'daily-briefing',
      workingDirectory: '/home/user/workspace',
      command: 'bash',
      intent: 'readOnly',
      createdAt: '2024-03-25T10:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('validates with optional fields present', () => {
    const result = safeParse(SLaunchContext, {
      launchId: 'launch-456-def',
      sourceWorkflow: 'daily-briefing',
      sourceArtifactId: 'artifact-1',
      sourceRunId: 'run-42',
      workingDirectory: '/home/user/workspace',
      command: 'git',
      env: { PATH: '/usr/bin' },
      labels: ['terminal', 'git'],
      intent: 'artifactAffecting',
      createdAt: '2024-03-25T10:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects context missing required fields', () => {
    const result = safeParse(SLaunchContext, {
      launchId: 'launch-789',
      // missing sourceWorkflow, workingDirectory, createdAt
    });
    expect(result.success).toBe(false);
  });

  it('defaults intent to artifactAffecting when omitted', () => {
    const result = safeParse(SLaunchContext, {
      launchId: 'launch-default-intent',
      sourceWorkflow: 'test-workflow',
      workingDirectory: '/tmp',
      createdAt: '2024-03-25T10:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.intent).toBe('artifactAffecting');
    }
  });

  it('rejects invalid intent values', () => {
    const result = safeParse(SLaunchContext, {
      launchId: 'launch-bad-intent',
      sourceWorkflow: 'test-workflow',
      workingDirectory: '/tmp',
      intent: 'destructive',
      createdAt: '2024-03-25T10:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid createdAt format', () => {
    const result = safeParse(SLaunchContext, {
      launchId: 'launch-bad-date',
      sourceWorkflow: 'test-workflow',
      workingDirectory: '/tmp',
      createdAt: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});

describe('SLaunchTemplate schema', () => {
  it('validates a complete template', () => {
    const result = safeParse(SLaunchTemplate, {
      id: 'test-template',
      name: 'Test Template',
      description: 'A test template',
      command: 'echo',
      args: ['hello'],
      intent: 'readOnly',
      requiredCapabilities: [],
    });
    expect(result.success).toBe(true);
  });

  it('defaults args to empty array when omitted', () => {
    const result = safeParse(SLaunchTemplate, {
      id: 'no-args',
      name: 'No Args',
      description: 'Template without args',
      command: 'ls',
      intent: 'readOnly',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.args).toEqual([]);
    }
  });

  it('defaults requiredCapabilities to empty array when omitted', () => {
    const result = safeParse(SLaunchTemplate, {
      id: 'no-caps',
      name: 'No Caps',
      description: 'Template without capabilities',
      command: 'ls',
      intent: 'readOnly',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredCapabilities).toEqual([]);
    }
  });
});

describe('LAUNCH_TEMPLATES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(LAUNCH_TEMPLATES)).toBe(true);
    expect(LAUNCH_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('contains only valid templates', () => {
    for (const template of LAUNCH_TEMPLATES) {
      const result = safeParse(SLaunchTemplate, template);
      expect(result.success).toBe(true);
    }
  });

  it('has unique ids across all templates', () => {
    const ids = LAUNCH_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes terminal-readonly template', () => {
    const terminal = LAUNCH_TEMPLATES.find((t) => t.id === 'terminal-readonly');
    expect(terminal).toBeDefined();
    expect(terminal!.intent).toBe('readOnly');
    expect(terminal!.name).toBe('Open Terminal');
  });

  it('includes git-status template', () => {
    const gitStatus = LAUNCH_TEMPLATES.find((t) => t.id === 'git-status');
    expect(gitStatus).toBeDefined();
    expect(gitStatus!.command).toBe('git');
    expect(gitStatus!.args).toEqual(['status']);
  });

  it('includes git-log template', () => {
    const gitLog = LAUNCH_TEMPLATES.find((t) => t.id === 'git-log');
    expect(gitLog).toBeDefined();
    expect(gitLog!.command).toBe('git');
    expect(gitLog!.intent).toBe('readOnly');
  });
});

describe('getTemplateById', () => {
  it('returns matching template for known id', () => {
    const template = getTemplateById('terminal-readonly');
    expect(template).toBeDefined();
    expect(template!.id).toBe('terminal-readonly');
  });

  it('returns undefined for unknown id', () => {
    expect(getTemplateById('non-existent')).toBeUndefined();
  });

  it('returns correct template for each known id', () => {
    for (const expected of LAUNCH_TEMPLATES) {
      const found = getTemplateById(expected.id);
      expect(found).toBe(expected);
    }
  });
});

describe('requiresApproval', () => {
  it('returns false for readOnly intent', () => {
    const readOnlyTemplate: LaunchTemplate = {
      id: 'test-readonly',
      name: 'Read Only',
      description: 'A read-only test',
      command: 'cat',
      args: [],
      intent: 'readOnly',
      requiredCapabilities: [],
    };
    expect(requiresApproval(readOnlyTemplate)).toBe(false);
  });

  it('returns true for artifactAffecting intent', () => {
    const affectingTemplate: LaunchTemplate = {
      id: 'test-affecting',
      name: 'Artifact Affecting',
      description: 'An artifact-affecting test',
      command: 'rm',
      args: [],
      intent: 'artifactAffecting',
      requiredCapabilities: [],
    };
    expect(requiresApproval(affectingTemplate)).toBe(true);
  });

  it('returns false for built-in readOnly templates', () => {
    for (const template of LAUNCH_TEMPLATES) {
      if (template.intent === 'readOnly') {
        expect(requiresApproval(template)).toBe(false);
      }
    }
  });
});

describe('createLaunchContext', () => {
  it('creates a valid LaunchContext with required fields', () => {
    const template = getTemplateById('git-status')!;
    const context = createLaunchContext({
      sourceWorkflow: 'daily-briefing',
      workingDirectory: '/home/user/workspace',
      template,
    });

    expect(context.launchId).toMatch(/^launch-/);
    expect(context.sourceWorkflow).toBe('daily-briefing');
    expect(context.workingDirectory).toBe('/home/user/workspace');
    expect(context.command).toBe('git');
    expect(context.intent).toBe('readOnly');
    expect(context.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('creates context that validates against SLaunchContext', () => {
    const template = getTemplateById('terminal-readonly')!;
    const context = createLaunchContext({
      sourceWorkflow: 'test-workflow',
      workingDirectory: '/tmp',
      template,
    });

    const result = safeParse(SLaunchContext, context);
    expect(result.success).toBe(true);
  });

  it('uses template command when command param is omitted', () => {
    const template = getTemplateById('git-log')!;
    const context = createLaunchContext({
      sourceWorkflow: 'test',
      workingDirectory: '/tmp',
      template,
    });
    expect(context.command).toBe('git');
  });

  it('overrides command when command param is provided', () => {
    const template = getTemplateById('git-status')!;
    const context = createLaunchContext({
      sourceWorkflow: 'test',
      workingDirectory: '/tmp',
      template,
      command: '/usr/local/bin/git',
    });
    expect(context.command).toBe('/usr/local/bin/git');
  });

  it('passes through optional fields', () => {
    const template = getTemplateById('git-status')!;
    const context = createLaunchContext({
      sourceWorkflow: 'daily-briefing',
      sourceArtifactId: 'artifact-1',
      sourceRunId: 'run-42',
      workingDirectory: '/home/user/workspace',
      template,
      env: { PATH: '/usr/bin', HOME: '/home/user' },
      labels: ['git', 'status'],
    });

    expect(context.sourceArtifactId).toBe('artifact-1');
    expect(context.sourceRunId).toBe('run-42');
    expect(context.env).toEqual({ PATH: '/usr/bin', HOME: '/home/user' });
    expect(context.labels).toEqual(['git', 'status']);
  });

  it('generates unique launchIds', () => {
    const template = getTemplateById('git-status')!;
    const contexts = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const context = createLaunchContext({
        sourceWorkflow: 'test',
        workingDirectory: '/tmp',
        template,
      });
      contexts.add(context.launchId);
    }

    expect(contexts.size).toBe(50);
  });

  it('sets intent from template', () => {
    const readOnly = getTemplateById('git-status')!;
    const context = createLaunchContext({
      sourceWorkflow: 'test',
      workingDirectory: '/tmp',
      template: readOnly,
    });
    expect(context.intent).toBe('readOnly');
  });

  it('omits optional fields when not provided', () => {
    const template = getTemplateById('git-status')!;
    const context = createLaunchContext({
      sourceWorkflow: 'test',
      workingDirectory: '/tmp',
      template,
    });

    expect(context.sourceArtifactId).toBeUndefined();
    expect(context.sourceRunId).toBeUndefined();
    expect(context.env).toBeUndefined();
    expect(context.labels).toBeUndefined();
  });
});
