/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatView } from './ChatView.js';
import { ChatSessionProvider } from './ChatSessionContext.js';

/**
 * Drives ChatView through a scripted update stream by capturing the callback the
 * provider registers with `window.srgnt.onChatSessionUpdate`, then pushing
 * frames shaped exactly like the ones desktop-main forwards. Mirrors the
 * window.srgnt-stubbing pattern in `DevConsole.test.tsx`.
 */

interface Harness {
  push: (update: unknown, sessionId?: string) => Promise<void>;
  api: {
    chatSessionNew: ReturnType<typeof vi.fn>;
    chatSessionPrompt: ReturnType<typeof vi.fn>;
    chatSessionCancel: ReturnType<typeof vi.fn>;
    chatSessionDispose: ReturnType<typeof vi.fn>;
    onChatSessionUpdate: ReturnType<typeof vi.fn>;
    openExternal: ReturnType<typeof vi.fn>;
  };
}

let harness: Harness;

function installSrgntStub(overrides: Record<string, unknown> = {}): Harness {
  let listener: ((event: { sessionId: string; update: unknown }) => void) | null = null;
  const api = {
    chatSessionNew: vi.fn(async (target: 'mock' | 'pi') => ({
      sessionId: 'chat-mock-1',
      target,
      harnessId: target,
      harnessName: target === 'pi' ? 'Pi' : 'Mock Agent',
      quirks: target === 'pi' ? ['adapter-mediated'] : [],
      capabilities: { protocolVersion: 1 },
    })),
    chatSessionPrompt: vi.fn(async () => ({ stopReason: 'end_turn' })),
    chatSessionCancel: vi.fn(async () => {}),
    chatSessionDispose: vi.fn(async () => {}),
    onChatSessionUpdate: vi.fn((cb: (event: { sessionId: string; update: unknown }) => void) => {
      listener = cb;
      return () => {
        listener = null;
      };
    }),
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
  };
}

const chunk = (sessionUpdate: string, text: string): unknown => ({
  sessionId: 'acp-1',
  update: { sessionUpdate, content: { type: 'text', text } },
});

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

