/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ToolCallCard } from './ToolCallCard.js';
import {
  initialTranscriptState,
  transcriptReducer,
  TOOL_CALL_STATUSES,
  TOOL_KINDS,
  type ToolCallSegment,
  type TranscriptState,
} from './transcriptReducer.js';

/**
 * Cards are driven through the real reducer rather than hand-built segments, so
 * these tests exercise the same path a streamed turn takes: scripted
 * `tool_call` / `tool_call_update` frames in, rendered card out.
 */

function feed(updates: readonly Record<string, unknown>[]): TranscriptState {
  return updates.reduce<TranscriptState>(
    (state, update) => transcriptReducer(state, { type: 'update', notification: { sessionId: 'acp-1', update } }),
    initialTranscriptState,
  );
}

function callFrom(updates: readonly Record<string, unknown>[]): ToolCallSegment {
  const segment = feed(updates).segments[0];
  if (segment === undefined || segment.kind !== 'tool_call') throw new Error('expected a tool call segment');
  return segment;
}

function renderCall(updates: readonly Record<string, unknown>[]): ToolCallSegment {
  const segment = callFrom(updates);
  render(<ToolCallCard segment={segment} />);
  return segment;
}

function open(): void {
  fireEvent.click(screen.getByTestId('chat-tool-call-toggle'));
}

afterEach(cleanup);

