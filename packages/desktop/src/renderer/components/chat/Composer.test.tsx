/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSessionProvider } from './ChatSessionContext.js';
import { ChatView } from './ChatView.js';
import { parseCommands, slashQuery } from './Composer.js';

/**
 * Composer tests (PHASE-23, STEP-23-04). Driven through the real
 * `ChatSessionProvider` and a stubbed `window.srgnt` — the same shape desktop-main
 * pushes — so a composer control that "works" only against a hand-made prop is
 * not what gets asserted here.
 */

interface Harness {
  push: (update: unknown, sessionId?: string) => Promise<void>;
  pushStatus: (status: Record<string, unknown>, sessionId?: string) => Promise<void>;
  askPermission: (request: Record<string, unknown>, sessionId?: string) => Promise<void>;
  api: Record<string, ReturnType<typeof vi.fn>>;
}

let harness: Harness;

/** Modes the "agent" advertises at `session/new`; `null` for an agent with none. */
type Modes = { currentModeId: string; availableModes: { id: string; name: string }[] } | null;

function installSrgntStub(overrides: Record<string, unknown> = {}, modes: Modes = null): Harness {
  let listener: ((event: { sessionId: string; update: unknown }) => void) | null = null;
  let statusListener: ((event: Record<string, unknown>) => void) | null = null;
  let permissionListener: ((event: Record<string, unknown>) => void) | null = null;
  let closeListener: ((event: Record<string, unknown>) => void) | null = null;
  const api = {
    chatSessionNew: vi.fn(async (target: 'mock' | 'pi') => ({
      sessionId: 'chat-mock-1',
      target,
      harnessId: target,
      harnessName: 'Mock Agent',
      quirks: [],
      capabilities: { protocolVersion: 1 },
      ...(modes !== null ? { modes } : {}),
    })),
    chatSessionPrompt: vi.fn(async () => ({ stopReason: 'end_turn' })),
    chatSessionCancel: vi.fn(async () => {
      // Mirrors ChatSessionController.cancel, which resolves every pending
      // permission prompt `cancelled` and pushes a close frame for each.
      closeListener?.({ sessionId: 'chat-mock-1', requestId: 'req-1', reason: 'cancelled' });
    }),
    chatSessionDispose: vi.fn(async () => {}),
    chatSessionSetMode: vi.fn(async (_sessionId: string, modeId: string) => ({
      ok: true as const,
      currentModeId: modeId,
    })),
    onChatSessionUpdate: vi.fn((cb: (event: { sessionId: string; update: unknown }) => void) => {
      listener = cb;
      return () => {
        listener = null;
      };
    }),
    onChatSessionStatus: vi.fn((cb: (event: Record<string, unknown>) => void) => {
      statusListener = cb;
      return () => {
        statusListener = null;
      };
    }),
    onChatPermissionRequest: vi.fn((cb: (event: Record<string, unknown>) => void) => {
      permissionListener = cb;
      return () => {
        permissionListener = null;
      };
    }),
    onChatPermissionClose: vi.fn((cb: (event: Record<string, unknown>) => void) => {
      closeListener = cb;
      return () => {
        closeListener = null;
      };
    }),
    chatPermissionRespond: vi.fn(async () => {}),
    openExternal: vi.fn(async () => {}),
    ...overrides,
  };
  (window as unknown as { srgnt: unknown }).srgnt = api;
  return {
    api: api as Harness['api'],
    push: async (update: unknown, sessionId = 'chat-mock-1') => {
      await act(async () => {
        listener?.({ sessionId, update });
        // The provider coalesces frames into one dispatch per animation frame.
        await new Promise((resolve) => setTimeout(resolve, 32));
      });
    },
    pushStatus: async (status: Record<string, unknown>, sessionId = 'chat-mock-1') => {
      await act(async () => {
        statusListener?.({ sessionId, ...status });
      });
    },
    askPermission: async (request: Record<string, unknown>, sessionId = 'chat-mock-1') => {
      await act(async () => {
        permissionListener?.({ sessionId, ...request });
      });
    },
  };
}

function renderChat(): void {
  render(
    <ChatSessionProvider>
      <ChatView />
    </ChatSessionProvider>,
  );
}