beforeEach(() => {
  harness = installSrgntStub();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ChatView — session lifecycle', () => {
  it('starts with no session and an explanatory empty state', () => {
    renderChat();
    expect(screen.getByTestId('chat-empty')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeDisabled();
    expect(screen.getByTestId('chat-send')).toBeDisabled();
  });

  it('opens a session for the selected target and shows the harness name', async () => {
    renderChat();
    fireEvent.change(screen.getByTestId('chat-target'), { target: { value: 'pi' } });
    await startSession();
    expect(harness.api.chatSessionNew).toHaveBeenCalledWith('pi');
    expect(screen.getByTestId('chat-session-badge')).toHaveTextContent('Pi');
  });

  it('surfaces declared harness quirks from the new-session response', async () => {
    renderChat();
    fireEvent.change(screen.getByTestId('chat-target'), { target: { value: 'pi' } });
    await startSession();
    expect(screen.getByTestId('chat-session-quirks')).toHaveTextContent('1 quirk');
  });

  it('surfaces a session/new failure as a readable error and stays retryable', async () => {
    harness = installSrgntStub({
      chatSessionNew: vi.fn(async () => {
        throw new Error('SpawnFailed: pi is not installed');
      }),
    });
    renderChat();
    fireEvent.click(screen.getByTestId('chat-new-session'));
    await waitFor(() => expect(screen.getByTestId('chat-error')).toHaveTextContent('SpawnFailed'));
    // Still offering to start a session — the failure did not strand the UI.
    expect(screen.getByTestId('chat-new-session')).toBeEnabled();
  });

  it('ends the session and clears the transcript on explicit dispose', async () => {
    renderChat();
    await startSession();
    await harness.push(chunk('agent_message_chunk', 'hello'));
    expect(screen.getByTestId('chat-message-agent')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('chat-dispose'));
    await waitFor(() => expect(harness.api.chatSessionDispose).toHaveBeenCalledWith('chat-mock-1'));
    await waitFor(() => expect(screen.queryByTestId('chat-message-agent')).toBeNull());
    expect(screen.getByTestId('chat-new-session')).toBeInTheDocument();
  });
});

describe('ChatView — streaming a turn', () => {
  it('shows the user message immediately on submit', async () => {
    renderChat();
    await startSession();
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'explain this repo' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-send'));
    });
    expect(screen.getByTestId('chat-message-user')).toHaveTextContent('explain this repo');
    expect(harness.api.chatSessionPrompt).toHaveBeenCalledWith('chat-mock-1', 'explain this repo');
  });

  it('accumulates thought chunks into one collapsible block', async () => {
    renderChat();
    await startSession();
    await harness.push(chunk('agent_thought_chunk', 'Reading files. '));
    await harness.push(chunk('agent_thought_chunk', 'Deciding what matters.'));

    const thought = screen.getByTestId('chat-thought');
    // Expanded while streaming so progress is visible.
    expect(thought).toHaveAttribute('data-streaming', 'true');
    expect(thought).toHaveTextContent('Reading files. Deciding what matters.');

    fireEvent.click(within(thought).getByRole('button'));
    expect(screen.getByTestId('chat-thought')).toHaveAttribute('data-expanded', 'false');
  });

  it('accumulates agent message chunks into one message rendered as GFM markdown', async () => {
    renderChat();
    await startSession();
    await harness.push(chunk('agent_message_chunk', '## Result\n\n'));
    await harness.push(chunk('agent_message_chunk', '- one\n- two\n\n'));
    await harness.push(chunk('agent_message_chunk', '| a | b |\n| --- | --- |\n| 1 | 2 |\n'));

    const messages = screen.getAllByTestId('chat-message-agent');
    expect(messages).toHaveLength(1);
    expect(within(messages[0]!).getByRole('heading', { level: 2, name: 'Result' })).toBeInTheDocument();
    expect(messages[0]!.querySelectorAll('ul li')).toHaveLength(2);
    expect(messages[0]!.querySelectorAll('table')).toHaveLength(1);
  });

  it('renders interleaved frames in arrival order without merging across a tool call', async () => {
    renderChat();
    await startSession();
    await harness.push(chunk('agent_thought_chunk', 'thinking'));
    await harness.push(chunk('agent_message_chunk', 'before'));
    await harness.push({ sessionId: 'acp-1', update: { sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Read file', kind: 'read', status: 'in_progress' } });
    await harness.push(chunk('agent_message_chunk', 'after'));

    const transcript = screen.getByTestId('chat-transcript');
    const rendered = Array.from(transcript.children).map((child) => child.getAttribute('data-testid'));
    expect(rendered).toEqual(['chat-thought', 'chat-message-agent', 'chat-tool-call', 'chat-message-agent']);

    const messages = screen.getAllByTestId('chat-message-agent');
    expect(messages[0]).toHaveTextContent('before');
    expect(messages[1]).toHaveTextContent('after');
  });

  it('updates a tool call in place rather than appending a second card', async () => {
    renderChat();
    await startSession();
    await harness.push({ sessionId: 'acp-1', update: { sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Read file', kind: 'read', status: 'in_progress' } });
    await harness.push({ sessionId: 'acp-1', update: { sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'completed' } });

    const cards = screen.getAllByTestId('chat-tool-call');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAttribute('data-status', 'completed');
  });
});

describe('ChatView — robustness', () => {
  it('ignores unknown sessionUpdate kinds without crashing or logging errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderChat();
    await startSession();
    await harness.push({ sessionId: 'acp-1', update: { sessionUpdate: 'session_info_update', info: { tokens: 5 } } });
    await harness.push(chunk('agent_message_chunk', 'still fine'));

    expect(screen.getByTestId('chat-message-agent')).toHaveTextContent('still fine');
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('drops frames belonging to a different session handle', async () => {
    renderChat();
    await startSession();
    await harness.push(chunk('agent_message_chunk', 'mine'));
    await harness.push(chunk('agent_message_chunk', 'not mine'), 'chat-mock-999');

    const messages = screen.getAllByTestId('chat-message-agent');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toHaveTextContent('mine');
    expect(messages[0]).not.toHaveTextContent('not mine');
  });

  it('does not double-submit while a turn is in flight', async () => {
    let resolvePrompt: (() => void) | undefined;
    harness = installSrgntStub({
      chatSessionPrompt: vi.fn(
        () =>
          new Promise<{ stopReason: string }>((resolve) => {
            resolvePrompt = () => resolve({ stopReason: 'end_turn' });
          }),
      ),
    });
    renderChat();
    await startSession();

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'first' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-send'));
    });

    const send = screen.getByTestId('chat-send');
    expect(send).toBeDisabled();
    fireEvent.click(send);
    expect(harness.api.chatSessionPrompt).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePrompt?.();
    });
  });

  it('closes the turn when a prompt fails so the next turn starts a new message', async () => {
    harness = installSrgntStub({
      chatSessionPrompt: vi.fn(async () => {
        throw new Error('connection closed mid-turn');
      }),
    });
    renderChat();
    await startSession();
    await harness.push(chunk('agent_message_chunk', 'partial'));

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'go' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-send'));
    });

    await waitFor(() => expect(screen.getByTestId('chat-error')).toHaveTextContent('connection closed mid-turn'));
    await harness.push(chunk('agent_message_chunk', 'new turn'));
    expect(screen.getAllByTestId('chat-message-agent')).toHaveLength(2);
  });

  it('lets the user dismiss an error', async () => {
    harness = installSrgntStub({
      chatSessionNew: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    renderChat();
    fireEvent.click(screen.getByTestId('chat-new-session'));
    await waitFor(() => expect(screen.getByTestId('chat-error')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Dismiss error'));
    expect(screen.queryByTestId('chat-error')).toBeNull();
  });

  it('keeps the session and transcript when the view unmounts and remounts (panel switch)', async () => {
    // The provider outlives the view, exactly as it does around the panel switch
    // in main.tsx — a switch to Notes and back must not kill the session.
    function Harnessed(): React.ReactElement {
      const [visible, setVisible] = React.useState(true);
      return (
        <ChatSessionProvider>
          <button type="button" data-testid="toggle" onClick={() => setVisible((value) => !value)}>
            toggle
          </button>
          {visible && <ChatView />}
        </ChatSessionProvider>
      );
    }
    render(<Harnessed />);
    await startSession();
    await harness.push(chunk('agent_message_chunk', 'survives'));

    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.queryByTestId('chat-view')).toBeNull();
    fireEvent.click(screen.getByTestId('toggle'));

    expect(screen.getByTestId('chat-session-badge')).toBeInTheDocument();
    expect(screen.getByTestId('chat-message-agent')).toHaveTextContent('survives');
    expect(harness.api.chatSessionDispose).not.toHaveBeenCalled();
  });

  it('renders without a chat IPC bridge instead of white-screening', () => {
    (window as unknown as { srgnt: unknown }).srgnt = {};
    expect(() => renderChat()).not.toThrow();
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
  });
});