describe('ToolCallCard — kinds and status', () => {
  it('renders a distinct labeled card for every ACP tool kind', () => {
    const labels = new Set<string>();
    for (const kind of TOOL_KINDS) {
      cleanup();
      renderCall([{ sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Do a thing', kind }]);
      const card = screen.getByTestId('chat-tool-call');
      expect(card).toHaveAttribute('data-kind', kind);
      labels.add(within(card).getByText(/^(Read|Edit|Delete|Move|Search|Run|Think|Fetch|Mode|Tool)$/).textContent!);
    }
    // Ten kinds, ten distinct labels — no two kinds render as the same thing.
    expect(labels.size).toBe(TOOL_KINDS.length);
  });

  it('falls back to other styling for a kind we have never heard of', () => {
    renderCall([{ sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Warp', kind: 'teleport' }]);
    expect(screen.getByTestId('chat-tool-call')).toHaveAttribute('data-kind', 'other');
    expect(screen.getByText('Tool')).toBeInTheDocument();
  });

  it('renders every status, and marks a failure distinctly', () => {
    for (const status of TOOL_CALL_STATUSES) {
      cleanup();
      renderCall([{ sessionUpdate: 'tool_call', toolCallId: 't1', title: 'x', status }]);
      expect(screen.getByTestId('chat-tool-call')).toHaveAttribute('data-status', status);
      expect(screen.getByTestId('chat-tool-call-status')).toHaveAttribute('data-status', status);
    }
    expect(screen.getByTestId('chat-tool-call-status')).toHaveTextContent('Failed');
  });

  it('shows the live status after a pending → in_progress → completed sequence', () => {
    renderCall([
      { sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Write', status: 'pending' },
      { sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'in_progress' },
      { sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'completed' },
    ]);
    expect(screen.getByTestId('chat-tool-call-status')).toHaveTextContent('Done');
  });

  it('renders a placeholder card for an update whose opening frame never arrived', () => {
    renderCall([{ sessionUpdate: 'tool_call_update', toolCallId: 'orphan', status: 'completed' }]);
    expect(screen.getByTestId('chat-tool-call')).toHaveAttribute('data-tool-call-id', 'orphan');
    // With no title of its own, the id is the honest label.
    expect(screen.getByText('orphan')).toBeInTheDocument();
  });

  it('offers no details toggle for a call with nothing to show', () => {
    renderCall([{ sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Bare' }]);
    expect(screen.queryByTestId('chat-tool-call-toggle')).not.toBeInTheDocument();
  });
});

describe('ToolCallCard — content blocks', () => {
  it('renders text content as monospace output rather than markdown', () => {
    renderCall([
      {
        sessionUpdate: 'tool_call',
        toolCallId: 't1',
        title: 'Read',
        content: [{ type: 'content', content: { type: 'text', text: '# not a heading' } }],
      },
    ]);
    open();
    const output = screen.getByTestId('chat-tool-output');
    expect(output).toHaveTextContent('# not a heading');
    expect(output.querySelector('h1')).toBeNull();
  });

  it('renders rawOutput when the agent sent no content blocks (the Pi path)', () => {
    renderCall([
      { sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Run ls', kind: 'execute' },
      { sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'completed', rawOutput: 'a.ts\nb.ts\n' },
    ]);
    open();
    expect(screen.getByTestId('chat-tool-output')).toHaveTextContent('a.ts');
  });

  it('clamps a huge output block instead of rendering megabytes inline', () => {
    const huge = 'x'.repeat(60_000);
    renderCall([
      { sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Dump', content: [{ type: 'text', text: huge }] },
    ]);
    open();
    const output = screen.getByTestId('chat-tool-output');
    expect(output).toHaveAttribute('data-clamped', 'true');
    expect(output.textContent!.length).toBeLessThan(huge.length);
    expect(output).toHaveTextContent('more characters');
  });

  it('renders a diff block read-only, with no editable surface', () => {
    renderCall([
      {
        sessionUpdate: 'tool_call',
        toolCallId: 't1',
        title: 'Edit',
        kind: 'edit',
        content: [{ type: 'diff', path: '/w/a.ts', oldText: 'const a = 1;\n', newText: 'const a = 2;\n' }],
      },
    ]);
    open();
    const diff = screen.getByTestId('chat-diff');
    expect(diff).toHaveAttribute('data-path', '/w/a.ts');
    expect(diff.querySelector('[contenteditable="true"]')).toBeNull();
  });

  it('labels a new-file diff and an emptied-file diff differently', () => {
    renderCall([
      {
        sessionUpdate: 'tool_call',
        toolCallId: 't1',
        title: 'Create',
        content: [{ type: 'diff', path: '/w/new.ts', newText: 'hello\n' }],
      },
    ]);
    open();
    expect(screen.getByTestId('chat-diff')).toHaveTextContent('new file');

    cleanup();
    renderCall([
      {
        sessionUpdate: 'tool_call',
        toolCallId: 't2',
        title: 'Delete',
        content: [{ type: 'diff', path: '/w/old.ts', oldText: 'bye\n', newText: '' }],
      },
    ]);
    open();
    expect(screen.getByTestId('chat-diff')).toHaveTextContent('file emptied');
  });

  it('shows an unrenderable block instead of silently dropping it', () => {
    renderCall([
      {
        sessionUpdate: 'tool_call',
        toolCallId: 't1',
        title: 'Odd',
        content: [{ type: 'content', content: { type: 'image', data: 'AAAA' } }],
      },
    ]);
    open();
    expect(screen.getByTestId('chat-tool-unsupported')).toHaveTextContent('image');
  });

  it('lists locations as plain paths with no navigation promise', () => {
    renderCall([
      {
        sessionUpdate: 'tool_call',
        toolCallId: 't1',
        title: 'Read',
        locations: [{ path: '/w/a.ts', line: 42 }, { path: '/w/b.ts' }],
      },
    ]);
    open();
    const locations = screen.getByTestId('chat-tool-locations');
    expect(locations).toHaveTextContent('/w/a.ts');
    expect(locations).toHaveTextContent(':42');
    expect(locations.querySelector('a')).toBeNull();
  });
});

describe('ToolCallCard — expansion state', () => {
  it('keeps the body open across a later update to the same call', () => {
    const first = callFrom([
      { sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Run', content: [{ type: 'text', text: 'partial' }] },
    ]);
    const { rerender } = render(<ToolCallCard segment={first} />);
    open();
    expect(screen.getByTestId('chat-tool-call-body')).toBeInTheDocument();

    const later = callFrom([
      { sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Run', content: [{ type: 'text', text: 'partial' }] },
      { sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'completed', content: [{ type: 'text', text: 'partial done' }] },
    ]);
    rerender(<ToolCallCard segment={later} />);
    expect(screen.getByTestId('chat-tool-call-body')).toHaveTextContent('partial done');
  });
});