async function startSession(): Promise<void> {
  fireEvent.click(screen.getByTestId('chat-new-session'));
  await waitFor(() => expect(screen.getByTestId('chat-session-badge')).toBeInTheDocument());
}

/** Pushes an `available_commands_update`, exactly as the mock's directive does. */
const commandsUpdate = (commands: readonly { name: string; description?: string }[]): unknown => ({
  sessionId: 'acp-1',
  update: { sessionUpdate: 'available_commands_update', availableCommands: commands },
});

function typeInput(value: string): HTMLTextAreaElement {
  const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value, selectionStart: value.length } });
  return input;
}

beforeEach(() => {
  harness = installSrgntStub();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Composer — submit keymap', () => {
  it('sends on Enter and inserts a newline on Shift+Enter', async () => {
    renderChat();
    await startSession();
    const input = typeInput('line one');

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(harness.api.chatSessionPrompt).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(harness.api.chatSessionPrompt).toHaveBeenCalledWith('chat-mock-1', 'line one');
  });

  it('will not send an empty or whitespace-only draft', async () => {
    renderChat();
    await startSession();
    typeInput('   ');
    expect(screen.getByTestId('chat-send')).toBeDisabled();
  });
});

describe('Composer — slash command menu', () => {
  it('stays closed for an agent that advertised no commands', async () => {
    renderChat();
    await startSession();
    typeInput('/');
    expect(screen.queryByTestId('chat-slash-menu')).toBeNull();
  });

  it('opens on `/`, filters as typed, and renders live from the agent update', async () => {
    renderChat();
    await startSession();
    await harness.push(
      commandsUpdate([
        { name: 'review', description: 'Review the diff' },
        { name: 'refactor', description: 'Refactor a file' },
        { name: 'test', description: 'Run tests' },
      ]),
    );

    typeInput('/');
    expect(screen.getAllByRole('option')).toHaveLength(3);

    typeInput('/re');
    expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
      '/reviewReview the diff',
      '/refactorRefactor a file',
    ]);

    typeInput('/rev');
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('changes with the advertised command list, with zero code edits', async () => {
    renderChat();
    await startSession();
    await harness.push(commandsUpdate([{ name: 'review' }]));
    typeInput('/');
    expect(screen.getByTestId('chat-slash-item-review')).toBeInTheDocument();

    // A second advertisement mid-session replaces the list (Pi does this live).
    await harness.push(commandsUpdate([{ name: 'deploy' }]));
    typeInput('/');
    expect(screen.queryByTestId('chat-slash-item-review')).toBeNull();
    expect(screen.getByTestId('chat-slash-item-deploy')).toBeInTheDocument();
  });

  it('hides the menu when an update empties the command list', async () => {
    renderChat();
    await startSession();
    await harness.push(commandsUpdate([{ name: 'review' }]));
    typeInput('/');
    expect(screen.getByTestId('chat-slash-menu')).toBeInTheDocument();

    await harness.push(commandsUpdate([]));
    expect(screen.queryByTestId('chat-slash-menu')).toBeNull();
  });

  it('is keyboard-navigable and inserts the highlighted command on Enter', async () => {
    renderChat();
    await startSession();
    await harness.push(commandsUpdate([{ name: 'review' }, { name: 'refactor' }]));
    const input = typeInput('/re');

    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');

    // Enter picks a command instead of sending a half-typed `/re`.
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(harness.api.chatSessionPrompt).not.toHaveBeenCalled();
    expect((screen.getByTestId('chat-input') as HTMLTextAreaElement).value).toBe('/review ');
    expect(screen.queryByTestId('chat-slash-menu')).toBeNull();
  });

  it('inserts on click and closes on Escape', async () => {
    renderChat();
    await startSession();
    await harness.push(commandsUpdate([{ name: 'review' }, { name: 'refactor' }]));
    typeInput('/re');
    fireEvent.mouseDown(screen.getByTestId('chat-slash-item-refactor'));
    expect((screen.getByTestId('chat-input') as HTMLTextAreaElement).value).toBe('/refactor ');

    const input = typeInput('/re');
    expect(screen.getByTestId('chat-slash-menu')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('chat-slash-menu')).toBeNull();
  });

  it('sends a bare `/` or an unknown command as ordinary prompt text', async () => {
    // srgnt does not validate commands: ACP has no command call, the agent parses
    // its own. A wrong guess here would silently eat the user's message.
    renderChat();
    await startSession();
    await harness.push(commandsUpdate([{ name: 'review' }]));
    const input = typeInput('/nope please');
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(harness.api.chatSessionPrompt).toHaveBeenCalledWith('chat-mock-1', '/nope please');
  });
});

