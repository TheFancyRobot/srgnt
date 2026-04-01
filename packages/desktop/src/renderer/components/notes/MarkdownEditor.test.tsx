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
        onToggleSyntaxMode={() => {}}
        saveState="idle"
        syntaxMode="live-preview"
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
        onToggleSyntaxMode={() => {}}
        saveState="saving"
        syntaxMode="live-preview"
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
        onToggleSyntaxMode={() => {}}
        saveState="saved"
        syntaxMode="live-preview"
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
        onToggleSyntaxMode={() => {}}
        saveState="error"
        syntaxMode="live-preview"
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
        onToggleSyntaxMode={() => {}}
        saveState="idle"
        syntaxMode="live-preview"
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
        onToggleSyntaxMode={() => {}}
        saveState="idle"
        syntaxMode="live-preview"
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

  it('shows full markdown syntax in source mode', () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        rawContent={'### Heading'}
        onContentChange={onContentChange}
        onToggleSyntaxMode={() => {}}
        saveState="idle"
        syntaxMode="source"
      />,
    );

    expect(screen.getByTestId('markdown-editor-wrapper')).toHaveAttribute('data-mode', 'source');
    expect(screen.getByText('###')).toBeInTheDocument();
    expect(screen.getByText('Heading')).toBeInTheDocument();
  });
});
