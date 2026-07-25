/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSessionProvider } from './ChatSessionContext.js';
import { ChatView } from './ChatView.js';

/**
 * End-to-end (renderer side) for the terminal embed: a `tool_call` carrying a
 * `terminal` content block, plus `chat:terminal:output` chunks for that terminal
 * id, must render the command's output inside the card.
 *
 * jsdom cannot load the ghostty WASM runtime, so what renders here is the
 * surface's documented fallback — which is exactly the path a user hits if the
 * runtime ever fails to load, and therefore worth asserting.
 */

interface Harness {
  pushUpdate: (update: unknown, sessionId?: string) => Promise<void>;
  pushOutput: (terminalId: string, chunk: string, sessionId?: string) => Promise<void>;
}

let harness: Harness;

function installSrgntStub(): Harness {
  let updateListener: ((event: { sessionId: string; update: unknown }) => void) | null = null;
  let outputListener:
    | ((event: { sessionId: string; terminalId: string; chunk: string }) => void)
    | null = null;
  (window as unknown as { srgnt: unknown }).srgnt = {
    chatSessionNew: vi.fn(async (target: 'mock' | 'pi') => ({
      sessionId: 'chat-mock-1',
      target,
      harnessId: target,
      harnessName: 'Mock Agent',
      quirks: [],
      capabilities: {},
    })),
    chatSessionPrompt: vi.fn(async () => ({ stopReason: 'end_turn' })),
    chatSessionCancel: vi.fn(async () => {}),
    chatSessionDispose: vi.fn(async () => {}),
    onChatSessionUpdate: vi.fn((cb: (event: { sessionId: string; update: unknown }) => void) => {
      updateListener = cb;
      return () => {
        updateListener = null;
      };
    }),
    onChatTerminalOutput: vi.fn(
      (cb: (event: { sessionId: string; terminalId: string; chunk: string }) => void) => {
        outputListener = cb;
        return () => {
          outputListener = null;
        };
      },
    ),
  };
  const settle = async (): Promise<void> => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 32));
    });
  };
  return {
    pushUpdate: async (update, sessionId = 'chat-mock-1') => {
      await act(async () => {
        updateListener?.({ sessionId, update });
      });
      await settle();
    },
    pushOutput: async (terminalId, chunk, sessionId = 'chat-mock-1') => {
      await act(async () => {
        outputListener?.({ sessionId, terminalId, chunk });
      });
      await settle();
    },
  };
}

async function startSession(): Promise<void> {
  render(
    <ChatSessionProvider>
      <ChatView />
    </ChatSessionProvider>,
  );
  fireEvent.click(screen.getByTestId('chat-new-session'));
  await waitFor(() => expect(screen.getByTestId('chat-session-badge')).toBeInTheDocument());
}

/**
 * Expanding the card mounts the ghostty surface, whose runtime probe is async
 * (and, in jsdom, always fails into the fallback). Settling here keeps that
 * state transition inside `act`.
 */
async function openDetails(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByTestId('chat-tool-call-toggle'));
    await Promise.resolve();
  });
}

const terminalCall = (terminalId: string): unknown => ({
  sessionId: 'acp-1',
  update: {
    sessionUpdate: 'tool_call',
    toolCallId: 'exec-1',
    title: 'Run ls',
    kind: 'execute',
    status: 'in_progress',
    content: [{ type: 'terminal', terminalId }],
  },
});

beforeEach(() => {
  harness = installSrgntStub();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('terminal embeds in tool cards', () => {
  it('streams client-terminal output into the card that references it', async () => {
    await startSession();
    await harness.pushUpdate(terminalCall('chat-term-1'));
    await openDetails();

    expect(screen.getByTestId('chat-tool-terminal')).toHaveAttribute('data-terminal-id', 'chat-term-1');
    await harness.pushOutput('chat-term-1', 'a.ts\r\n');
    await harness.pushOutput('chat-term-1', 'b.ts\r\n');

    const surface = screen.getByTestId('chat-terminal-fallback');
    expect(surface).toHaveTextContent('a.ts');
    expect(surface).toHaveTextContent('b.ts');
  });

  it('catches up a card that only learns its terminal id after output arrived', async () => {
    await startSession();
    // Output first (the process is already printing), card second — the exact
    // order the mock's use_terminal directive produces.
    await harness.pushOutput('chat-term-9', 'early output\r\n');
    await harness.pushUpdate(terminalCall('chat-term-9'));
    await openDetails();
    expect(screen.getByTestId('chat-terminal-fallback')).toHaveTextContent('early output');
  });

  it('strips ANSI control sequences in the fallback view', async () => {
    await startSession();
    await harness.pushUpdate(terminalCall('chat-term-2'));
    await openDetails();
    await harness.pushOutput('chat-term-2', '\u001B[32mgreen\u001B[0m\r\n');
    const surface = screen.getByTestId('chat-terminal-fallback');
    expect(surface).toHaveTextContent('green');
    expect(surface.textContent).not.toContain('\u001B[32m');
  });

  it('ignores output belonging to a different chat session', async () => {
    await startSession();
    await harness.pushUpdate(terminalCall('chat-term-3'));
    await openDetails();
    await harness.pushOutput('chat-term-3', 'not mine', 'chat-mock-999');
    expect(screen.getByTestId('chat-terminal-fallback').textContent).toBe('');
  });

  it('does not crash when the card outlives the terminal (released mid-embed)', async () => {
    await startSession();
    await harness.pushUpdate(terminalCall('chat-term-4'));
    await openDetails();
    await harness.pushOutput('chat-term-4', 'done\r\n');
    // Release is a main-process concept: nothing further arrives for this id.
    // The card must keep showing what it already has, not blank out.
    await harness.pushUpdate({
      sessionId: 'acp-1',
      update: { sessionUpdate: 'tool_call_update', toolCallId: 'exec-1', status: 'completed' },
    });
    expect(screen.getByTestId('chat-terminal-fallback')).toHaveTextContent('done');
    expect(screen.getByTestId('chat-tool-call-status')).toHaveTextContent('Done');
  });
});
