import { act, fireEvent, render, screen } from '@testing-library/react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { MarkdownEditor } from './MarkdownEditor.js';

/**
 * Polyfill Range.prototype.getClientRects and Element.prototype.getBoundingClientRect for jsdom
 * so CodeMirror's cursorLineUp/cursorLineDown can compute vertical cursor movement using simulated rects.
 *
 * CodeMirror expects the result to support indexed access (`rects[i]`), `.length`, and `.item(i)`.
 * We return a plain array with `.item()` added.
 *
 * Strategy: find the .cm-line element the Range belongs to, count its index among siblings,
 * and synthesize a rect with y = lineIndex * lineHeight.
 *
 * Also handles table widgets (.cm-table-editor) and widget decorations (.cm-widget)
 * by calculating their bounding rect based on their children.
 */
const LINE_HEIGHT = 21;
const CHAR_WIDTH = 8.4;

const origGetClientRects = Range.prototype.getClientRects;
const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;

beforeAll(() => {
  Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
    // Handle .cm-content - calculate total height from all lines including tables
    if (this.classList.contains('cm-content')) {
      const lines = Array.from(this.querySelectorAll('.cm-line'));
      const width = 6 * CHAR_WIDTH;
      const height = Math.max(1, lines.length) * LINE_HEIGHT;
      return new DOMRect(0, 0, width, height);
    }

    // Handle .cm-line - calculate position based on index among siblings
    if (this.classList.contains('cm-line')) {
      const contentEl = this.closest('.cm-content');
      const allLines = contentEl ? Array.from(contentEl.querySelectorAll('.cm-line')) : [];
      const lineIndex = allLines.indexOf(this);
      return new DOMRect(0, Math.max(0, lineIndex) * LINE_HEIGHT, 6 * CHAR_WIDTH, LINE_HEIGHT);
    }

    // Handle table widgets (.cm-table-editor) - calculate height based on row count
    if (this.classList.contains('cm-table-editor') || this.tagName === 'TABLE') {
      const tableEl = this.classList.contains('cm-table-editor')
        ? this.querySelector('table')
        : this;
      if (tableEl) {
        const rows = tableEl.querySelectorAll('tr');
        const height = Math.max(1, rows.length) * LINE_HEIGHT;
        return new DOMRect(0, 0, 6 * CHAR_WIDTH, height);
      }
    }

    // Handle table structure elements (thead, tbody, tr, th, td)
    if (['THEAD', 'TBODY', 'TR', 'TH', 'TD'].includes(this.tagName)) {
      // Walk up to find the container or calculate row-based position
      const tableEl = this.closest('table');
      if (tableEl) {
        const rows = Array.from(tableEl.querySelectorAll('tr'));
        let rowIndex = -1;
        if (this.tagName === 'TR') {
          rowIndex = rows.findIndex(row => row === this);
        } else if (this.parentElement) {
          rowIndex = rows.findIndex(row => row === this.parentElement);
        }
        if (rowIndex < 0) rowIndex = 0;
        const height = LINE_HEIGHT;
        return new DOMRect(0, rowIndex * LINE_HEIGHT, 6 * CHAR_WIDTH, height);
      }
    }

    // Handle widget decorations (.cm-widget)
    if (this.classList.contains('cm-widget')) {
      // Widgets typically take up one line height
      return new DOMRect(0, 0, 6 * CHAR_WIDTH, LINE_HEIGHT);
    }

    return origGetBoundingClientRect.call(this);
  };

  Range.prototype.getClientRects = function (this: Range): DOMRectList & DOMRect[] {
    const container = this.startContainer;
    const el: Element | null =
      container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);

    // Handle table elements - calculate rect based on row structure
    if (el && (el.classList.contains('cm-table-editor') || el.tagName === 'TABLE' ||
        el.tagName === 'THEAD' || el.tagName === 'TBODY' || el.tagName === 'TR' ||
        el.tagName === 'TH' || el.tagName === 'TD')) {
      const tableEl = el.classList.contains('cm-table-editor')
        ? el.querySelector('table')
        : el.closest('table');
      if (tableEl) {
        const rows = Array.from(tableEl.querySelectorAll('tr'));
        let rowIndex = 0;
        if (el.tagName === 'TR' || el.tagName === 'TH' || el.tagName === 'TD') {
          const parentRow = el.tagName === 'TR' ? el : el.parentElement;
          if (parentRow) {
            rowIndex = rows.findIndex(row => row === parentRow);
          }
        }
        const rect = new DOMRect(0, Math.max(0, rowIndex) * LINE_HEIGHT, 6 * CHAR_WIDTH, LINE_HEIGHT);
        const arr: DOMRect[] = [rect];
        (arr as any).item = (i: number) => arr[i] ?? null;
        return arr as unknown as DOMRectList & DOMRect[];
      }
    }

    // Handle .cm-line elements
    const lineEl = el?.closest('.cm-line');
    const contentEl = el?.closest('.cm-content');
    const allLines = contentEl ? Array.from(contentEl.querySelectorAll('.cm-line')) : [];
    let lineIndex = lineEl ? allLines.indexOf(lineEl as Element) : -1;

    // Fallback for minimal EditorViews (no .cm-line DOM elements):
    // count newlines in the text node before the offset
    if (lineIndex < 0 && container.nodeType === Node.TEXT_NODE) {
      const text = container.textContent ?? '';
      const offset = Math.min(this.startOffset ?? 0, text.length);
      lineIndex = text.substring(0, offset).split('\n').length - 1;
    }
    if (lineIndex < 0) lineIndex = 0;

    const from = this.startOffset ?? 0;
    const to = this.endOffset ?? from;
    const width = Math.max(0, (to - from) * CHAR_WIDTH);
    const y = lineIndex * LINE_HEIGHT;

    const rect = new DOMRect(from * CHAR_WIDTH, y, width, LINE_HEIGHT);
    const arr: DOMRect[] = [rect];
    (arr as any).item = (i: number) => arr[i] ?? null;
    return arr as unknown as DOMRectList & DOMRect[];
  };
});

