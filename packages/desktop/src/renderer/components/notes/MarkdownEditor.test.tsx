import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownEditor } from './MarkdownEditor.js';

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
});
