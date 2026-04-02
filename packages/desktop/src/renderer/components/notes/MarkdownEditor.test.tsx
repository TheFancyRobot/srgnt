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
});
