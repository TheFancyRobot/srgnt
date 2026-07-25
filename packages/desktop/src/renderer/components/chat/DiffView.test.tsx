/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DiffView } from './DiffView.js';

/**
 * The diff is the one place in the chat surface where a real editor engine runs,
 * so the load-bearing assertion is that it mounts *and* stays read-only.
 */

afterEach(cleanup);

const body = (): HTMLElement => screen.getByTestId('chat-diff-body');

describe('DiffView', () => {
  it('mounts a CodeMirror merge view showing the new document', () => {
    render(<DiffView path="/w/a.ts" oldText={'const a = 1;\n'} newText={'const a = 2;\n'} />);
    expect(body().querySelector('.cm-editor')).not.toBeNull();
    expect(body()).toHaveTextContent('const a = 2;');
  });

  it('is not editable: no contenteditable surface and no accept/reject controls', () => {
    render(<DiffView path="/w/a.ts" oldText={'a\n'} newText={'b\n'} />);
    // `editable: false` removes the contenteditable attribute entirely; if this
    // ever regresses the card becomes a stealth code editor.
    expect(body().querySelector('[contenteditable="true"]')).toBeNull();
    expect(body().querySelector('.cm-merge-revert')).toBeNull();
  });

  it('treats a null oldText as a new file and says so', () => {
    render(<DiffView path="/w/new.ts" oldText={null} newText={'line one\nline two\n'} />);
    expect(screen.getByTestId('chat-diff')).toHaveTextContent('new file');
    expect(body()).toHaveTextContent('line one');
  });

  it('renders a deletion (empty newText) without crashing', () => {
    render(<DiffView path="/w/gone.ts" oldText={'was here\n'} newText="" />);
    expect(screen.getByTestId('chat-diff')).toHaveTextContent('file emptied');
    expect(body().querySelector('.cm-editor')).not.toBeNull();
  });

  it('summarizes line counts for an ordinary edit', () => {
    render(<DiffView path="/w/a.ts" oldText={'1\n2\n3\n'} newText={'1\n2\n'} />);
    expect(screen.getByTestId('chat-diff')).toHaveTextContent('4 → 3 lines');
  });

  it('handles a large file without collapsing the whole card', () => {
    // 2000 unchanged lines around a one-line edit: the merge view's
    // collapseUnchanged is what keeps this readable.
    const lines = Array.from({ length: 2000 }, (_, index) => `line ${index}`);
    const oldText = `${lines.join('\n')}\n`;
    const changed = [...lines];
    changed[1000] = 'line 1000 CHANGED';
    render(<DiffView path="/w/big.ts" oldText={oldText} newText={`${changed.join('\n')}\n`} />);
    expect(body().querySelector('.cm-editor')).not.toBeNull();
  });
});
