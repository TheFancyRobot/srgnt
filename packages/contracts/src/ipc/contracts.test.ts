import { describe, it, expect } from 'vitest';
import { parseSync } from '../shared-schemas.js';
import {
  SIpcChannel,
  SIpcRequest,
  SIpcResponse,
  SAppVersionResponse,
  SDesktopSettings,
  SUserDataPathResponse,
  STerminalLaunchWithContextRequest,
  STerminalLaunchWithContextResponse,
  SLaunchApprovalPayload,
  SLaunchApprovalResolveRequest,
  SOpenExternalRequest,
  SSemanticSearchInitRequest,
  SSemanticSearchInitResponse,
  SSemanticSearchEnableForWorkspaceRequest,
  SSemanticSearchEnableForWorkspaceResponse,
  SSemanticSearchIndexWorkspaceRequest,
  SSemanticSearchIndexWorkspaceResponse,
  SSemanticSearchRebuildAllRequest,
  SSemanticSearchRebuildAllResponse,
  SSemanticSearchSearchRequest,
  SSemanticSearchSearchResponse,
  SSemanticSearchStatusRequest,
  SSemanticSearchStatusResponse,
  ipcChannels,
  SChatPermissionCloseEvent,
  SChatPermissionRequestEvent,
  SChatPermissionResponse,
  SChatSessionNewRequest,
  SChatSessionNewResponse,
  SChatSessionPromptRequest,
  SChatSessionPromptResponse,
  SChatSessionRef,
  SChatSessionSetModeRequest,
  SChatSessionSetModeResponse,
  SChatSessionStatusEvent,
  SChatSessionUpdateEvent,
  SChatTerminalOutputEvent,
} from './contracts.js';

