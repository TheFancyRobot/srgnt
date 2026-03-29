import { describe, it, expect } from 'vitest';
import { parseSync } from '../shared-schemas.js';
import {
  SExecutorCapability,
  SExecutorStatus,
  SRunStatus,
  SApprovalRequest,
  SExecutorContext,
  SSkillRunInput,
  SSkillRunOutput,
  SRunLogEntry,
  SSkillRunRecord,
  SExecutorManifest,
} from './run.js';

describe('SExecutorCapability', () => {
  it('accepts valid capabilities', () => {
    const caps = ['execute', 'approve', 'cancel', 'query'] as const;
    for (const cap of caps) {
      expect(() => parseSync(SExecutorCapability, cap)).not.toThrow();
    }
  });

  it('rejects invalid capability', () => {
    expect(() => parseSync(SExecutorCapability, 'invalid')).toThrow();
  });
});

describe('SExecutorStatus', () => {
  it('accepts valid statuses', () => {
    const statuses = ['idle', 'running', 'paused', 'stopped', 'error'] as const;
    for (const status of statuses) {
      expect(() => parseSync(SExecutorStatus, status)).not.toThrow();
    }
  });
});

describe('SRunStatus', () => {
  it('accepts valid statuses', () => {
    const statuses = ['pending', 'running', 'waiting_for_approval', 'completed', 'failed', 'cancelled'] as const;
    for (const status of statuses) {
      expect(() => parseSync(SRunStatus, status)).not.toThrow();
    }
  });
});

describe('SApprovalRequest', () => {
  it('validates a minimal approval request', () => {
    const request = {
      id: 'approval-1',
      capability: 'read:tasks',
      reason: 'Need to read tasks',
      requestedAt: '2024-03-25T10:00:00Z',
      requestedBy: 'agent@srgnt.app',
    };
    expect(() => parseSync(SApprovalRequest, request)).not.toThrow();
  });

  it('applies default status', () => {
    const request = {
      id: 'approval-1',
      capability: 'read:tasks',
      reason: 'Need to read tasks',
      requestedAt: '2024-03-25T10:00:00Z',
      requestedBy: 'agent@srgnt.app',
    };
    const parsed = parseSync(SApprovalRequest, request);
    expect(parsed.status).toBe('pending');
  });
});

describe('SExecutorContext', () => {
  it('validates a minimal context', () => {
    const ctx = {
      workspaceRoot: '/Users/test/workspace',
      skillHome: '/Users/test/workspace/.command-center/skills',
      connectorHome: '/Users/test/workspace/.command-center/connectors',
      artifactHome: '/Users/test/workspace/.command-center/artifacts',
    };
    expect(() => parseSync(SExecutorContext, ctx)).not.toThrow();
  });

  it('applies defaults', () => {
    const ctx = {
      workspaceRoot: '/Users/test/workspace',
      skillHome: '/Users/test/workspace/.command-center/skills',
      connectorHome: '/Users/test/workspace/.command-center/connectors',
      artifactHome: '/Users/test/workspace/.command-center/artifacts',
    };
    const parsed = parseSync(SExecutorContext, ctx);
    expect(parsed.environment).toEqual({});
  });
});

describe('SSkillRunInput', () => {
  it('validates a minimal input', () => {
    const input = {
      skillName: 'daily-briefing',
      skillVersion: '1.0.0',
      context: {
        workspaceRoot: '/Users/test/workspace',
        skillHome: '/Users/test/workspace/.command-center/skills',
        connectorHome: '/Users/test/workspace/.command-center/connectors',
        artifactHome: '/Users/test/workspace/.command-center/artifacts',
      },
    };
    expect(() => parseSync(SSkillRunInput, input)).not.toThrow();
  });

  it('applies defaults', () => {
    const input = {
      skillName: 'daily-briefing',
      skillVersion: '1.0.0',
      context: {
        workspaceRoot: '/Users/test/workspace',
        skillHome: '/Users/test/workspace/.command-center/skills',
        connectorHome: '/Users/test/workspace/.command-center/connectors',
        artifactHome: '/Users/test/workspace/.command-center/artifacts',
      },
    };
    const parsed = parseSync(SSkillRunInput, input);
    expect(parsed.parameters).toEqual({});
  });
});

describe('SSkillRunOutput', () => {
  it('validates a minimal output', () => {
    const output = {
      status: 'completed' as const,
      startedAt: '2024-03-25T10:00:00Z',
    };
    expect(() => parseSync(SSkillRunOutput, output)).not.toThrow();
  });

  it('validates full output', () => {
    const output = {
      status: 'completed' as const,
      result: { briefing: '# Daily Briefing' },
      artifacts: ['artifact-1'],
      approvals: [],
      logs: ['Log entry 1'],
      startedAt: '2024-03-25T10:00:00Z',
      completedAt: '2024-03-25T10:01:00Z',
      durationMs: 60000,
    };
    expect(() => parseSync(SSkillRunOutput, output)).not.toThrow();
  });
});

describe('SRunLogEntry', () => {
  it('validates a minimal log entry', () => {
    const entry = {
      timestamp: '2024-03-25T10:00:00Z',
      level: 'info' as const,
      message: 'Skill execution started',
    };
    expect(() => parseSync(SRunLogEntry, entry)).not.toThrow();
  });

  it('validates with metadata', () => {
    const entry = {
      timestamp: '2024-03-25T10:00:00Z',
      level: 'debug' as const,
      message: 'Processing',
      metadata: { count: 5 },
    };
    expect(() => parseSync(SRunLogEntry, entry)).not.toThrow();
  });
});

describe('SExecutorManifest', () => {
  it('validates a minimal manifest', () => {
    const manifest = {
      name: 'default-executor',
      version: '1.0.0',
    };
    expect(() => parseSync(SExecutorManifest, manifest)).not.toThrow();
  });

  it('applies defaults', () => {
    const manifest = {
      name: 'default-executor',
      version: '1.0.0',
    };
    const parsed = parseSync(SExecutorManifest, manifest);
    expect(parsed.capabilities).toEqual([]);
    expect(parsed.maxConcurrentRuns).toBe(1);
    expect(parsed.timeoutMs).toBe(300000);
  });

  it('rejects invalid semver', () => {
    const manifest = {
      name: 'default-executor',
      version: 'invalid',
    };
    expect(() => parseSync(SExecutorManifest, manifest)).toThrow();
  });
});
