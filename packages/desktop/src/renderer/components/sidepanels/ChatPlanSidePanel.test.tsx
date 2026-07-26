/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSessionProvider, useChatSession } from '../chat/ChatSessionContext.js';
import { ChatPlanSidePanel, readPlanEntries } from './ChatPlanSidePanel.js';

/**
 * The plan panel's one hard rule is REPLACEMENT: per the ACP spec every `plan`
 * update carries the full entry list, so a shorter list means steps were dropped
 * and an empty list means the plan is gone. These tests drive it through the
 * real provider so the reducer's replacement semantics are covered too.
 */

let push: (update: unknown) => Promise<void>;

beforeEach(() => {
  let listener: ((event: { sessionId: string; update: unknown }) => void) | null = null;
  (window as unknown as { srgnt: unknown }).srgnt = {
    chatSessionNew: vi.fn(async () => ({
      sessionId: 'chat-mock-1',
      target: 'mock' as const,
      harnessId: 'mock',
      harnessName: 'Mock Agent',
      quirks: [] as readonly string[],
      capabilities: {},
    })),
    onChatSessionUpdate: vi.fn((cb: (event: { sessionId: string; update: unknown }) => void) => {
      listener = cb;
      return () => {
        listener = null;
      };
    }),
    onChatTerminalOutput: vi.fn(() => () => {}),
  };
  push = async (update: unknown) => {
    await act(async () => {
      // Keyed on the chat handle the stubbed `chatSessionNew` returns; the
      // provider drops frames for any other handle.
      listener?.({ sessionId: 'chat-mock-1', update });
      await new Promise((resolve) => setTimeout(resolve, 32));
    });
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('readPlanEntries', () => {
  it('applies the spec defaults for missing priority and status', () => {
    expect(readPlanEntries([{ content: 'do the thing' }])).toEqual([
      { content: 'do the thing', priority: 'medium', status: 'pending' },
    ]);
  });

  it('keeps supplied priorities and statuses', () => {
    expect(readPlanEntries([{ content: 'a', priority: 'high', status: 'in_progress' }])).toEqual([
      { content: 'a', priority: 'high', status: 'in_progress' },
    ]);
  });

  it('skips malformed entries instead of throwing the panel away', () => {
    expect(readPlanEntries([{ content: 'keep' }, { content: '' }, { nope: true }, 'junk', null])).toEqual([
      { content: 'keep', priority: 'medium', status: 'pending' },
    ]);
  });

  it('falls back to defaults for unrecognized priority/status values', () => {
    expect(readPlanEntries([{ content: 'a', priority: 'urgent', status: 'exploded' }])).toEqual([
      { content: 'a', priority: 'medium', status: 'pending' },
    ]);
  });

  it('returns nothing for a non-array plan', () => {
    expect(readPlanEntries(null)).toEqual([]);
    expect(readPlanEntries({ entries: [] })).toEqual([]);
  });
});

/** Opens a session on mount so the provider accepts frames for its handle. */
function SessionStarter(): React.ReactElement {
  const { newSession, session } = useChatSession();
  React.useEffect(() => {
    void newSession('mock');
  }, [newSession]);
  return <span data-testid="session-ready">{session === null ? 'no' : 'yes'}</span>;
}

describe('ChatPlanSidePanel', () => {
  const renderPanel = async (): Promise<void> => {
    render(
      <ChatSessionProvider>
        <SessionStarter />
        <ChatPlanSidePanel />
      </ChatSessionProvider>,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  it('explains itself when the agent has published no plan', async () => {
    await renderPanel();
    expect(screen.getByTestId('chat-plan-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-plan-progress')).not.toBeInTheDocument();
  });

  it('renders entries with their priority and status once a plan arrives', async () => {
    await renderPanel();
    await push({
      sessionId: 'acp-1',
      update: {
        sessionUpdate: 'plan',
        entries: [
          { content: 'Read the file', priority: 'high', status: 'completed' },
          { content: 'Summarize it', priority: 'low', status: 'in_progress' },
          { content: 'Ship it' },
        ],
      },
    });
    const entries = screen.getAllByTestId('chat-plan-entry');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toHaveAttribute('data-status', 'completed');
    expect(entries[0]).toHaveAttribute('data-priority', 'high');
    expect(entries[1]).toHaveTextContent('Summarize it');
    expect(entries[2]).toHaveAttribute('data-status', 'pending');
    expect(screen.getByTestId('chat-plan-progress')).toHaveTextContent('1/3');
  });

  it('REPLACES the full list on every update rather than merging', async () => {
    await renderPanel();
    await push({
      sessionId: 'acp-1',
      update: { sessionUpdate: 'plan', entries: [{ content: 'first' }, { content: 'second' }] },
    });
    expect(screen.getAllByTestId('chat-plan-entry')).toHaveLength(2);

    await push({ sessionId: 'acp-1', update: { sessionUpdate: 'plan', entries: [{ content: 'only one now' }] } });
    const entries = screen.getAllByTestId('chat-plan-entry');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toHaveTextContent('only one now');
    expect(screen.queryByText('first')).not.toBeInTheDocument();
  });

  it('clears the panel on an empty plan update', async () => {
    await renderPanel();
    await push({ sessionId: 'acp-1', update: { sessionUpdate: 'plan', entries: [{ content: 'temporary' }] } });
    expect(screen.getAllByTestId('chat-plan-entry')).toHaveLength(1);

    await push({ sessionId: 'acp-1', update: { sessionUpdate: 'plan', entries: [] } });
    expect(screen.queryAllByTestId('chat-plan-entry')).toHaveLength(0);
    expect(screen.getByTestId('chat-plan-empty')).toBeInTheDocument();
  });
});
