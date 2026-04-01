import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TiptapEditor } from './TiptapEditor.js';

describe('TiptapEditor', () => {
  it('renders frontmatter as a read-only block', () => {
    const onContentChange = vi.fn();

    render(
      <TiptapEditor
        rawContent={'---\ntitle: "Hello"\n---\n\nWorld'}
        onContentChange={onContentChange}
        saveState="idle"
      />,
    );

    expect(screen.getByText('title: "Hello"')).toBeInTheDocument();
  });

  it('shows save state indicator when saving', () => {
    const onContentChange = vi.fn();

    render(
      <TiptapEditor
        rawContent={'Some text'}
        onContentChange={onContentChange}
        saveState="saving"
      />,
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows saved indicator', () => {
    const onContentChange = vi.fn();

    render(
      <TiptapEditor
        rawContent={'Some text'}
        onContentChange={onContentChange}
        saveState="saved"
      />,
    );

    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows error indicator', () => {
    const onContentChange = vi.fn();

    render(
      <TiptapEditor
        rawContent={'Some text'}
        onContentChange={onContentChange}
        saveState="error"
      />,
    );

    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('does not show frontmatter block when absent', () => {
    const onContentChange = vi.fn();

    render(
      <TiptapEditor
        rawContent={'No frontmatter here'}
        onContentChange={onContentChange}
        saveState="idle"
      />,
    );

    expect(screen.queryByText('frontmatter')).not.toBeInTheDocument();
  });
});
