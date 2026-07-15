/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DevConsole, DevConsoleGate } from './DevConsole.js';

interface UpdateCb {
  current: ((event: { sessionId: string; update: unknown }) => void) | null;
}

function installSrgntStub(overrides: Partial<Window['srgnt']> = {}, updateCb?: UpdateCb): void {
  const base = {
    devConsoleEnabled: vi.fn(async () => true),
    devSessionNew: vi.fn(async (target: 'mock' | 'pi') => ({
      sessionId: 'dev-mock-1',
      target,
      capabilities: { protocolVersion: 1, loadSession: true },
    })),
    devSessionPrompt: vi.fn(async () => ({ stopReason: 'end_turn' })),
    devSessionCancel: vi.fn(async () => {}),
    devSessionDispose: vi.fn(async () => {}),
    onDevSessionUpdate: vi.fn((cb: (event: { sessionId: string; update: unknown }) => void) => {
      if (updateCb) updateCb.current = cb;
      return () => {};
    }),
  };
  (window as unknown as { srgnt: unknown }).srgnt = { ...base, ...overrides };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DevConsoleGate flag gating', () => {
  it('renders nothing when the flag is off', async () => {
    installSrgntStub({ devConsoleEnabled: vi.fn(async () => false) });
    render(<DevConsoleGate />);
    // Give the async flag query a chance to resolve.
    await waitFor(() => expect(window.srgnt.devConsoleEnabled).toHaveBeenCalled());
    expect(screen.queryByTestId('dev-console-gate')).toBeNull();
    expect(screen.queryByTestId('dev-console')).toBeNull();
  });

  it('renders the console when the flag is on', async () => {
    installSrgntStub({ devConsoleEnabled: vi.fn(async () => true) });
    render(<DevConsoleGate />);
    expect(await screen.findByTestId('dev-console')).toBeInTheDocument();
  });

  it('stays hidden if the enabled query rejects (flag off / no handler)', async () => {
    installSrgntStub({ devConsoleEnabled: vi.fn(async () => Promise.reject(new Error('no handler'))) });
    render(<DevConsoleGate />);
    await waitFor(() => expect(window.srgnt.devConsoleEnabled).toHaveBeenCalled());
    expect(screen.queryByTestId('dev-console')).toBeNull();
  });
});

describe('DevConsole session flow', () => {
  it('opens a session, sends a prompt, and streams updates into the log', async () => {
    const updateCb: UpdateCb = { current: null };
    installSrgntStub({}, updateCb);
    render(<DevConsole />);

    fireEvent.click(screen.getByTestId('dev-console-new'));
    await waitFor(() => expect(window.srgnt.devSessionNew).toHaveBeenCalledWith('mock'));
    await screen.findByTestId('dev-console-capabilities');
    expect(screen.getByTestId('dev-console-status').textContent).toContain('dev-mock-1');

    // A streamed frame for this session lands in the log.
    act(() => {
      updateCb.current?.({ sessionId: 'dev-mock-1', update: { update: { sessionUpdate: 'agent_message_chunk' } } });
    });
    await waitFor(() => expect(screen.getByTestId('dev-console-log').textContent).toContain('agent_message_chunk'));

    fireEvent.click(screen.getByTestId('dev-console-send'));
    await waitFor(() => expect(window.srgnt.devSessionPrompt).toHaveBeenCalledWith('dev-mock-1', 'Say hello.'));
    await waitFor(() => expect(screen.getByTestId('dev-console-log').textContent).toContain('stopReason=end_turn'));

    fireEvent.click(screen.getByTestId('dev-console-dispose'));
    await waitFor(() => expect(window.srgnt.devSessionDispose).toHaveBeenCalledWith('dev-mock-1'));
  });

  it('ignores updates addressed to a different session', async () => {
    const updateCb: UpdateCb = { current: null };
    installSrgntStub({}, updateCb);
    render(<DevConsole />);
    fireEvent.click(screen.getByTestId('dev-console-new'));
    await waitFor(() => expect(window.srgnt.devSessionNew).toHaveBeenCalled());

    act(() => {
      updateCb.current?.({ sessionId: 'some-other-session', update: { update: { sessionUpdate: 'agent_message_chunk' } } });
    });
    // No throw, and the foreign frame is not logged.
    expect(screen.getByTestId('dev-console-log').textContent).not.toContain('agent_message_chunk');
  });

  it('surfaces a newSession failure without crashing', async () => {
    installSrgntStub({ devSessionNew: vi.fn(async () => Promise.reject(new Error('spawn boom'))) });
    render(<DevConsole />);
    fireEvent.click(screen.getByTestId('dev-console-new'));
    expect(await screen.findByTestId('dev-console-error')).toHaveTextContent('spawn boom');
  });
});