describe('Composer — session modes', () => {
  it('renders no selector when the agent advertises no modes', async () => {
    renderChat();
    await startSession();
    expect(screen.queryByTestId('chat-mode-select')).toBeNull();
  });

  it('renders the advertised modes and switches through session/set_mode', async () => {
    harness = installSrgntStub({}, {
      currentModeId: 'high',
      availableModes: [
        { id: 'low', name: 'Low' },
        { id: 'high', name: 'High' },
        { id: 'xhigh', name: 'Extra high' },
      ],
    });
    renderChat();
    await startSession();

    const select = screen.getByTestId('chat-mode-select') as HTMLSelectElement;
    expect(select.value).toBe('high');
    expect(Array.from(select.options).map((option) => option.value)).toEqual(['low', 'high', 'xhigh']);

    await act(async () => {
      fireEvent.change(select, { target: { value: 'xhigh' } });
    });
    expect(harness.api.chatSessionSetMode).toHaveBeenCalledWith('chat-mock-1', 'xhigh');
    await waitFor(() =>
      expect((screen.getByTestId('chat-mode-select') as HTMLSelectElement).value).toBe('xhigh'),
    );
  });

  it('disables the selector when the preload has no set-mode bridge', async () => {
    // `chatSessionSetMode` is optional in the bridge types, and `setMode` is a
    // guarded no-op without it — an enabled control would silently do nothing.
    harness = installSrgntStub({ chatSessionSetMode: undefined }, {
      currentModeId: 'low',
      availableModes: [
        { id: 'low', name: 'Low' },
        { id: 'high', name: 'High' },
      ],
    });
    renderChat();
    await startSession();
    expect(screen.getByTestId('chat-mode-select')).toBeDisabled();
  });

  it('follows an agent-initiated current_mode_update without user action', async () => {
    harness = installSrgntStub({}, {
      currentModeId: 'low',
      availableModes: [
        { id: 'low', name: 'Low' },
        { id: 'high', name: 'High' },
      ],
    });
    renderChat();
    await startSession();
    await harness.push({
      sessionId: 'acp-1',
      update: { sessionUpdate: 'current_mode_update', currentModeId: 'high' },
    });
    expect((screen.getByTestId('chat-mode-select') as HTMLSelectElement).value).toBe('high');
    expect(harness.api.chatSessionSetMode).not.toHaveBeenCalled();
  });
});

describe('Composer — stop reasons', () => {
  const cases: readonly [string, RegExp | null][] = [
    ['end_turn', null],
    ['cancelled', /stopped by you/i],
    ['max_tokens', /ran out of tokens/i],
    ['max_turn_requests', /request limit/i],
    ['refusal', /refused/i],
  ];

  for (const [stopReason, expected] of cases) {
    it(`renders ${stopReason} ${expected === null ? 'silently' : 'with its own notice'}`, async () => {
      harness = installSrgntStub({ chatSessionPrompt: vi.fn(async () => ({ stopReason })) });
      renderChat();
      await startSession();
      const input = typeInput('go');
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      if (expected === null) {
        // A normal reply needs no annotation; every turn ending in a banner is noise.
        expect(screen.queryByTestId('chat-stop-notice')).toBeNull();
        return;
      }
      const notice = await screen.findByTestId('chat-stop-notice');
      expect(notice).toHaveAttribute('data-reason', stopReason);
      expect(notice.textContent).toMatch(expected);
    });
  }
});