afterAll(() => {
  Element.prototype.getBoundingClientRect = origGetBoundingClientRect;
  if (origGetClientRects) {
    Range.prototype.getClientRects = origGetClientRects;
  }
});

describe('MarkdownEditor', () => {
  it('renders frontmatter as a read-only block', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'---\ntitle: "Hello"\n---\n\nWorld'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    expect(screen.getByText('title: "Hello"')).toBeInTheDocument();
  });

  it('shows save state indicator when saving', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'Some text'}
        onContentChange={onContentChange}
        saveState="saving"
        displayMode="live-preview"
      />,
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows saved indicator', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'Some text'}
        onContentChange={onContentChange}
        saveState="saved"
        displayMode="live-preview"
      />,
    );

    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows error indicator', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'Some text'}
        onContentChange={onContentChange}
        saveState="error"
        displayMode="live-preview"
      />,
    );

    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('does not show frontmatter block when absent', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'No frontmatter here'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    expect(screen.queryByTestId('frontmatter-block')).not.toBeInTheDocument();
  });

  it('reveals heading syntax on the active line in live preview', async () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'### Heading'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    const editor = screen.getByLabelText('Markdown editor');

    await act(async () => {
      fireEvent.focus(editor);
      fireEvent.mouseUp(editor);
      fireEvent.keyUp(editor, { key: 'ArrowRight' });
    });

    expect(document.querySelector('.cm-formatting-block-visible')).not.toBeNull();
    expect(screen.getByText('###')).toBeInTheDocument();
  });

  it('marks the default editor mode as live preview', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'### Heading'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    expect(screen.getByTestId('markdown-editor-wrapper')).toHaveAttribute('data-display-mode', 'live-preview');
  });

  it('supports fully rendered mode', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'### Heading'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="rendered"
      />,
    );

    expect(screen.getByTestId('markdown-editor-wrapper')).toHaveAttribute('data-display-mode', 'rendered');
  });

  it('keeps active-line syntax collapse enabled in rendered mode', async () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'### Heading\n\nParagraph with **bold** text'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="rendered"
      />,
    );

    const editor = screen.getByLabelText('Markdown editor');

    await act(async () => {
      fireEvent.focus(editor);
      fireEvent.mouseUp(editor);
      fireEvent.keyUp(editor, { key: 'ArrowRight' });
    });

    expect(document.querySelector('.cm-formatting-block-visible')).not.toBeNull();
  });

  it('decorates blockquote lines with nesting depth metadata', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'> Quote\n> > Nested'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    const blockquoteLines = Array.from(document.querySelectorAll('.cm-blockquote-line'));

    expect(blockquoteLines).toHaveLength(2);
    expect(blockquoteLines[0]).toHaveAttribute('data-blockquote-depth', '1');
    expect(blockquoteLines[1]).toHaveAttribute('data-blockquote-depth', '2');
  });

  it('decorates indented code block lines for code-block styling', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'Paragraph\n\n    const indented = true;\n    console.log(indented);\n'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    const codeLines = Array.from(document.querySelectorAll('.cm-codeblock-line'));

    expect(codeLines).toHaveLength(2);
    expect(codeLines[0]).toHaveClass('cm-codeblock-first');
    expect(codeLines[1]).toHaveClass('cm-codeblock-last');
  });

  it('decorates fenced code block lines including fence markers', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'```ts\nconst x = 42;\nconsole.log(x);\n```\n'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    const codeLines = Array.from(document.querySelectorAll('.cm-codeblock-line'));

    expect(codeLines).toHaveLength(4);
    expect(codeLines[0]).toHaveClass('cm-codeblock-first');
    expect(codeLines.at(-1)).toHaveClass('cm-codeblock-last');
  });

  it('keeps code block line decorations in rendered mode', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'Paragraph\n\n    const indented = true;\n\n```ts\nconst fenced = 42;\n```\n'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="rendered"
      />,
    );

    const codeLines = Array.from(document.querySelectorAll('.cm-codeblock-line'));

    expect(codeLines).toHaveLength(4);
    expect(codeLines[0]).toHaveClass('cm-codeblock-first');
    expect(codeLines.at(-1)).toHaveClass('cm-codeblock-last');
  });

  it('reveals fenced code block backticks on the active line', async () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'```ts\nconst fenced = 42;\n```\n'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    const editor = screen.getByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);

    expect(view).not.toBeNull();
    if (!view) {
      throw new Error('Expected CodeMirror editor view');
    }

    await act(async () => {
      view.dispatch({ selection: { anchor: 1 } });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const visibleFences = Array.from(document.querySelectorAll('.cm-formatting-block-visible'))
      .map((element) => element.textContent)
      .filter((text) => text === '```');

    expect(visibleFences.length).toBeGreaterThan(0);
  });

  it('calls openExternal for http link clicks', async () => {
    const openExternal = vi.fn(() => Promise.resolve());
    Object.defineProperty(window, 'srgnt', {
      value: { openExternal },
      writable: true,
      configurable: true,
    });

    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'Check [example](https://example.com) link'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    // The linkPlugin renders an anchor widget for the URL
    const anchor = document.querySelector('a[href="https://example.com"]');
    expect(anchor).not.toBeNull();

    await act(async () => {
      fireEvent.click(anchor!);
    });

    expect(openExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('silently handles rejected openExternal calls', async () => {
    const openExternal = vi.fn(() => Promise.reject(new Error('blocked')));
    Object.defineProperty(window, 'srgnt', {
      value: { openExternal },
      writable: true,
      configurable: true,
    });

    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'Check [example](https://example.com) link'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    const anchor = document.querySelector('a[href="https://example.com"]');
    expect(anchor).not.toBeNull();

    // Should not throw unhandled rejection
    await act(async () => {
      fireEvent.click(anchor!);
    });

    expect(openExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('ArrowUp from line 3 lands on line 2 with a stable same-column fixture', async () => {
    // Manual repro for the original bug:
    // 1. Open a multi-line markdown note.
    // 2. Place the caret on line 3.
    // 3. Press ArrowUp.
    // 4. Broken behavior jumped to the start of the document instead of line 2.
    const { cursorLineUp } = await import('@codemirror/commands');
    const doc = 'aaaaaa\nbbbbbb\ncccccc\ndddddd';

    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: { anchor: 0 },
      }),
      parent,
    });

    try {
      const line3 = view.state.doc.line(3);
      view.dispatch({ selection: { anchor: line3.from + 2 } });
      expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(3);

      const didMoveUp = cursorLineUp(view);
      expect(didMoveUp).toBe(true);
      expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(2);
    } finally {
      view.destroy();
      parent.remove();
    }
  });

  it('ArrowDown moves cursor down exactly one line — behavioral test', async () => {
    // Regression test: ArrowDown must move to the next line, not skip lines.
    // Strategy: create the EditorView with an updateListener extension that records
    // every selection change, then verify the new line number is exactly startLine + 1.
    const { cursorLineDown } = await import('@codemirror/commands');

    // Build a minimal view that mimics the full MarkdownEditor layout:
    // each line gets wrapped in a .cm-line element with a real text node inside.
    const parent = document.createElement('div');
    const contentEl = document.createElement('div');
    contentEl.className = 'cm-content';
    parent.appendChild(contentEl);

    const lines = ['line one', 'line two', 'line three', 'line four'];
    lines.forEach((txt) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'cm-line';
      lineEl.appendChild(document.createTextNode(txt));
      contentEl.appendChild(lineEl);
    });
    document.body.appendChild(parent);

    // Track selection changes via an update listener
    const capturedLines: number[] = [];
    const view = new EditorView({
      state: EditorState.create({
        doc: lines.join('\n'),
        selection: { anchor: 0 },
        extensions: [
          EditorView.updateListener.of((update) => {
            if (update.selectionSet) {
              capturedLines.push(update.state.doc.lineAt(update.state.selection.main.head).number);
            }
          }),
        ],
      }),
      parent,
    });

    try {
      // Place cursor on line 2
      const line2From = view.state.doc.line(2).from;
      view.dispatch({ selection: { anchor: line2From } });
      expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(2);

      // Flush any selection dispatched during setup
      capturedLines.length = 0;

      // Trigger ArrowDown — must dispatch a new selection
      const didMove = cursorLineDown(view);
      expect(didMove).toBe(true);

      // Must have captured exactly one selection change
      expect(capturedLines.length).toBe(1);
      // And it must be exactly one line below: line 3
      expect(capturedLines[0]).toBe(3);
    } finally {
      view.destroy();
      parent.remove();
    }
  });

  it('decorates GFM task list items as checked and unchecked checkboxes', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'- [ ] unchecked\n- [x] checked'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    expect(document.querySelectorAll('.cm-checkbox-unchecked-line')).toHaveLength(1);
    expect(document.querySelectorAll('.cm-checkbox-checked-line')).toHaveLength(1);
  });

  it('renders GFM tables as table elements when cursor is outside the table', async () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'| Name | Role |\n| ---- | ---- |\n| Ada | Engineer |\n\nAfter'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    const editor = screen.getByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);

    expect(view).not.toBeNull();
    if (!view) {
      throw new Error('Expected CodeMirror editor view');
    }

    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(document.querySelector('table')).not.toBeNull();
  });

  it('moves vertically through live-preview content without recursive scan errors', async () => {
    const onContentChange = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { cursorLineUp, cursorLineDown } = await import('@codemirror/commands');

    render(
      <MarkdownEditor
        rawContent={'# Heading\n\n**bold** text\n\n- one\n- two\n\nParagraph with [link](https://example.com)\n'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    const editor = screen.getByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);

    expect(view).not.toBeNull();
    if (!view) {
      throw new Error('Expected CodeMirror editor view');
    }

    try {
      await act(async () => {
        const paragraphLine = view.state.doc.line(8);
        view.dispatch({ selection: { anchor: paragraphLine.from + 2 } });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(() => cursorLineUp(view)).not.toThrow();
      expect(() => cursorLineUp(view)).not.toThrow();
      expect(() => cursorLineDown(view)).not.toThrow();
      expect(() => cursorLineDown(view)).not.toThrow();
      expect(view.state.selection.main.head).toBeGreaterThanOrEqual(0);
      expect(view.state.selection.main.head).toBeLessThanOrEqual(view.state.doc.length);

      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('applies strikethrough styling class for GFM strikethrough text', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'~~obsolete~~'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    expect(document.querySelector('.cm-strikethrough')).not.toBeNull();
  });

  it('renders bare autolinks as clickable anchors when cursor is outside the URL', async () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'Before\n\nhttps://example.com'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    const editor = screen.getByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);

    expect(view).not.toBeNull();
    if (!view) {
      throw new Error('Expected CodeMirror editor view');
    }

    await act(async () => {
      view.dispatch({ selection: { anchor: 0 } });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(document.querySelector('a[href="https://example.com"]')).not.toBeNull();
  });

  it('decorates Obsidian-style callout blockquotes with the callout type class', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'> [!warning] Be careful\n> Second line'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    const calloutLines = Array.from(document.querySelectorAll('.cm-callout-line'));
    expect(calloutLines).toHaveLength(2);
    expect(calloutLines[0]).toHaveClass('cm-callout-warning');
    expect(calloutLines[1]).toHaveClass('cm-callout-warning');
  });

  it('does not decorate regular blockquotes as callouts', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'> Just a quote\n> Still a quote'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    expect(document.querySelector('.cm-callout-line')).toBeNull();
    expect(document.querySelectorAll('.cm-blockquote-line')).toHaveLength(2);
  });

  it('decorates horizontal rules with a visible line class', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'Above\n\n----\n\nBelow'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    expect(document.querySelector('.cm-hr-line')).not.toBeNull();
  });

  it('toggles task list markers when clicking the checkbox gutter', async () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'- [ ] task'}
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
      />,
    );

    const editor = screen.getByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    const checkboxLine = document.querySelector('.cm-checkbox-unchecked-line') as HTMLElement | null;

    expect(view).not.toBeNull();
    expect(checkboxLine).not.toBeNull();
    if (!view || !checkboxLine) {
      throw new Error('Expected checkbox line and CodeMirror editor view');
    }

    vi.spyOn(checkboxLine, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 21));

    await act(async () => {
      fireEvent.click(checkboxLine, { clientX: 10, clientY: 10 });
    });

    expect(view.state.doc.toString()).toBe('- [x] task');
  });
});
