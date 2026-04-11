import { describe, it, expect } from 'vitest';
import { parseSync } from '../shared-schemas.js';
import {
  SIpcChannel,
  SIpcRequest,
  SIpcResponse,
  SAppVersionResponse,
  SUserDataPathResponse,
  SConnectorListResponse,
  SSkillListResponse,
  SSkillRunRequest,
  SSkillRunResponse,
  SIpcApprovalRequest,
  SApprovalResolveRequest,
  STerminalLaunchWithContextRequest,
  STerminalLaunchWithContextResponse,
  SRunLogSaveRequest,
  SRunLogSaveResponse,
  SLaunchApprovalPayload,
  SLaunchApprovalResolveRequest,
  SOpenExternalRequest,
} from './contracts.js';

describe('IPC Channel', () => {
  it('accepts valid channels', () => {
    const channels = [
      'app:get-version',
      'app:get-user-data-path',
      'workspace:get-root',
      'connector:list',
      'skill:run',
      'approval:request',
    ] as const;
    for (const channel of channels) {
      expect(() => parseSync(SIpcChannel, channel)).not.toThrow();
    }
  });

  it('rejects invalid channels', () => {
    expect(() => parseSync(SIpcChannel, 'invalid')).toThrow();
  });
});

describe('IPC Request', () => {
  it('validates a minimal request', () => {
    const request = {
      channel: 'app:get-version' as const,
      requestId: 'req-1',
    };
    expect(() => parseSync(SIpcRequest, request)).not.toThrow();
  });

  it('validates request with payload', () => {
    const request = {
      channel: 'skill:run' as const,
      requestId: 'req-1',
      payload: { skillName: 'daily-briefing', version: '1.0.0' },
    };
    expect(() => parseSync(SIpcRequest, request)).not.toThrow();
  });
});

describe('IPC Response', () => {
  it('validates a success response', () => {
    const response = {
      requestId: 'req-1',
      success: true,
      data: { version: '1.0.0' },
    };
    expect(() => parseSync(SIpcResponse, response)).not.toThrow();
  });

  it('validates an error response', () => {
    const response = {
      requestId: 'req-1',
      success: false,
      error: 'Something went wrong',
    };
    expect(() => parseSync(SIpcResponse, response)).not.toThrow();
  });
});

describe('App Version Response', () => {
  it('validates the response', () => {
    const response = { version: '1.0.0' };
    expect(() => parseSync(SAppVersionResponse, response)).not.toThrow();
  });
});

describe('User Data Path Response', () => {
  it('validates the response', () => {
    const response = { path: '/Users/test/Library/Application Support/srgnt' };
    expect(() => parseSync(SUserDataPathResponse, response)).not.toThrow();
  });
});

describe('Connector List Response', () => {
  it('validates empty connector list', () => {
    const response = { connectors: [] };
    expect(() => parseSync(SConnectorListResponse, response)).not.toThrow();
  });

  it('validates connector list with items', () => {
    const response = {
      connectors: [
        { id: 'jira', name: 'Jira', status: 'connected' },
        { id: 'outlook', name: 'Outlook', status: 'disconnected' },
      ],
    };
    expect(() => parseSync(SConnectorListResponse, response)).not.toThrow();
  });
});

describe('Skill List Response', () => {
  it('validates empty skill list', () => {
    const response = { skills: [] };
    expect(() => parseSync(SSkillListResponse, response)).not.toThrow();
  });

  it('validates skill list with items', () => {
    const response = {
      skills: [
        { name: 'daily-briefing', version: '1.0.0' },
      ],
    };
    expect(() => parseSync(SSkillListResponse, response)).not.toThrow();
  });
});

describe('Skill Run Request', () => {
  it('validates a run request', () => {
    const request = {
      skillName: 'daily-briefing',
      skillVersion: '1.0.0',
      parameters: { date: '2024-03-25' },
    };
    expect(() => parseSync(SSkillRunRequest, request)).not.toThrow();
  });

  it('applies defaults', () => {
    const request = {
      skillName: 'daily-briefing',
      skillVersion: '1.0.0',
    };
    const parsed = parseSync(SSkillRunRequest, request);
    expect(parsed.parameters).toEqual({});
  });
});

describe('Skill Run Response', () => {
  it('validates the response', () => {
    const response = {
      runId: 'run-1',
      status: 'pending',
    };
    expect(() => parseSync(SSkillRunResponse, response)).not.toThrow();
  });
});

describe('Approval Request', () => {
  it('validates an approval request', () => {
    const request = {
      id: 'approval-1',
      capability: 'read:tasks',
      reason: 'Need to read tasks',
      requestedAt: '2024-03-25T10:00:00Z',
      requestedBy: 'agent@srgnt.app',
    };
    expect(() => parseSync(SIpcApprovalRequest, request)).not.toThrow();
  });
});

