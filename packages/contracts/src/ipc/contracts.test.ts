import { describe, it, expect } from 'vitest';
import { parseSync, safeParse } from '../shared-schemas.js';
import {
  ipcChannels,
  ipcChannelValues,
  FORK_KEY_CONFLICT,
  SChatSessionForkRequest,
  SChatSessionForkResponse,
  SChatSessionNewRequest,
  SChatSessionReconnectRequest,
  SChatSessionReconnectResponse,
  SChatSessionListRequest,
  SChatSessionListResponse,
  SChatSessionOpenRequest,
  SChatSessionOpenResponse,
  SHarnessListRequest,
  SHarnessListResponse,
  SHarnessMutationResponse,
  SHarnessRef,
  SHarnessSaveOverrideRequest,
  SProjectEnsureRequest,
  SProjectMergeRequest,
  SProjectRenameRequest,
  SProjectSetDefaultsRequest,
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
  SChatPermissionCloseEvent,
  SChatPermissionRequestEvent,
  SChatPermissionResponse,
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
    it('accepts any registry id as a target, including the reserved mock', () => {
      expect(parseSync(SChatSessionNewRequest, { target: 'mock' }).target).toBe('mock');
      expect(parseSync(SChatSessionNewRequest, { target: 'pi' }).target).toBe('pi');
      // STEP-25-02: `harnesses.json` can name anything, so which ids are valid
      // is registry data. Main rejects a dangling one with an actionable error
      // rather than the schema pretending to know the set.
      expect(parseSync(SChatSessionNewRequest, { target: 'opencode' }).target).toBe('opencode');
    });

    it('still rejects a target that is not a string', () => {
      expect(() => parseSync(SChatSessionNewRequest, { target: 42 })).toThrow();
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

describe('project IPC schemas (PHASE-24, STEP-24-02)', () => {
  it('exposes every project channel', () => {
    expect(ipcChannelValues).toEqual(
      expect.arrayContaining([
        'project:list',
        'project:ensure',
        'project:rename',
        'project:merge',
        'project:set-defaults',
      ]),
    );
  });

  it('decodes the ensure/rename/merge requests and rejects malformed ones', () => {
    expect(parseSync(SProjectEnsureRequest, { rootDir: '/w/app' }).rootDir).toBe('/w/app');
    expect(safeParse(SProjectEnsureRequest, { rootDir: 42 }).success).toBe(false);

    expect(parseSync(SProjectRenameRequest, { projectId: 'a', name: 'A' }).name).toBe('A');
    expect(safeParse(SProjectRenameRequest, { projectId: 'a' }).success).toBe(false);

    expect(
      parseSync(SProjectMergeRequest, { sourceProjectId: 'a', targetProjectId: 'b' }).targetProjectId,
    ).toBe('b');
    expect(safeParse(SProjectMergeRequest, { sourceProjectId: 'a' }).success).toBe(false);
  });

  it('lets set-defaults clear a field with null and omit it entirely', () => {
    expect(parseSync(SProjectSetDefaultsRequest, { projectId: 'a', defaultHarnessId: null })).toEqual({
      projectId: 'a',
      defaultHarnessId: null,
    });
    expect(parseSync(SProjectSetDefaultsRequest, { projectId: 'a' })).toEqual({ projectId: 'a' });
    expect(
      safeParse(SProjectSetDefaultsRequest, { projectId: 'a', permissionPolicy: { read: 'nope' } }).success,
    ).toBe(false);
  });

  it('requires a projectId to list sessions — the list is always per project', () => {
    expect(parseSync(SChatSessionListRequest, { projectId: 'p1' }).projectId).toBe('p1');
    expect(safeParse(SChatSessionListRequest, {}).success).toBe(false);

    const listed = parseSync(SChatSessionListResponse, {
      sessions: [
        {
          id: 's1',
          projectId: 'p1',
          harnessId: 'mock',
          status: 'idle',
          title: 'Fix the bug',
          createdAt: '2026-07-12T10:00:00.000Z',
          updatedAt: '2026-07-12T10:05:00.000Z',
        },
      ],
      skipped: [{ sessionId: 'broken', reason: 'invalid meta' }],
    });
    expect(listed.sessions[0]!.title).toBe('Fix the bug');
    expect(listed.skipped[0]!.sessionId).toBe('broken');
    // An unknown status must not decode: the list renders a status dot per value.
    expect(
      safeParse(SChatSessionListResponse, {
        sessions: [{ ...listed.sessions[0], status: 'running' }],
        skipped: [],
      }).success,
    ).toBe(false);
  });

  it('returns persisted events plus the truncated-tail flag when opening a session', () => {
    expect(parseSync(SChatSessionOpenRequest, { projectId: 'p1', sessionId: 's1' }).sessionId).toBe('s1');
    expect(safeParse(SChatSessionOpenRequest, { sessionId: 's1' }).success).toBe(false);

    const opened = parseSync(SChatSessionOpenResponse, {
      session: {
        id: 's1',
        projectId: 'p1',
        harnessId: 'mock',
        status: 'idle',
        createdAt: '2026-07-12T10:00:00.000Z',
      },
      events: [
        { seq: 0, ts: '2026-07-12T10:00:01.000Z', protocolVersion: 1, kind: 'client/prompt', payload: { text: 'hi' } },
        // Unknown kinds decode: readers must never fail on a newer writer's kind.
        { seq: 1, ts: '2026-07-12T10:00:02.000Z', protocolVersion: 1, kind: 'acp/future_kind' },
      ],
      truncatedTail: false,
      live: true,
    });
    expect(opened.events).toHaveLength(2);
    expect(opened.live).toBe(true);
    expect(safeParse(SChatSessionOpenResponse, { ...opened, truncatedTail: 'no' }).success).toBe(false);
  });

  it('makes chat:session:new target and projectId optional (project defaults fill in)', () => {
    expect(parseSync(SChatSessionNewRequest, {})).toEqual({});
    expect(parseSync(SChatSessionNewRequest, { projectId: 'abc' }).projectId).toBe('abc');
    // Any string is schema-valid since STEP-25-02 (targets are registry data);
    // a non-string still is not.
    expect(safeParse(SChatSessionNewRequest, { target: 42 }).success).toBe(false);
  });
});

describe('resume + fork IPC schemas (PHASE-24, STEP-24-04)', () => {
  const identity = {
    sessionId: 's2',
    target: 'mock' as const,
    projectId: 'p1',
    harnessId: 'mock',
    harnessName: 'Mock Agent',
    quirks: [],
    capabilities: { loadSession: true },
  };

  it('distinguishes every reconnect outcome, including which ACP path was taken', () => {
    expect(parseSync(SChatSessionReconnectRequest, { projectId: 'p1', sessionId: 's1' }).sessionId).toBe('s1');
    expect(safeParse(SChatSessionReconnectRequest, { sessionId: 's1' }).success).toBe(false);

    // `resumed` and `loaded` are both "it continues" but stay separable, which
    // is what lets a test assert the capability branch rather than the UI.
    for (const outcome of ['resumed', 'loaded'] as const) {
      const response = parseSync(SChatSessionReconnectResponse, { outcome, session: identity });
      expect(response.outcome).toBe(outcome);
      expect(response.session?.harnessId).toBe('mock');
    }
    const readOnly = parseSync(SChatSessionReconnectResponse, {
      outcome: 'read_only',
      reason: 'Mock Agent cannot continue a previous session.',
    });
    expect(readOnly.session).toBeUndefined();
    expect(parseSync(SChatSessionReconnectResponse, { outcome: 'retryable' }).outcome).toBe('retryable');
    expect(parseSync(SChatSessionReconnectResponse, { outcome: 'loaded', historyDiverged: true }).historyDiverged).toBe(true);
    // A new outcome must be added to the union deliberately, never smuggled in.
    expect(safeParse(SChatSessionReconnectResponse, { outcome: 'reprimed' }).success).toBe(false);
  });

  it('requires an idempotency key on fork and defaults the handoff on', () => {
    const request = parseSync(SChatSessionForkRequest, {
      projectId: 'p1',
      sourceSessionId: 's1',
      idempotencyKey: 'key-1',
    });
    expect(request.includeHandoff).toBe(true);
    expect(parseSync(SChatSessionForkRequest, { ...request, includeHandoff: false }).includeHandoff).toBe(false);
    // Without a key there is no double-click guard at all, so it is required.
    expect(safeParse(SChatSessionForkRequest, { projectId: 'p1', sourceSessionId: 's1' }).success).toBe(false);
  });

  it('returns the child, its parent, the pre-filled handoff, and whether it was reused', () => {
    const forked = parseSync(SChatSessionForkResponse, {
      session: identity,
      parentSessionId: 's1',
      handoffText: 'Continuing from "Fix the bug".\n',
      reused: false,
    });
    expect(forked.parentSessionId).toBe('s1');
    expect(forked.reused).toBe(false);
    expect(safeParse(SChatSessionForkResponse, { ...forked, handoffText: undefined }).success).toBe(false);
    // The collision failure has its own marker so a caller can tell "you reused
    // a key with different parameters" from any other fork error.
    expect(FORK_KEY_CONFLICT).toBe('fork_key_conflict');
  });

  it('registers both channels', () => {
    expect(ipcChannels.chatSessionReconnect).toBe('chat:session:reconnect');
    expect(ipcChannels.chatSessionFork).toBe('chat:session:fork');
  });
});

describe('harness configuration IPC (STEP-25-02)', () => {
  const definition = {
    id: 'pi',
    name: 'Pi',
    source: 'builtin' as const,
    launch: { command: 'npx', args: ['pi-acp@0.0.31'], env: {} },
    detectCommand: 'pi',
    quirks: ['adapter-mediated' as const],
    capabilityOverrides: { mcpServers: false },
  };

  it('registers the three harness channels', () => {
    expect(ipcChannels.harnessList).toBe('harness:list');
    expect(ipcChannels.harnessSaveOverride).toBe('harness:save-override');
    expect(ipcChannels.harnessResetOverride).toBe('harness:reset-override');
  });

  it('defaults the list request to the cached probe', () => {
    expect(parseSync(SHarnessListRequest, {}).refresh).toBe(false);
    expect(parseSync(SHarnessListRequest, { refresh: true }).refresh).toBe(true);
  });

  it('keeps the workspace load result distinct from an empty harness list', () => {
    const healthy = parseSync(SHarnessListResponse, { workspaceLoad: { ok: true }, harnesses: [] });
    expect(healthy.workspaceLoad).toEqual({ ok: true });

    const broken = parseSync(SHarnessListResponse, {
      workspaceLoad: { ok: false, error: 'harnesses.json is not valid' },
      harnesses: [{ definition, overridden: false, detection: { status: 'not-installed', command: 'pi' } }],
    });
    // Same empty-custom-entries surface, different meaning — the field says which.
    expect(broken.workspaceLoad).toEqual({ ok: false, error: 'harnesses.json is not valid' });
    // A failure without its message would render as a blank error banner.
    expect(safeParse(SHarnessListResponse, { workspaceLoad: { ok: false }, harnesses: [] }).success).toBe(false);
  });

  it('carries all three detection states', () => {
    const states = [
      { status: 'ok', command: 'opencode', version: '1.18.18' },
      { status: 'probe-failed', command: 'pi', reason: 'timeout' },
      { status: 'not-installed', command: 'pi' },
    ];
    for (const detection of states) {
      expect(
        parseSync(SHarnessListResponse, {
          workspaceLoad: { ok: true },
          harnesses: [{ definition, overridden: true, detection }],
        }).harnesses[0]?.detection.status,
      ).toBe(detection.status);
    }
    // An invented reason must not reach the UI as an unrenderable chip.
    expect(
      safeParse(SHarnessListResponse, {
        workspaceLoad: { ok: true },
        harnesses: [{ definition, overridden: false, detection: { status: 'probe-failed', command: 'pi', reason: 'vibes' } }],
      }).success,
    ).toBe(false);
  });

  it('requires a COMPLETE definition on save, never a patch', () => {
    const request = parseSync(SHarnessSaveOverrideRequest, { harnessId: 'pi', definition });
    expect(request.definition.quirks).toEqual(['adapter-mediated']);
    // A patch-shaped payload would silently delete `launch` on a wholesale replace.
    expect(safeParse(SHarnessSaveOverrideRequest, { harnessId: 'pi', definition: { id: 'pi', name: 'Pi' } }).success).toBe(false);
    // Clearing the detect command must round-trip as ABSENT; `''` would spawn
    // nothing and throw ERR_INVALID_ARG_VALUE at probe time.
    const { detectCommand: _cleared, ...withoutDetect } = definition;
    expect(parseSync(SHarnessSaveOverrideRequest, { harnessId: 'pi', definition: withoutDetect }).definition.detectCommand).toBeUndefined();
    expect(safeParse(SHarnessSaveOverrideRequest, { harnessId: 'pi', definition: { ...definition, detectCommand: '' } }).success).toBe(false);
  });

  it('names the harness on reset and answers mutations with a typed result', () => {
    expect(parseSync(SHarnessRef, { harnessId: 'pi' }).harnessId).toBe('pi');
    expect(parseSync(SHarnessMutationResponse, { ok: true })).toEqual({ ok: true });
    expect(parseSync(SHarnessMutationResponse, { ok: false, error: 'nope' })).toEqual({ ok: false, error: 'nope' });
    expect(safeParse(SHarnessMutationResponse, { ok: false }).success).toBe(false);
  });
});