describe('IPC Channel', () => {
  it('accepts valid channels', () => {
    const channels = [
      'app:get-version',
      'app:get-user-data-path',
      'workspace:get-root',
      'terminal:launch-with-context',
      'launch:approval-resolve',
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
      channel: 'terminal:write' as const,
      requestId: 'req-1',
      payload: { sessionId: 'pty-1', data: 'ls\n' },
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

describe('Desktop Settings Schema', () => {
  it('accepts a full desktop settings payload', () => {
    const parsed = parseSync(SDesktopSettings, {
      theme: 'system',
      updateChannel: 'stable',
      telemetryEnabled: false,
      crashReportsEnabled: false,
      debugMode: false,
      maxConcurrentRuns: '3',
      layout: {
        sidebarWidth: 300,
        sidebarCollapsed: true,
      },
    });

    expect(parsed.theme).toBe('system');
    expect(parsed.layout).toEqual({ sidebarWidth: 300, sidebarCollapsed: true });
  });

  it('fills layout defaults when omitted', () => {
    const parsed = parseSync(SDesktopSettings, {
      theme: 'light',
      updateChannel: 'beta',
      telemetryEnabled: true,
      crashReportsEnabled: true,
      debugMode: true,
      maxConcurrentRuns: '1',
    });

    expect(parsed.layout).toEqual({ sidebarWidth: 240, sidebarCollapsed: false });
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

describe('Semantic Search IPC', () => {
  it('accepts all semantic search channels', () => {
    const channels = [
      'semantic-search:init',
      'semantic-search:enable-for-workspace',
      'semantic-search:index-workspace',
      'semantic-search:rebuild-all',
      'semantic-search:search',
      'semantic-search:status',
    ] as const;

    for (const channel of channels) {
      expect(() => parseSync(SIpcChannel, channel)).not.toThrow();
    }
  });

  describe('Init', () => {
    it('validates init request without renderer-facing model internals', () => {
      expect(() => parseSync(SSemanticSearchInitRequest, {})).not.toThrow();
    });
    it('validates init response', () => {
      expect(() => parseSync(SSemanticSearchInitResponse, { initialized: true, modelId: 'model-v1' })).not.toThrow();
      expect(() => parseSync(SSemanticSearchInitResponse, { initialized: false })).not.toThrow();
    });
  });

  describe('Enable For Workspace', () => {
    it('validates enable request', () => {
      expect(() => parseSync(SSemanticSearchEnableForWorkspaceRequest, { workspaceRoot: '/workspace' })).not.toThrow();
    });
    it('validates enable response', () => {
      const parsed = parseSync(SSemanticSearchEnableForWorkspaceResponse, { enabled: true });
      expect(parsed.enabled).toBe(true);
    });
  });

  describe('Index Workspace', () => {
    it('applies force default', () => {
      const parsed = parseSync(SSemanticSearchIndexWorkspaceRequest, { workspaceRoot: '/w' });
      expect(parsed.force).toBe(false);
    });
    it('validates index response', () => {
      const parsed = parseSync(SSemanticSearchIndexWorkspaceResponse, { indexedChunkCount: 50, skippedCount: 3, durationMs: 1200 });
      expect(parsed.indexedChunkCount).toBe(50);
    });
  });

  describe('Rebuild All', () => {
    it('validates rebuild request', () => {
      expect(() => parseSync(SSemanticSearchRebuildAllRequest, { workspaceRoot: '/w' })).not.toThrow();
    });
    it('validates rebuild response', () => {
      expect(() => parseSync(SSemanticSearchRebuildAllResponse, { totalChunkCount: 100, durationMs: 5000 })).not.toThrow();
    });
  });

  describe('Search', () => {
    it('applies defaults', () => {
      const parsed = parseSync(SSemanticSearchSearchRequest, { workspaceRoot: '/w', query: 'test' });
      expect(parsed.maxResults).toBe(10);
      expect(parsed.minScore).toBe(0.5);
    });
    it('validates search response', () => {
      const parsed = parseSync(SSemanticSearchSearchResponse, {
        results: [{ score: 0.9, title: 'Test', workspaceRelativePath: 'notes/test.md', snippet: '...' }],
      });
      expect(parsed.results).toHaveLength(1);
    });
    it('validates empty search results', () => {
      const parsed = parseSync(SSemanticSearchSearchResponse, { results: [] });
      expect(parsed.results).toHaveLength(0);
    });
  });

  describe('Status', () => {
    it('validates status request', () => {
      expect(() => parseSync(SSemanticSearchStatusRequest, { workspaceRoot: '/w' })).not.toThrow();
    });
    it('applies chunkCount default', () => {
      const parsed = parseSync(SSemanticSearchStatusRequest, { workspaceRoot: '/w' });
      // chunkCount default is on the response, not request
      expect(parsed.workspaceRoot).toBe('/w');
    });
    it('validates status response with defaults', () => {
      const parsed = parseSync(SSemanticSearchStatusResponse, { state: 'ready' });
      expect(parsed.chunkCount).toBe(0);
      expect(parsed.modelId).toBeUndefined();
    });
    it('validates all status states', () => {
      const states = ['uninitialized', 'initializing', 'ready', 'indexing', 'disabled', 'error'];
      for (const state of states) {
        expect(() => parseSync(SSemanticSearchStatusResponse, { state })).not.toThrow();
      }
    });
    it('rejects invalid status state', () => {
      expect(() => parseSync(SSemanticSearchStatusResponse, { state: 'invalid' })).toThrow();
    });
  });
});

describe('Chat session IPC (PHASE-23)', () => {
  it('registers the chat channels as valid IPC channels', () => {
    for (const channel of [
      ipcChannels.chatSessionNew,
      ipcChannels.chatSessionPrompt,
      ipcChannels.chatSessionCancel,
      ipcChannels.chatSessionDispose,
      ipcChannels.chatSessionUpdate,
      ipcChannels.chatTerminalOutput,
    ]) {
      expect(() => parseSync(SIpcChannel, channel)).not.toThrow();
    }
  });

  it('carries client-terminal output chunks keyed by chat handle and terminal id', () => {
    const parsed = parseSync(SChatTerminalOutputEvent, {
      sessionId: 'chat-mock-1',
      terminalId: 'chat-term-1',
      chunk: 'hello\r\n',
    });
    expect(parsed).toEqual({ sessionId: 'chat-mock-1', terminalId: 'chat-term-1', chunk: 'hello\r\n' });
    expect(() => parseSync(SChatTerminalOutputEvent, { sessionId: 'chat-mock-1', chunk: 'x' })).toThrow();
  });

  it('keeps the chat channels distinct from the dev-console ones', () => {
    expect(ipcChannels.chatSessionNew).not.toBe(ipcChannels.devSessionNew);
    expect(ipcChannels.chatSessionUpdate).toBe('chat:session:update');
  });

  describe('new session', () => {
    it('accepts both targets', () => {
      expect(parseSync(SChatSessionNewRequest, { target: 'mock' }).target).toBe('mock');
      expect(parseSync(SChatSessionNewRequest, { target: 'pi' }).target).toBe('pi');
    });

    it('rejects an unknown target', () => {
      expect(() => parseSync(SChatSessionNewRequest, { target: 'bogus' })).toThrow();
    });

    it('carries harness identity and quirks to the renderer', () => {
      const parsed = parseSync(SChatSessionNewResponse, {
        sessionId: 'chat-pi-1',
        target: 'pi',
        harnessId: 'pi',
        harnessName: 'Pi',
        quirks: ['adapter-mediated', 'permission-routing-gaps'],
        capabilities: { protocolVersion: 1, loadSession: false },
      });
      expect(parsed.harnessId).toBe('pi');
      expect(parsed.harnessName).toBe('Pi');
      expect(parsed.quirks).toEqual(['adapter-mediated', 'permission-routing-gaps']);
      expect(parsed.capabilities.protocolVersion).toBe(1);
    });

    it('accepts an empty quirks array (the mock declares none)', () => {
      const parsed = parseSync(SChatSessionNewResponse, {
        sessionId: 'chat-mock-1',
        target: 'mock',
        harnessId: 'mock',
        harnessName: 'Mock Agent',
        quirks: [],
        capabilities: {},
      });
      expect(parsed.quirks).toEqual([]);
    });

    it('rejects a response missing harness identity', () => {
      expect(() =>
        parseSync(SChatSessionNewResponse, {
          sessionId: 'chat-mock-1',
          target: 'mock',
          quirks: [],
          capabilities: {},
        }),
      ).toThrow();
    });

    it('carries advertised session modes when the agent has them', () => {
      const parsed = parseSync(SChatSessionNewResponse, {
        sessionId: 'chat-pi-1',
        target: 'pi',
        harnessId: 'pi',
        harnessName: 'Pi',
        quirks: [],
        capabilities: {},
        modes: {
          currentModeId: 'high',
          availableModes: [
            { id: 'low', name: 'Low' },
            { id: 'high', name: 'High' },
          ],
        },
      });
      expect(parsed.modes?.currentModeId).toBe('high');
      expect(parsed.modes?.availableModes).toHaveLength(2);
    });

    it('treats absent modes as "no mode selector", not an error', () => {
      const parsed = parseSync(SChatSessionNewResponse, {
        sessionId: 'chat-mock-1',
        target: 'mock',
        harnessId: 'mock',
        harnessName: 'Mock Agent',
        quirks: [],
        capabilities: {},
      });
      expect(parsed.modes).toBeUndefined();
    });

    it('rejects a malformed modes block rather than half-rendering it', () => {
      expect(() =>
        parseSync(SChatSessionNewResponse, {
          sessionId: 'chat-pi-1',
          target: 'pi',
          harnessId: 'pi',
          harnessName: 'Pi',
          quirks: [],
          capabilities: {},
          modes: { currentModeId: 'high', availableModes: [{ id: 'high' }] },
        }),
      ).toThrow();
    });
  });

  describe('set-mode round trip (STEP-23-04)', () => {
    it('validates a set-mode request', () => {
      const parsed = parseSync(SChatSessionSetModeRequest, { sessionId: 'chat-pi-1', modeId: 'xhigh' });
      expect(parsed.modeId).toBe('xhigh');
    });

    it('rejects a set-mode request missing the session handle or the mode', () => {
      expect(() => parseSync(SChatSessionSetModeRequest, { modeId: 'xhigh' })).toThrow();
      expect(() => parseSync(SChatSessionSetModeRequest, { sessionId: 'chat-pi-1' })).toThrow();
      expect(() => parseSync(SChatSessionSetModeRequest, { sessionId: 'chat-pi-1', modeId: 7 })).toThrow();
    });

    it('echoes the mode the agent settled on', () => {
      const parsed = parseSync(SChatSessionSetModeResponse, { ok: true, currentModeId: 'xhigh' });
      expect(parsed.currentModeId).toBe('xhigh');
    });

    it('rejects a set-mode response that is not an acknowledgement', () => {
      expect(() => parseSync(SChatSessionSetModeResponse, { ok: false, currentModeId: 'xhigh' })).toThrow();
      expect(() => parseSync(SChatSessionSetModeResponse, { ok: true })).toThrow();
    });
  });

  describe('agent status push (STEP-23-04)', () => {
    it('carries a crash with its stderr tail and exit code', () => {
      const parsed = parseSync(SChatSessionStatusEvent, {
        sessionId: 'chat-pi-1',
        status: 'crashed',
        stderrTail: 'Error: boom\n',
        exitCode: 7,
        message: 'Agent process exited with code 7',
      });
      expect(parsed.status).toBe('crashed');
      expect(parsed.stderrTail).toBe('Error: boom\n');
      expect(parsed.exitCode).toBe(7);
    });

    it('accepts a null exit code (killed by a signal)', () => {
      expect(
        parseSync(SChatSessionStatusEvent, { sessionId: 'chat-pi-1', status: 'gave-up', exitCode: null }).exitCode,
      ).toBeNull();
    });

    it('accepts a bare lifecycle transition with no diagnostics', () => {
      expect(parseSync(SChatSessionStatusEvent, { sessionId: 'chat-mock-1', status: 'ready' }).status).toBe('ready');
    });

    it('rejects an unknown status, a missing handle, and a mistyped tail', () => {
      expect(() => parseSync(SChatSessionStatusEvent, { sessionId: 'chat-pi-1', status: 'reaped' })).toThrow();
      expect(() => parseSync(SChatSessionStatusEvent, { status: 'crashed' })).toThrow();
      expect(() =>
        parseSync(SChatSessionStatusEvent, { sessionId: 'chat-pi-1', status: 'crashed', stderrTail: 12 }),
      ).toThrow();
    });
  });

  describe('prompt, cancel, dispose, and update frames', () => {
    it('validates a prompt round trip', () => {
      expect(parseSync(SChatSessionPromptRequest, { sessionId: 'chat-mock-1', text: 'hi' }).text).toBe('hi');
      expect(parseSync(SChatSessionPromptResponse, { stopReason: 'end_turn' }).stopReason).toBe('end_turn');
    });

    it('rejects a prompt request with a non-string body', () => {
      expect(() => parseSync(SChatSessionPromptRequest, { sessionId: 'chat-mock-1', text: 42 })).toThrow();
    });

    it('validates a session ref', () => {
      expect(parseSync(SChatSessionRef, { sessionId: 'chat-mock-1' }).sessionId).toBe('chat-mock-1');
      expect(() => parseSync(SChatSessionRef, {})).toThrow();
    });

    it('keeps the streamed update payload opaque but the handle typed', () => {
      const parsed = parseSync(SChatSessionUpdateEvent, {
        sessionId: 'chat-mock-1',
        update: { sessionId: 'acp-1', update: { sessionUpdate: 'agent_message_chunk' } },
      });
      expect(parsed.sessionId).toBe('chat-mock-1');
      expect(parsed.update).toBeTypeOf('object');
    });

    it('rejects an update frame without a handle', () => {
      expect(() => parseSync(SChatSessionUpdateEvent, { update: {} })).toThrow();
    });
  });
  describe('permission round-trip frames (STEP-23-03)', () => {
    const request = {
      sessionId: 'chat-mock-1',
      requestId: 'chat-mock-1-perm-1',
      kind: 'edit',
      title: 'Edit answer.ts',
      paths: ['/work/answer.ts'],
      options: [
        { optionId: 'a1', name: 'Allow once', kind: 'allow_once' },
        { optionId: 'r1', name: 'Reject', kind: 'reject_once' },
      ],
    };

    it('carries everything the user needs to judge the request', () => {
      const parsed = parseSync(SChatPermissionRequestEvent, request);
      expect(parsed.requestId).toBe('chat-mock-1-perm-1');
      expect(parsed.paths).toEqual(['/work/answer.ts']);
      expect(parsed.options).toHaveLength(2);
    });

    it('accepts an unknown option kind rather than dropping the option', () => {
      // `kind` is an ACP *hint*; an agent may send anything, and the prompt must
      // still render a working button for it.
      const parsed = parseSync(SChatPermissionRequestEvent, {
        ...request,
        options: [{ optionId: 'x', name: 'Sure', kind: 'always_trust_me' }],
      });
      expect(parsed.options[0]!.kind).toBe('always_trust_me');
    });

    it('carries the command for execute calls', () => {
      const parsed = parseSync(SChatPermissionRequestEvent, { ...request, kind: 'execute', command: 'rm -rf build' });
      expect(parsed.command).toBe('rm -rf build');
    });

    it('rejects a request frame without a requestId — responses route by it', () => {
      const { requestId: _dropped, ...withoutId } = request;
      expect(() => parseSync(SChatPermissionRequestEvent, withoutId)).toThrow();
    });

    it('treats a response with no optionId as a cancel, not a malformed frame', () => {
      const parsed = parseSync(SChatPermissionResponse, {
        sessionId: 'chat-mock-1',
        requestId: 'chat-mock-1-perm-1',
      });
      expect(parsed.optionId).toBeUndefined();
    });

    it('validates a selected response', () => {
      expect(
        parseSync(SChatPermissionResponse, {
          sessionId: 'chat-mock-1',
          requestId: 'chat-mock-1-perm-1',
          optionId: 'a1',
        }).optionId,
      ).toBe('a1');
    });

    it('rejects a response missing the request it answers', () => {
      expect(() => parseSync(SChatPermissionResponse, { sessionId: 'chat-mock-1' })).toThrow();
    });

    it('constrains the close reason to the three ways main can resolve a prompt', () => {
      for (const reason of ['cancelled', 'expired', 'disposed']) {
        expect(
          parseSync(SChatPermissionCloseEvent, { sessionId: 'chat-mock-1', requestId: 'r1', reason }).reason,
        ).toBe(reason);
      }
      expect(() =>
        parseSync(SChatPermissionCloseEvent, { sessionId: 'chat-mock-1', requestId: 'r1', reason: 'because' }),
      ).toThrow();
    });
  });
});