describe('Approval Resolve Request', () => {
  it('validates approve request', () => {
    const request = {
      id: 'approval-1',
      approved: true,
    };
    expect(() => parseSync(SApprovalResolveRequest, request)).not.toThrow();
  });

  it('validates deny request', () => {
    const request = {
      id: 'approval-1',
      approved: false,
    };
    expect(() => parseSync(SApprovalResolveRequest, request)).not.toThrow();
  });
});

describe('Terminal Launch With Context', () => {
  it('validates a wrapped launch request', () => {
    const request = {
      launchContext: {
        launchId: 'launch-1',
        sourceWorkflow: 'daily-briefing',
        sourceArtifactId: 'SRGNT-142',
        workingDirectory: '/workspace',
        intent: 'readOnly',
        labels: ['SRGNT-142', 'srgnt-core'],
        createdAt: '2024-03-25T10:00:00Z',
      },
      rows: 30,
      cols: 100,
    };

    expect(() => parseSync(STerminalLaunchWithContextRequest, request)).not.toThrow();
  });

  it('rejects an unwrapped launch context payload', () => {
    const request = {
      launchId: 'launch-1',
      sourceWorkflow: 'daily-briefing',
      workingDirectory: '/workspace',
      createdAt: '2024-03-25T10:00:00Z',
    };

    expect(() => parseSync(STerminalLaunchWithContextRequest, request)).toThrow();
  });

  it('validates a launch response', () => {
    const response = {
      sessionId: 'pty-session-1',
      pid: 12345,
      launchId: 'launch-1',
    };

    expect(() => parseSync(STerminalLaunchWithContextResponse, response)).not.toThrow();
  });
});

describe('RunLog Save', () => {
  it('validates a run log save request', () => {
    const request = {
      content: '# Run Log\n\n## Metadata\n- Run ID: runlog-123',
      runId: 'runlog-123',
      launchId: 'launch-456',
    };
    expect(() => parseSync(SRunLogSaveRequest, request)).not.toThrow();
  });

  it('validates a run log save response', () => {
    const response = {
      path: '/workspace/.command-center/runs/runlog-123.md',
    };
    expect(() => parseSync(SRunLogSaveResponse, response)).not.toThrow();
  });
});

describe('Open External Request', () => {
  it.each([
    'https://example.com',
    'http://example.com/path?q=1',
    'mailto:test@example.com',
  ])('accepts allowed external URL %s', (url) => {
    expect(() => parseSync(SOpenExternalRequest, { url })).not.toThrow();
  });

  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'data:text/html,<script>alert(1)</script>',
    'not-a-url',
  ])('rejects disallowed external URL %s', (url) => {
    expect(() => parseSync(SOpenExternalRequest, { url })).toThrow();
  });
});

describe('Launch Approval Payload', () => {
  it('validates an approval payload with low risk', () => {
    const payload = {
      approvalId: 'approval-001',
      launchContext: {
        launchId: 'launch-001',
        sourceWorkflow: 'daily-briefing',
        workingDirectory: '/workspace',
        intent: 'readOnly',
        createdAt: '2024-03-25T10:00:00Z',
      },
      command: 'git status',
      riskLevel: 'low',
      requiresApproval: false,
    };
    expect(() => parseSync(SLaunchApprovalPayload, payload)).not.toThrow();
  });

  it('validates an approval payload with high risk', () => {
    const payload = {
      approvalId: 'approval-002',
      launchContext: {
        launchId: 'launch-002',
        sourceWorkflow: 'skill-execution',
        sourceArtifactId: 'SRGNT-142',
        workingDirectory: '/workspace',
        intent: 'artifactAffecting',
        createdAt: '2024-03-25T10:00:00Z',
      },
      command: 'git push origin main',
      riskLevel: 'high',
      requiresApproval: true,
    };
    expect(() => parseSync(SLaunchApprovalPayload, payload)).not.toThrow();
  });

  it('rejects invalid risk level', () => {
    const payload = {
      approvalId: 'approval-003',
      launchContext: {
        launchId: 'launch-003',
        sourceWorkflow: 'daily-briefing',
        workingDirectory: '/workspace',
        intent: 'readOnly',
        createdAt: '2024-03-25T10:00:00Z',
      },
      command: 'ls',
      riskLevel: 'critical' as any,
      requiresApproval: false,
    };
    expect(() => parseSync(SLaunchApprovalPayload, payload)).toThrow();
  });

  it('rejects when requiresApproval is true but approvalId is missing', () => {
    const payload = {
      launchContext: {
        launchId: 'launch-004',
        sourceWorkflow: 'skill-execution',
        workingDirectory: '/workspace',
        intent: 'artifactAffecting',
        createdAt: '2024-03-25T10:00:00Z',
      },
      command: 'rm file.txt',
      riskLevel: 'medium',
      requiresApproval: true,
    };
    expect(() => parseSync(SLaunchApprovalPayload, payload)).toThrow();
  });
});
