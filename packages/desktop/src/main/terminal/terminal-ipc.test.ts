import { describe, it, expect } from 'vitest';
import {
  STerminalSpawnRequest,
  STerminalSpawnResponse,
  STerminalWriteRequest,
  STerminalResizeRequest,
  STerminalCloseRequest,
  STerminalListResponse,
  STerminalLaunchWithContextRequest,
  safeParse,
} from '@srgnt/contracts';
import {
  SPtyProcessOptions,
  SPtyProcess,
  SPtyServiceEvents,
} from '../pty/contracts.js';
import {
  SWorkflowLaunchContext,
  STerminalSurfaceConfig,
  STerminalPreviewRequest,
  STerminalPreviewResponse,
  SRunLogEntry,
} from '../terminal/surface.js';

/* ────────────────────────────────────────────────────────────
 * IPC Terminal schemas
 * ──────────────────────────────────────────────────────────── */

describe('Terminal IPC Zod schemas', () => {
  describe('STerminalSpawnRequest', () => {
    it('accepts minimal spawn request', () => {
      const result = safeParse(STerminalSpawnRequest, {});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rows).toBe(24);
        expect(result.data.cols).toBe(80);
      }
    });

    it('accepts terminal geometry overrides', () => {
      const result = safeParse(STerminalSpawnRequest, {
        rows: 40,
        cols: 120,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rows).toBe(40);
        expect(result.data.cols).toBe(120);
      }
    });

    it('accepts terminal requests even when extra fields are present', () => {
      const result = safeParse(STerminalSpawnRequest, {
        command: '/bin/zsh',
        args: ['-l'],
        env: { TERM: 'xterm-256color' },
        cwd: '/home/user',
        rows: 40,
        cols: 120,
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-positive rows', () => {
      const result = safeParse(STerminalSpawnRequest, { rows: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects non-positive cols', () => {
      const result = safeParse(STerminalSpawnRequest, { cols: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer rows', () => {
      const result = safeParse(STerminalSpawnRequest, { rows: 24.5 });
      expect(result.success).toBe(false);
    });
  });

  describe('STerminalSpawnResponse', () => {
    it('accepts valid spawn response', () => {
      const result = safeParse(STerminalSpawnResponse, {
        sessionId: 'pty-session-abc123',
        pid: 12345,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing sessionId', () => {
      const result = safeParse(STerminalSpawnResponse, { pid: 12345 });
      expect(result.success).toBe(false);
    });

    it('rejects missing pid', () => {
      const result = safeParse(STerminalSpawnResponse, { sessionId: 'abc' });
      expect(result.success).toBe(false);
    });
  });

  describe('STerminalWriteRequest', () => {
    it('accepts valid write request', () => {
      const result = safeParse(STerminalWriteRequest, {
        sessionId: 'pty-session-abc',
        data: 'ls -la\n',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing sessionId', () => {
      const result = safeParse(STerminalWriteRequest, { data: 'hello' });
      expect(result.success).toBe(false);
    });

    it('rejects missing data', () => {
      const result = safeParse(STerminalWriteRequest, { sessionId: 'abc' });
      expect(result.success).toBe(false);
    });
  });

  describe('STerminalResizeRequest', () => {
    it('accepts valid resize request', () => {
      const result = safeParse(STerminalResizeRequest, {
        sessionId: 'pty-session-abc',
        rows: 50,
        cols: 120,
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-positive rows', () => {
      const result = safeParse(STerminalResizeRequest, {
        sessionId: 'abc',
        rows: 0,
        cols: 80,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-positive cols', () => {
      const result = safeParse(STerminalResizeRequest, {
        sessionId: 'abc',
        rows: 24,
        cols: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing sessionId', () => {
      const result = safeParse(STerminalResizeRequest, { rows: 24, cols: 80 });
      expect(result.success).toBe(false);
    });
  });

  describe('STerminalCloseRequest', () => {
    it('accepts valid close request', () => {
      const result = safeParse(STerminalCloseRequest, { sessionId: 'abc' });
      expect(result.success).toBe(true);
    });

    it('rejects missing sessionId', () => {
      const result = safeParse(STerminalCloseRequest, {});
      expect(result.success).toBe(false);
    });
  });

  describe('STerminalListResponse', () => {
    it('accepts empty session list', () => {
      const result = safeParse(STerminalListResponse, { sessions: [] });
      expect(result.success).toBe(true);
    });

    it('accepts populated session list', () => {
      const result = safeParse(STerminalListResponse, {
        sessions: [
          { id: 's1', pid: 100, isActive: true, startedAt: '2026-03-27T00:00:00Z' },
          { id: 's2', pid: 200, isActive: false, startedAt: '2026-03-27T01:00:00Z' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid startedAt format', () => {
      const result = safeParse(STerminalListResponse, {
        sessions: [{ id: 's1', pid: 100, isActive: true, startedAt: 'not-a-date' }],
      });
      expect(result.success).toBe(false);
    });
  });
});

/* ────────────────────────────────────────────────────────────
 * PTY contract schemas
 * ──────────────────────────────────────────────────────────── */

describe('PTY contract Effect schemas', () => {
  describe('SPtyProcessOptions', () => {
    it('accepts empty options with defaults', () => {
      const result = safeParse(SPtyProcessOptions, {});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.command).toBeUndefined();
        expect(result.data.args).toEqual([]);
        expect(result.data.env).toEqual({});
        expect(result.data.rows).toBe(24);
        expect(result.data.cols).toBe(80);
      }
    });

    it('accepts explicit command with defaults', () => {
      const result = safeParse(SPtyProcessOptions, { command: '/bin/bash' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.args).toEqual([]);
        expect(result.data.env).toEqual({});
        expect(result.data.rows).toBe(24);
        expect(result.data.cols).toBe(80);
      }
    });

    it('rejects non-positive rows', () => {
      const result = safeParse(SPtyProcessOptions, { command: '/bin/bash', rows: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe('SPtyProcess', () => {
    it('accepts valid process info', () => {
      const result = safeParse(SPtyProcess, { pid: 123, fd: 5 });
      expect(result.success).toBe(true);
    });

    it('accepts process info with exitCode', () => {
      const result = safeParse(SPtyProcess, { pid: 123, fd: 5, exitCode: 0 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.exitCode).toBe(0);
      }
    });

    it('rejects missing pid', () => {
      const result = safeParse(SPtyProcess, { fd: 5 });
      expect(result.success).toBe(false);
    });
  });

  describe('SPtyServiceEvents', () => {
    it.each(['data', 'exit', 'error', 'resize'] as const)('accepts event "%s"', (event) => {
      expect(safeParse(SPtyServiceEvents, event).success).toBe(true);
    });

    it('rejects unknown event', () => {
      expect(safeParse(SPtyServiceEvents, 'unknown').success).toBe(false);
    });
  });
});

/* ────────────────────────────────────────────────────────────
 * Terminal surface schemas
 * ──────────────────────────────────────────────────────────── */

describe('Terminal surface Effect schemas', () => {
  describe('SWorkflowLaunchContext', () => {
    it('accepts valid launch context', () => {
      const result = safeParse(SWorkflowLaunchContext, {
        workflowId: 'wf-1',
        workflowName: 'Deploy',
        artifactHome: '/artifacts',
        connectorHome: '/connectors',
        skillHome: '/skills',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.environment).toEqual({});
      }
    });

    it('rejects missing required fields', () => {
      const result = safeParse(SWorkflowLaunchContext, { workflowId: 'wf-1' });
      expect(result.success).toBe(false);
    });
  });

  describe('STerminalSurfaceConfig', () => {
    it('provides sensible defaults', () => {
      const result = safeParse(STerminalSurfaceConfig, {});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.defaultRows).toBe(24);
        expect(result.data.defaultCols).toBe(80);
        expect(result.data.shell).toBe(process.env['SHELL'] || '/bin/bash');
        expect(result.data.maxSessions).toBe(5);
        expect(result.data.sessionTimeoutMs).toBe(3600000);
      }
    });

    it('accepts custom config', () => {
      const result = safeParse(STerminalSurfaceConfig, {
        defaultRows: 40,
        defaultCols: 120,
        shell: '/bin/zsh',
        maxSessions: 10,
        sessionTimeoutMs: 7200000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.shell).toBe('/bin/zsh');
      }
    });
  });

  describe('STerminalPreviewRequest', () => {
    it('accepts valid preview request', () => {
      const result = safeParse(STerminalPreviewRequest, {
        sessionId: 's1',
        command: 'npm run build',
      });
      expect(result.success).toBe(true);
    });

    it('accepts preview request with workingDirectory', () => {
      const result = safeParse(STerminalPreviewRequest, {
        sessionId: 's1',
        command: 'ls',
        workingDirectory: '/tmp',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing command', () => {
      const result = safeParse(STerminalPreviewRequest, { sessionId: 's1' });
      expect(result.success).toBe(false);
    });
  });

  describe('STerminalPreviewResponse', () => {
    it('accepts minimal response with defaults', () => {
      const result = safeParse(STerminalPreviewResponse, { preview: 'OK' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.affectedArtifacts).toEqual([]);
        expect(result.data.requiresApproval).toBe(false);
        expect(result.data.riskLevel).toBe('low');
      }
    });

    it('accepts full response', () => {
      const result = safeParse(STerminalPreviewResponse, {
        preview: 'Will delete files',
        affectedArtifacts: ['/src/main.ts'],
        requiresApproval: true,
        riskLevel: 'high',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid riskLevel', () => {
      const result = safeParse(STerminalPreviewResponse, {
        preview: 'OK',
        riskLevel: 'critical',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SRunLogEntry', () => {
    it('accepts valid log entry', () => {
      const result = safeParse(SRunLogEntry, {
        timestamp: '2026-03-27T10:00:00Z',
        level: 'info',
        message: 'Process started',
      });
      expect(result.success).toBe(true);
    });

    it('accepts log entry with optional fields', () => {
      const result = safeParse(SRunLogEntry, {
        timestamp: '2026-03-27T10:00:00Z',
        level: 'error',
        message: 'Failed',
        sessionId: 's1',
        metadata: { exitCode: 1 },
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid level', () => {
      const result = safeParse(SRunLogEntry, {
        timestamp: '2026-03-27T10:00:00Z',
        level: 'fatal',
        message: 'boom',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid timestamp format', () => {
      const result = safeParse(SRunLogEntry, {
        timestamp: 'not-a-date',
        level: 'info',
        message: 'hello',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('STerminalLaunchWithContextRequest', () => {
    const validLaunchContext = {
      launchId: 'launch-001',
      sourceWorkflow: 'daily-briefing',
      workingDirectory: '/workspace/demo',
      command: 'git status',
      intent: 'readOnly',
      createdAt: new Date().toISOString(),
    };

    it('accepts valid launch context with defaults', () => {
      const result = safeParse(STerminalLaunchWithContextRequest, {
        launchContext: validLaunchContext,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rows).toBe(24);
        expect(result.data.cols).toBe(80);
        expect(result.data.launchContext.launchId).toBe('launch-001');
      }
    });

    it('accepts custom rows and cols', () => {
      const result = safeParse(STerminalLaunchWithContextRequest, {
        launchContext: validLaunchContext,
        rows: 40,
        cols: 120,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rows).toBe(40);
        expect(result.data.cols).toBe(120);
      }
    });

    it('rejects missing launchContext', () => {
      const result = safeParse(STerminalLaunchWithContextRequest, {});
      expect(result.success).toBe(false);
    });

    it('rejects invalid intent', () => {
      const result = safeParse(STerminalLaunchWithContextRequest, {
        launchContext: { ...validLaunchContext, intent: 'destructive' },
      });
      expect(result.success).toBe(false);
    });

    it('defaults intent to artifactAffecting when omitted', () => {
      const { intent, ...noIntent } = validLaunchContext;
      const result = safeParse(STerminalLaunchWithContextRequest, {
        launchContext: noIntent,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.launchContext.intent).toBe('artifactAffecting');
      }
    });
  });

  describe('Launch intent approval paths', () => {
    it('readOnly intent does not require approval', () => {
      const readOnlyContext = {
        launchId: 'launch-readonly-001',
        sourceWorkflow: 'daily-briefing',
        workingDirectory: '/workspace/demo',
        command: 'git status',
        intent: 'readOnly' as const,
        createdAt: new Date().toISOString(),
      };
      const result = safeParse(STerminalLaunchWithContextRequest, {
        launchContext: readOnlyContext,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.launchContext.intent).toBe('readOnly');
      }
    });

    it('artifactAffecting intent requires approval', () => {
      const artifactAffectingContext = {
        launchId: 'launch-approval-001',
        sourceWorkflow: 'daily-briefing',
        sourceArtifactId: 'SRGNT-142',
        workingDirectory: '/workspace/demo',
        command: 'git push',
        intent: 'artifactAffecting' as const,
        createdAt: new Date().toISOString(),
      };
      const result = safeParse(STerminalLaunchWithContextRequest, {
        launchContext: artifactAffectingContext,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.launchContext.intent).toBe('artifactAffecting');
        expect(result.data.launchContext.sourceArtifactId).toBe('SRGNT-142');
      }
    });

    it('rejects invalid intent values', () => {
      const invalidContext = {
        launchId: 'launch-invalid-001',
        sourceWorkflow: 'daily-briefing',
        workingDirectory: '/workspace/demo',
        command: 'rm -rf /',
        intent: 'deleteEverything' as any,
        createdAt: new Date().toISOString(),
      };
      const result = safeParse(STerminalLaunchWithContextRequest, {
        launchContext: invalidContext,
      });
      expect(result.success).toBe(false);
    });
  });
});