describe('Composer — cancel', () => {
  it('dismisses a pending permission prompt when the user stops the turn', async () => {
    // The full path STEP-23-03 asked to confirm outside of a unit test: Stop →
    // controller.cancel → permissions.cancelAll → `chat:permission:close` →
    // prompt gone. The stub's `chatSessionCancel` fires the close frame exactly
    // as desktop-main does.
    let release: () => void = () => {};
    const pending = new Promise<{ stopReason: string }>((resolve) => {
      release = () => resolve({ stopReason: 'cancelled' });
    });
    harness = installSrgntStub({ chatSessionPrompt: vi.fn(async () => pending) });
    renderChat();
    await startSession();

    const input = typeInput('long job');
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    await harness.askPermission({
      requestId: 'req-1',
      kind: 'edit',
      title: 'Edit answer.ts',
      paths: ['answer.ts'],
      options: [{ optionId: 'allow-once', name: 'Allow once', kind: 'allow_once' }],
    });
    expect(screen.getByTestId('chat-permission-prompt')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-cancel'));
    });
    expect(harness.api.chatSessionCancel).toHaveBeenCalledWith('chat-mock-1');
    await waitFor(() => expect(screen.queryByTestId('chat-permission-prompt')).toBeNull());

    await act(async () => {
      release();
      await Promise.resolve();
    });
    // Busy only clears when the prompt promise itself settles, not on Stop.
    await waitFor(() => expect(screen.getByTestId('chat-cancel')).toBeDisabled());
    expect(screen.getByTestId('chat-stop-notice')).toHaveAttribute('data-reason', 'cancelled');
  });

  it('accepts a new prompt immediately after a cancelled turn', async () => {
    harness = installSrgntStub({ chatSessionPrompt: vi.fn(async () => ({ stopReason: 'cancelled' })) });
    renderChat();
    await startSession();
    const input = typeInput('first');
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    await screen.findByTestId('chat-stop-notice');

    const again = typeInput('second');
    expect(screen.getByTestId('chat-send')).toBeEnabled();
    await act(async () => {
      fireEvent.keyDown(again, { key: 'Enter' });
    });
    expect(harness.api.chatSessionPrompt).toHaveBeenNthCalledWith(2, 'chat-mock-1', 'second');
  });

  it('is a no-op when no turn is in flight', async () => {
    renderChat();
    await startSession();
    expect(screen.getByTestId('chat-cancel')).toBeDisabled();
    fireEvent.click(screen.getByTestId('chat-cancel'));
    expect(harness.api.chatSessionCancel).not.toHaveBeenCalled();
  });
});

