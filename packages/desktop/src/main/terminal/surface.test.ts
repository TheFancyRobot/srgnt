import { describe, it, expect } from 'vitest';
import { parseSync } from '@srgnt/contracts';
import {
  SWorkflowLaunchContext,
  STerminalSurfaceConfig,
  STerminalPreviewRequest,
  STerminalPreviewResponse,
  SRunLogEntry,
} from './surface.js';

describe('SWorkflowLaunchContext', () => {
  const valid = {
    workflowId: 'wf-1',
    workflowName: 'test-workflow',
    artifactHome: '/tmp/artifacts',
    connectorHome: '/tmp/connectors',
    skillHome: '/tmp/skills',
  };

  it('validates with all required fields', () => {
    const result = parseSync(SWorkflowLaunchContext, valid);
    expect(result.workflowId).toBe('wf-1');
    expect(result.workflowName).toBe('test-workflow');
  });

  it('defaults environment to {} when omitted', () => {
    const result = parseSync(SWorkflowLaunchContext, valid);
    expect(result.environment).toEqual({});
  });

  it('accepts explicit environment', () => {
    const result = parseSync(SWorkflowLaunchContext, { ...valid, environment: { FOO: 'bar' } });
    expect(result.environment).toEqual({ FOO: 'bar' });
  });

  it('rejects missing required fields', () => {
    expect(() => parseSync(SWorkflowLaunchContext, { workflowId: 'wf-1' })).toThrow();
  });
});

describe('STerminalSurfaceConfig', () => {
  it('validates with no fields (all optional with defaults)', () => {
    const result = parseSync(STerminalSurfaceConfig, {});
    expect(result.defaultRows).toBe(24);
    expect(result.defaultCols).toBe(80);
    expect(result.maxSessions).toBe(5);
    expect(result.sessionTimeoutMs).toBe(3600000);
    expect(typeof result.shell).toBe('string');
  });

  it('defaults defaultRows to 24', () => {
    expect(parseSync(STerminalSurfaceConfig, {}).defaultRows).toBe(24);
  });

  it('defaults defaultCols to 80', () => {
    expect(parseSync(STerminalSurfaceConfig, {}).defaultCols).toBe(80);
  });

  it('defaults maxSessions to 5', () => {
    expect(parseSync(STerminalSurfaceConfig, {}).maxSessions).toBe(5);
  });

  it('defaults sessionTimeoutMs to 3600000', () => {
    expect(parseSync(STerminalSurfaceConfig, {}).sessionTimeoutMs).toBe(3600000);
  });

  it('rejects non-positive-integer for defaultRows', () => {
    expect(() => parseSync(STerminalSurfaceConfig, { defaultRows: 0 })).toThrow();
    expect(() => parseSync(STerminalSurfaceConfig, { defaultRows: -1 })).toThrow();
    expect(() => parseSync(STerminalSurfaceConfig, { defaultRows: 1.5 })).toThrow();
  });
});

describe('STerminalPreviewRequest', () => {
  it('validates with sessionId + command', () => {
    const result = parseSync(STerminalPreviewRequest, { sessionId: 's1', command: 'ls' });
    expect(result.sessionId).toBe('s1');
    expect(result.command).toBe('ls');
  });

  it('validates with optional workingDirectory', () => {
    const result = parseSync(STerminalPreviewRequest, { sessionId: 's1', command: 'ls', workingDirectory: '/tmp' });
    expect(result.workingDirectory).toBe('/tmp');
  });

  it('rejects missing sessionId', () => {
    expect(() => parseSync(STerminalPreviewRequest, { command: 'ls' })).toThrow();
  });
});

describe('STerminalPreviewResponse', () => {
  it('validates minimal (preview only)', () => {
    const result = parseSync(STerminalPreviewResponse, { preview: 'output' });
    expect(result.preview).toBe('output');
  });

  it('defaults affectedArtifacts to []', () => {
    expect(parseSync(STerminalPreviewResponse, { preview: 'out' }).affectedArtifacts).toEqual([]);
  });

  it('defaults requiresApproval to false', () => {
    expect(parseSync(STerminalPreviewResponse, { preview: 'out' }).requiresApproval).toBe(false);
  });

  it('defaults riskLevel to "low"', () => {
    expect(parseSync(STerminalPreviewResponse, { preview: 'out' }).riskLevel).toBe('low');
  });
});

describe('SRunLogEntry', () => {
  const validDatetime = '2025-06-15T10:30:00Z';

  it('validates with timestamp, level, message', () => {
    const result = parseSync(SRunLogEntry, {
      timestamp: validDatetime,
      level: 'info',
      message: 'hello',
    });
    expect(result.level).toBe('info');
    expect(result.message).toBe('hello');
  });

  it('accepts all 4 level literals', () => {
    for (const level of ['debug', 'info', 'warn', 'error'] as const) {
      const result = parseSync(SRunLogEntry, { timestamp: validDatetime, level, message: 'x' });
      expect(result.level).toBe(level);
    }
  });

  it('rejects invalid level', () => {
    expect(() => parseSync(SRunLogEntry, { timestamp: validDatetime, level: 'critical', message: 'x' })).toThrow();
  });

  it('rejects invalid datetime pattern for timestamp', () => {
    expect(() => parseSync(SRunLogEntry, { timestamp: 'not-a-datetime', level: 'info', message: 'x' })).toThrow();
    expect(() => parseSync(SRunLogEntry, { timestamp: '2025-06-15', level: 'info', message: 'x' })).toThrow();
  });

  it('accepts optional sessionId and metadata', () => {
    const result = parseSync(SRunLogEntry, {
      timestamp: validDatetime,
      level: 'warn',
      message: 'msg',
      sessionId: 's1',
      metadata: { key: 'k', value: 42 },
    });
    expect(result.sessionId).toBe('s1');
    expect(result.metadata).toEqual({ key: 'k', value: 42 });
  });
});