describe('Composer — crash and recovery', () => {
  const crash = { status: 'crashed', exitCode: 7, stderrTail: 'Error: boom\n', message: 'Agent process exited with code 7' };

  it('shows a recoverable banner with the stderr tail and keeps the transcript', async () => {
    renderChat();
    await startSession();
    await harness.push({ sessionId: 'acp-1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'partial' } } });
    await harness.pushStatus(crash);

    const banner = screen.getByTestId('chat-agent-down');
    expect(banner).toHaveTextContent('exited with code 7');
    expect(screen.getByTestId('chat-agent-down-stderr')).toHaveTextContent('Error: boom');
    // Read-only, but still there: the dead session's transcript is the evidence.
    expect(screen.getByTestId('chat-message-agent')).toHaveTextContent('partial');
    expect(screen.getByTestId('chat-send')).toBeDisabled();
  });

  it('keeps the typed draft through a failed turn', async () => {
    harness = installSrgntStub({
      chatSessionPrompt: vi.fn(async () => {
        throw new Error('TurnFailed: connection lost');
      }),
    });
    renderChat();
    await startSession();
    const input = typeInput('expensive prompt');
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => expect(screen.getByTestId('chat-error')).toHaveTextContent('TurnFailed'));
    expect((screen.getByTestId('chat-input') as HTMLTextAreaElement).value).toBe('expensive prompt');
    // The draft comes back for a retry, so the entry that never ran has to be
    // marked — otherwise the retry reads as the user saying it twice.
    expect(screen.getByTestId('chat-message-user')).toHaveAttribute('data-failed', 'true');
    expect(screen.getByTestId('chat-message-failed')).toBeInTheDocument();
  });

  it('recovers with a fresh session (dispose first, so nothing is orphaned)', async () => {
    renderChat();
    await startSession();
    await harness.pushStatus(crash);

    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-recover'));
    });
    await waitFor(() => expect(harness.api.chatSessionDispose).toHaveBeenCalledWith('chat-mock-1'));
    expect(harness.api.chatSessionNew).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByTestId('chat-agent-down')).toBeNull());
    expect(screen.getByTestId('chat-send')).toBeDisabled(); // empty draft, live session
    expect(screen.getByTestId('chat-input')).toBeEnabled();
  });

  it('does not start two sessions when recovery is clicked twice', async () => {
    // dispose → newSession is async and the button stays mounted throughout;
    // a second session here would leave the first process unreachable.
    let release: (() => void) | undefined;
    harness = installSrgntStub({
      chatSessionDispose: vi.fn(
        async () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      ),
    });
    renderChat();
    await startSession();
    await harness.pushStatus(crash);

    const recover = screen.getByTestId('chat-recover');
    fireEvent.click(recover);
    expect(recover).toBeDisabled();
    fireEvent.click(recover);

    await act(async () => {
      release?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(harness.api.chatSessionNew).toHaveBeenCalledTimes(2));
    // Twice total: the initial session plus exactly one recovery.
    expect(harness.api.chatSessionDispose).toHaveBeenCalledTimes(1);
  });

  it('names a give-up distinctly from a single crash', async () => {
    renderChat();
    await startSession();
    await harness.pushStatus({ status: 'gave-up', message: 'Agent kept crashing and was not restarted (3 attempts)' });
    expect(screen.getByTestId('chat-agent-down')).toHaveTextContent('Agent stopped restarting');
  });

  it('ignores a status frame for a stale session handle', async () => {
    renderChat();
    await startSession();
    await harness.pushStatus(crash, 'chat-mock-OLD');
    expect(screen.queryByTestId('chat-agent-down')).toBeNull();
  });

  it('shows a crash that lands before session/new returns the handle', async () => {
    // The agent can die between answering session/new and `chatSessionNew`
    // resolving here. Dropping that status installs a dead session with a
    // working composer and no banner — the one state the crash surface exists
    // to prevent.
    let release: (() => void) | undefined;
    harness = installSrgntStub({
      chatSessionNew: vi.fn(async (target: 'mock' | 'pi') => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return {
          sessionId: 'chat-mock-1',
          target,
          harnessId: target,
          harnessName: 'Mock Agent',
          quirks: [],
          capabilities: { protocolVersion: 1 },
        };
      }),
    });
    renderChat();
    fireEvent.click(screen.getByTestId('chat-new-session'));
    await harness.pushStatus(crash);
    await act(async () => {
      release?.();
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId('chat-agent-down')).toHaveTextContent('exited with code 7'));
    expect(screen.getByTestId('chat-send')).toBeDisabled();
  });
});

describe('Composer — pure helpers', () => {
  it('parseCommands keeps well-formed entries and drops the rest', () => {
    expect(
      parseCommands([
        { name: 'review', description: 'Review the diff' },
        { name: 'bare' },
        { description: 'nameless' },
        'not an object',
        null,
      ]),
    ).toEqual([
      { name: 'review', description: 'Review the diff' },
      { name: 'bare', description: '' },
    ]);
  });

  it('parseCommands treats a non-array payload as no commands, never a throw', () => {
    expect(parseCommands(null)).toEqual([]);
    expect(parseCommands({ availableCommands: [] })).toEqual([]);
  });

  it('slashQuery triggers only on a `/` at the start of a line', () => {
    expect(slashQuery('/rev', 4)).toBe('rev');
    expect(slashQuery('hello\n/rev', 10)).toBe('rev');
    expect(slashQuery('/', 1)).toBe('');
    // A slash inside prose or a path is not a command trigger.
    expect(slashQuery('see a/b', 7)).toBeNull();
    expect(slashQuery('/rev now', 8)).toBeNull();
    // The caret is what matters, not the end of the text.
    expect(slashQuery('/rev tail', 4)).toBe('rev');
  });
});
