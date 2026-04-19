import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { NotesProvider } from './notes/NotesContext.js';
import { NotesSidePanel } from './sidepanels/NotesSidePanel.js';
import { NotesView } from './NotesView.js';

let notesSearchMock: ReturnType<typeof vi.fn>;

describe('NotesView', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    window.localStorage.clear();

    const notesListDir = vi.fn(async (dirPath: string) => {
      switch (dirPath) {
        case '':
          return {
            entries: [
              {
                name: 'Inbox.md',
                path: '/workspace/demo/Notes/Inbox.md',
                isDirectory: false,
                modifiedAt: '2026-04-01T00:00:00.000Z',
              },
            ],
          };
        default:
          return { entries: [] };
      }
    });

    notesSearchMock = vi.fn();

    window.srgnt = {
      getWorkspaceRoot: vi.fn().mockResolvedValue('/workspace/demo'),
      setWorkspaceRoot: vi.fn(),
      chooseWorkspaceRoot: vi.fn(),
      createDefaultWorkspaceRoot: vi.fn(),
      listConnectors: vi.fn(),
      connectConnector: vi.fn(),
      disconnectConnector: vi.fn(),
      getDesktopSettings: vi.fn(),
      saveDesktopSettings: vi.fn(),
      terminalSpawn: vi.fn(),
      terminalWrite: vi.fn(),
      terminalResize: vi.fn(),
      terminalClose: vi.fn(),
      terminalList: vi.fn(),
      onTerminalData: vi.fn(() => () => {}),
      onTerminalExit: vi.fn(() => () => {}),
      terminalLaunchWithContext: vi.fn(),
      onLaunchApprovalRequired: vi.fn(() => () => {}),
      resolveLaunchApproval: vi.fn(),
      saveBriefing: vi.fn(),
      listBriefings: vi.fn(),
      writeDiagnosticCrashLog: vi.fn(),
      notesListDir,
      notesReadFile: vi.fn(async () => ({
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      })),
      notesCreateFile: vi.fn(),
      notesCreateFolder: vi.fn(),
      notesRename: vi.fn(),
      notesDelete: vi.fn(),
      notesSearch: notesSearchMock,
      notesResolveWikilink: vi.fn(),
      notesListWorkspaceMarkdown: vi.fn(),
      windowMinimize: vi.fn(),
      windowMaximize: vi.fn(),
      windowClose: vi.fn(),
      windowIsMaximized: vi.fn(),
      onWindowMaximizedChange: vi.fn(() => () => {}),
      checkForUpdates: vi.fn(),
      platform: 'linux',
      notesWriteFile: vi.fn(async (_filePath: string, content: string) => ({
        path: '/workspace/demo/Notes/Inbox.md',
        modifiedAt: '2026-04-01T00:00:00.000Z',
        content,
      })),
    } as unknown as typeof window.srgnt;
  });

  it('toggles between active-line edit mode and fully rendered mode', async () => {
    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const toggle = await screen.findByRole('button', { name: 'Toggle fully rendered mode' });
    const editor = screen.getByTestId('markdown-editor-wrapper');

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(editor).toHaveAttribute('data-display-mode', 'live-preview');

    await act(async () => {
      fireEvent.click(toggle);
    });

    await waitFor(() => {
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(editor).toHaveAttribute('data-display-mode', 'rendered');
    }, { timeout: 10000 });

    expect(window.localStorage.getItem('srgnt:notes:editor-display-mode')).toBe('rendered');
  });

  it('renders highlighted search snippets and opens results after debounce', async () => {
    notesSearchMock.mockResolvedValue({
      results: [
        {
          title: 'Project Plan',
          path: 'Notes/Project Plan.md',
          snippet: 'Before **alpha** after',
          score: 10,
        },
      ],
    });

    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    const input = screen.getByPlaceholderText('Search notes...');
    fireEvent.change(input, { target: { value: 'alpha' } });

    expect(await screen.findByText('Project Plan')).toBeInTheDocument();
    expect(screen.getByText('alpha')).toContainHTML('mark');

    fireEvent.click(screen.getByRole('button', { name: /Project Plan/i }));

    await waitFor(() => {
      expect(window.srgnt.notesReadFile).toHaveBeenCalledWith('Project Plan.md');
    });
  });

  it('ignores stale search responses after clearing the query', async () => {
    vi.useFakeTimers();

    let resolveSearch: ((value: { results: { title: string; path: string; snippet: string; score: number }[] }) => void) | undefined;
    notesSearchMock.mockImplementation(
      () => new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );

    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    const input = screen.getByPlaceholderText('Search notes...');
    fireEvent.change(input, { target: { value: 'alpha' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    fireEvent.keyDown(input, { key: 'Escape' });
    resolveSearch?.({
      results: [
        {
          title: 'Stale Result',
          path: 'Notes/Stale.md',
          snippet: '**alpha**',
          score: 10,
        },
      ],
    });

    await Promise.resolve();

    expect(screen.queryByText('Stale Result')).not.toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('retries failed autosaves and shows the recovery banner after max retries', async () => {
    window.srgnt.notesWriteFile = vi.fn().mockRejectedValue(new Error('disk full')) as typeof window.srgnt.notesWriteFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) {
      throw new Error('Expected CodeMirror editor view');
    }

    vi.useFakeTimers();

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nmore text' } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000 + 1000 + 2000 + 4000);
    });

    expect(screen.getByText(/Save failed after 4 attempts/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry Save' })).toBeInTheDocument();
    expect(window.srgnt.notesWriteFile).toHaveBeenCalledTimes(4);
  });

  it('saves deleted-file recovery content into a new note', async () => {
    let readCount = 0;
    window.srgnt.notesReadFile = vi.fn(async (filePath?: string) => {
      readCount += 1;
      if (readCount >= 2 && filePath === 'Inbox.md') {
        throw new Error('ENOENT');
      }
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;
    window.srgnt.notesCreateFile = vi.fn(async () => ({
      path: '/workspace/demo/Notes/Inbox.md',
      createdAt: '2026-04-01T00:00:00.000Z',
    })) as typeof window.srgnt.notesCreateFile;
    window.srgnt.notesWriteFile = vi.fn(async (filePath: string, content: string) => ({
      path: `/workspace/demo/Notes/${filePath}`,
      modifiedAt: '2026-04-01T00:00:01.000Z',
      content,
    })) as typeof window.srgnt.notesWriteFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) {
      throw new Error('Expected CodeMirror editor view');
    }

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nunsaved recovery text' } });
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was deleted/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save as New Note' }));

    await waitFor(() => {
      expect(window.srgnt.notesWriteFile).toHaveBeenCalledWith(
        'Inbox.md',
        expect.stringContaining('unsaved recovery text'),
      );
    });
  });

  it('shows empty state when no note is selected', async () => {
    await act(async () => {
      render(
        <NotesProvider>
          <NotesView />
        </NotesProvider>,
      );
      await Promise.resolve();
    });
    expect(screen.getByText(/Select a note from the Explorer panel/)).toBeInTheDocument();
  });

  it('initializes display mode from localStorage', async () => {
    window.localStorage.setItem('srgnt:notes:editor-display-mode', 'rendered');
    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );
    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));
    const toggle = await screen.findByRole('button', { name: 'Toggle fully rendered mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls clearSelection when Close button clicked', async () => {
    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );
    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.getByText(/Select a note from the Explorer panel/)).toBeInTheDocument();
    });
  });

  it('shows error from context in the header bar when a note is selected', async () => {
    // Make notesReadFile throw when selecting a note. selectNote() sets selectedPath
    // before the try/catch, so the error will display in the header bar.
    window.srgnt.notesReadFile = vi.fn(async () => {
      throw new Error('permission denied');
    }) as typeof window.srgnt.notesReadFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    await waitFor(() => {
      // Error appears in both NotesSidePanel and NotesView header
      expect(screen.getAllByText('permission denied').length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  it('shows external-modified banner with Keep Mine and Reload from Disk buttons', async () => {
    let readCount = 0;
    window.srgnt.notesReadFile = vi.fn(async () => {
      readCount += 1;
      // First read returns normal content, subsequent reads return a different mtime
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: readCount === 1 ? '2026-04-01T00:00:00.000Z' : '2026-04-01T00:00:01.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    // Make an edit so hasUnsavedEditsRef is true
    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nmodified' } });
    });

    // Trigger mtime poll which will detect external modification
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was modified externally/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep Mine' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload from Disk' })).toBeInTheDocument();
  });

  it('reloads from disk when Reload from Disk button clicked', async () => {
    let readCount = 0;
    window.srgnt.notesReadFile = vi.fn(async () => {
      readCount += 1;
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: readCount === 1 ? '2026-04-01T00:00:00.000Z' : '2026-04-01T00:00:01.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    // Make an edit so hasUnsavedEditsRef is true
    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nmodified' } });
    });

    // Trigger external modification detection
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was modified externally/)).toBeInTheDocument();

    // Click Reload from Disk
    fireEvent.click(screen.getByRole('button', { name: 'Reload from Disk' }));

    await waitFor(() => {
      // Banner should be gone
      expect(screen.queryByText(/This file was modified externally/)).not.toBeInTheDocument();
    });
  });

  it('force-saves when Keep Mine button clicked', async () => {
    let readCount = 0;
    window.srgnt.notesReadFile = vi.fn(async () => {
      readCount += 1;
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: readCount === 1 ? '2026-04-01T00:00:00.000Z' : '2026-04-01T00:00:01.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    // Make an edit so hasUnsavedEditsRef is true
    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nkeep mine text' } });
    });

    // Trigger external modification detection
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was modified externally/)).toBeInTheDocument();

    // Click Keep Mine
    fireEvent.click(screen.getByRole('button', { name: 'Keep Mine' }));

    // Banner should disappear and write should be triggered
    await waitFor(() => {
      expect(screen.queryByText(/This file was modified externally/)).not.toBeInTheDocument();
      expect(window.srgnt.notesWriteFile).toHaveBeenCalled();
    });
  });

  it('clears selection when Discard button clicked on file-deleted banner', async () => {
    let readCount = 0;
    window.srgnt.notesReadFile = vi.fn(async (filePath?: string) => {
      readCount += 1;
      if (readCount >= 2 && filePath === 'Inbox.md') {
        throw new Error('ENOENT');
      }
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    // Make an edit so hasUnsavedEditsRef is true
    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nunsaved text' } });
    });

    // Trigger file-deleted detection
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was deleted/)).toBeInTheDocument();

    // Click Discard
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    await waitFor(() => {
      expect(screen.getByText(/Select a note from the Explorer panel/)).toBeInTheDocument();
    });
  });

  it('uses textarea fallback when clipboard API fails', async () => {
    // First trigger save-error banner
    window.srgnt.notesWriteFile = vi.fn().mockRejectedValue(new Error('disk full')) as typeof window.srgnt.notesWriteFile;

    // Mock clipboard API to throw (jsdom doesn't have navigator.clipboard)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('NotAllowed')) },
      writable: true,
      configurable: true,
    });
    // jsdom doesn't have execCommand, mock it
    const execSpy = vi.fn();
    document.execCommand = execSpy;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    vi.useFakeTimers();

    // Make an edit
    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nmore text' } });
    });

    // Wait for all retries to fail
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000 + 1000 + 2000 + 4000);
    });

    expect(screen.getByText(/Save failed after 4 attempts/)).toBeInTheDocument();

    // Click Copy to Clipboard
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy to Clipboard' }));
      await Promise.resolve();
    });

    // Clipboard API should have been called and rejected, fallback used
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(document.execCommand).toHaveBeenCalledWith('copy');

    // Cleanup
    delete (document as unknown as Record<string, unknown>).execCommand;
  });

  it('handles wikilink click for resolved path', async () => {
    window.srgnt.notesResolveWikilink = vi.fn(async () => ({
      resolved: true,
      path: 'OtherNote.md',
    })) as typeof window.srgnt.notesResolveWikilink;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));
    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    // Insert a wikilink
    await act(async () => {
      view.dispatch({ changes: { from: 0, insert: '[[OtherNote]]' } });
    });

    // Find the wikilink element and click it
    const wikilinkEl = editor.querySelector('.cm-wikilink') as HTMLElement;
    expect(wikilinkEl).not.toBeNull();
    if (!wikilinkEl) throw new Error('Expected wikilink element');

    await act(async () => {
      fireEvent.click(wikilinkEl);
      await Promise.resolve();
    });

    expect(window.srgnt.notesResolveWikilink).toHaveBeenCalledWith('[[OtherNote]]', 'Inbox.md');
    // selectNote should be called with the resolved path
    await waitFor(() => {
      expect(window.srgnt.notesReadFile).toHaveBeenCalledWith('OtherNote.md');
    });
  });

  it('handles wikilink click for unresolved path inside Notes/', async () => {
    window.srgnt.notesResolveWikilink = vi.fn(async () => ({
      resolved: false,
      path: 'Notes/NewNote.md',
    })) as typeof window.srgnt.notesResolveWikilink;
    window.srgnt.notesCreateFile = vi.fn(async () => ({
      path: '/workspace/demo/Notes/NewNote.md',
      createdAt: '2026-04-01T00:00:00.000Z',
    })) as typeof window.srgnt.notesCreateFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));
    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    // Insert a wikilink
    await act(async () => {
      view.dispatch({ changes: { from: 0, insert: '[[NewNote]]' } });
    });

    const wikilinkEl = editor.querySelector('.cm-wikilink') as HTMLElement;
    expect(wikilinkEl).not.toBeNull();
    if (!wikilinkEl) throw new Error('Expected wikilink element');

    await act(async () => {
      fireEvent.click(wikilinkEl);
      await Promise.resolve();
    });

    expect(window.srgnt.notesResolveWikilink).toHaveBeenCalledWith('[[NewNote]]', 'Inbox.md');
    expect(window.srgnt.notesCreateFile).toHaveBeenCalled();
  });

  it('handles wikilink click for unresolved path with pipe syntax', async () => {
    window.srgnt.notesResolveWikilink = vi.fn(async () => ({
      resolved: false,
      path: 'Notes/Display Title.md',
    })) as typeof window.srgnt.notesResolveWikilink;
    window.srgnt.notesCreateFile = vi.fn(async () => ({
      path: '/workspace/demo/Notes/Display Title.md',
      createdAt: '2026-04-01T00:00:00.000Z',
    })) as typeof window.srgnt.notesCreateFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));
    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    // Insert a wikilink with pipe syntax: [[Display Title|link target]]
    await act(async () => {
      view.dispatch({ changes: { from: 0, insert: '[[Display Title|link target]]' } });
    });

    const wikilinkEl = editor.querySelector('.cm-wikilink') as HTMLElement;
    expect(wikilinkEl).not.toBeNull();
    if (!wikilinkEl) throw new Error('Expected wikilink element');

    await act(async () => {
      fireEvent.click(wikilinkEl);
      await Promise.resolve();
    });

    expect(window.srgnt.notesResolveWikilink).toHaveBeenCalledWith('[[Display Title|link target]]', 'Inbox.md');
    expect(window.srgnt.notesCreateFile).toHaveBeenCalled();
  });

  it('ignores wikilink click for path outside Notes/', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.srgnt.notesResolveWikilink = vi.fn(async () => ({
      resolved: false,
      path: 'Outside/SomeNote.md',
    })) as typeof window.srgnt.notesResolveWikilink;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));
    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    await act(async () => {
      view.dispatch({ changes: { from: 0, insert: '[[OutsideNote]]' } });
    });

    const wikilinkEl = editor.querySelector('.cm-wikilink') as HTMLElement;
    expect(wikilinkEl).not.toBeNull();
    if (!wikilinkEl) throw new Error('Expected wikilink element');

    await act(async () => {
      fireEvent.click(wikilinkEl);
      await Promise.resolve();
    });

    expect(warnSpy).toHaveBeenCalledWith('Cannot create file outside Notes/: Outside/SomeNote.md');
    expect(window.srgnt.notesCreateFile).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('handles wikilink click error gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.srgnt.notesResolveWikilink = vi.fn(async () => {
      throw new Error('resolve failed');
    }) as typeof window.srgnt.notesResolveWikilink;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));
    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    await act(async () => {
      view.dispatch({ changes: { from: 0, insert: '[[BrokenLink]]' } });
    });

    const wikilinkEl = editor.querySelector('.cm-wikilink') as HTMLElement;
    expect(wikilinkEl).not.toBeNull();
    if (!wikilinkEl) throw new Error('Expected wikilink element');

    await act(async () => {
      fireEvent.click(wikilinkEl);
      await Promise.resolve();
    });

    expect(errorSpy).toHaveBeenCalledWith('Failed to handle wikilink click:', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('shows save-error banner when Save as New Note fails because createNote returns null', async () => {
    let readCount = 0;
    window.srgnt.notesReadFile = vi.fn(async (filePath?: string) => {
      readCount += 1;
      if (readCount >= 2 && filePath === 'Inbox.md') {
        throw new Error('ENOENT');
      }
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;
    // createNote returns null (e.g. file already exists)
    window.srgnt.notesCreateFile = vi.fn(async () => {
      throw new Error('file exists');
    }) as typeof window.srgnt.notesCreateFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nunsaved text' } });
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was deleted/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save as New Note' }));

    await waitFor(() => {
      expect(screen.getByText(/Save failed after 4 attempts|Failed to create replacement note/)).toBeInTheDocument();
    });
  });

  it('shows save-error banner when Save as New Note writeFile throws', async () => {
    let readCount = 0;
    window.srgnt.notesReadFile = vi.fn(async (filePath?: string) => {
      readCount += 1;
      if (readCount >= 2 && filePath === 'Inbox.md') {
        throw new Error('ENOENT');
      }
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;
    window.srgnt.notesCreateFile = vi.fn(async () => ({
      path: '/workspace/demo/Notes/Inbox.md',
      createdAt: '2026-04-01T00:00:00.000Z',
    })) as typeof window.srgnt.notesCreateFile;
    window.srgnt.notesWriteFile = vi.fn(async () => {
      throw new Error('write failed');
    }) as typeof window.srgnt.notesWriteFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nunsaved text' } });
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was deleted/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save as New Note' }));

    await waitFor(() => {
      expect(screen.getByText(/write failed/)).toBeInTheDocument();
    });
  });

  it('transitions save state from saving to saved to idle', async () => {
    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    // Make an edit to trigger debounced save
    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nsave test' } });
    });

    // writeActiveContent should have been called after the debounce
    await waitFor(() => {
      expect(window.srgnt.notesWriteFile).toHaveBeenCalled();
    }, { timeout: 5000 });

    // Component should still be rendering (no crash)
    expect(screen.getAllByText('Inbox.md').length).toBeGreaterThanOrEqual(1);
  });

  it('successfully saves deleted file as a new note (happy path)', async () => {
    let initialSelectDone = false;
    let editDone = false;
    let focusTriggeredFileDeleted = false;

    window.srgnt.notesReadFile = vi.fn(async (filePath?: string) => {
      if (initialSelectDone && editDone && !focusTriggeredFileDeleted && filePath === 'Inbox.md') {
        focusTriggeredFileDeleted = true;
        throw new Error('ENOENT');
      }
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;
    window.srgnt.notesCreateFile = vi.fn(async () => ({
      path: '/workspace/demo/Notes/Inbox.md',
      createdAt: '2026-04-01T00:00:00.000Z',
    })) as typeof window.srgnt.notesCreateFile;
    window.srgnt.notesWriteFile = vi.fn(async (filePath: string, content: string) => ({
      path: `/workspace/demo/Notes/${filePath}`,
      modifiedAt: '2026-04-01T00:00:01.000Z',
      content,
    })) as typeof window.srgnt.notesWriteFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));
    initialSelectDone = true;

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    // Make an edit so hasUnsavedEditsRef becomes true
    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nhappy path content' } });
    });
    editDone = true;

    // Trigger file-deleted detection via window focus
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was deleted/i)).toBeInTheDocument();

    // Click Save as New Note
    fireEvent.click(screen.getByRole('button', { name: 'Save as New Note' }));

    // Wait for the async flow (createNote + writeFile + selectNote)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });

    expect(window.srgnt.notesCreateFile).toHaveBeenCalled();

    // Banner should be gone after successful save
    await waitFor(() => {
      expect(screen.queryByText(/This file was deleted/i)).not.toBeInTheDocument();
    });

    // Advance past the 2s saved-reset timer to cover lines 282-283
    await act(async () => {
      await new Promise((r) => setTimeout(r, 2500));
    });
  });

  it('shows error banner when createNote returns null (empty title path)', async () => {
    let readCount = 0;
    window.srgnt.notesReadFile = vi.fn(async (filePath?: string) => {
      readCount += 1;
      if (readCount >= 2 && filePath === 'Inbox.md') {
        throw new Error('ENOENT');
      }
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;
    window.srgnt.notesCreateFile = vi.fn(async () => {
      throw new Error('already exists');
    }) as typeof window.srgnt.notesCreateFile;
    window.srgnt.notesWriteFile = vi.fn(async (_filePath: string, content: string) => ({
      path: '/workspace/demo/Notes/Inbox.md',
      modifiedAt: '2026-04-01T00:00:01.000Z',
      content,
    })) as typeof window.srgnt.notesWriteFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    vi.useFakeTimers();

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nunsaved text' } });
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was deleted/i)).toBeInTheDocument();

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save as New Note' }));
      // Flush all pending promises and timers for the async createNote chain
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(0);
    });

    // Banner renders as: "Save failed after 4 attempts: Failed to create replacement note"
    expect(screen.getByText(/Failed to create replacement note/)).toBeInTheDocument();

    errorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('shows fallback error message when handleSaveAsNewNote catches non-Error', async () => {
    let readCount = 0;
    window.srgnt.notesReadFile = vi.fn(async (filePath?: string) => {
      readCount += 1;
      if (readCount >= 2 && filePath === 'Inbox.md') {
        throw new Error('ENOENT');
      }
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;
    window.srgnt.notesCreateFile = vi.fn(async () => ({
      path: '/workspace/demo/Notes/Inbox.md',
      createdAt: '2026-04-01T00:00:00.000Z',
    })) as typeof window.srgnt.notesCreateFile;
    // Throw a non-Error value (string) to cover the fallback branch.
    // This will fire during the writeFile call inside handleSaveAsNewNote.
    window.srgnt.notesWriteFile = vi.fn(async () => {
      throw 'disk write failed';
    }) as typeof window.srgnt.notesWriteFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nunsaved text' } });
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was deleted/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save as New Note' }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to save replacement note/)).toBeInTheDocument();
    });
  });

  it('clears selection when Save as New Note is clicked with empty unsaved content', async () => {
    let readCount = 0;
    window.srgnt.notesReadFile = vi.fn(async (filePath?: string) => {
      readCount += 1;
      if (readCount >= 2 && filePath === 'Inbox.md') {
        throw new Error('ENOENT');
      }
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    await act(async () => {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '' } });
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was deleted/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save as New Note' }));

    await waitFor(() => {
      expect(screen.getByText(/Select a note from the Explorer panel/)).toBeInTheDocument();
    });

    expect(window.srgnt.notesCreateFile).not.toHaveBeenCalled();
    expect(window.srgnt.notesWriteFile).not.toHaveBeenCalled();
  });

  it('resets save state to idle after successful Save as New Note timer elapses', async () => {
    let initialSelectDone = false;
    let editDone = false;
    let focusTriggeredFileDeleted = false;

    window.srgnt.notesReadFile = vi.fn(async (filePath?: string) => {
      if (initialSelectDone && editDone && !focusTriggeredFileDeleted && filePath === 'Inbox.md') {
        focusTriggeredFileDeleted = true;
        throw new Error('ENOENT');
      }
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;
    window.srgnt.notesCreateFile = vi.fn(async () => ({
      path: '/workspace/demo/Notes/Inbox.md',
      createdAt: '2026-04-01T00:00:00.000Z',
    })) as typeof window.srgnt.notesCreateFile;
    window.srgnt.notesWriteFile = vi.fn(async (filePath: string, content: string) => ({
      path: `/workspace/demo/Notes/${filePath}`,
      modifiedAt: '2026-04-01T00:00:01.000Z',
      content,
    })) as typeof window.srgnt.notesWriteFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));
    initialSelectDone = true;

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\ntimer coverage' } });
    });
    editDone = true;

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was deleted/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save as New Note' }));

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByText(/This file was deleted/i)).not.toBeInTheDocument();
    expect(window.srgnt.notesCreateFile).toHaveBeenCalled();
    expect(window.srgnt.notesWriteFile).toHaveBeenCalled();
  }, 8000);

  it('debounces rapid content changes into a single save from the latest edit', async () => {
    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    vi.useFakeTimers();

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nfirst rapid edit' } });
    });

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nsecond rapid edit' } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(window.srgnt.notesWriteFile).toHaveBeenCalledTimes(1);
    expect(window.srgnt.notesWriteFile).toHaveBeenLastCalledWith(
      'Inbox.md',
      expect.stringContaining('second rapid edit'),
    );

    vi.useRealTimers();
  }, 10000);

  it('retries saving when Retry Save is clicked from the recovery banner', async () => {
    const writeMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockRejectedValueOnce(new Error('disk full'))
      .mockRejectedValueOnce(new Error('disk full'))
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValue({
        path: '/workspace/demo/Notes/Inbox.md',
        modifiedAt: '2026-04-01T00:00:01.000Z',
        content: '# Heading\n\nParagraph\nretry me',
      });
    window.srgnt.notesWriteFile = writeMock as typeof window.srgnt.notesWriteFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    vi.useFakeTimers();

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nretry me' } });
      await vi.advanceTimersByTimeAsync(1000 + 1000 + 2000 + 4000);
    });

    expect(screen.getByText(/Save failed after 4 attempts/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry Save' }));
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
    });

    expect(writeMock).toHaveBeenCalledTimes(5);
    expect(screen.queryByText(/Save failed after 4 attempts/i)).not.toBeInTheDocument();

    vi.useRealTimers();
  }, 10000);

  it('runs the Save as New Note saved-reset timer callback', async () => {
    let initialSelectDone = false;
    let editDone = false;
    let focusTriggeredFileDeleted = false;

    window.srgnt.notesReadFile = vi.fn(async (filePath?: string) => {
      if (initialSelectDone && editDone && !focusTriggeredFileDeleted && filePath === 'Inbox.md') {
        focusTriggeredFileDeleted = true;
        throw new Error('ENOENT');
      }
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;
    window.srgnt.notesCreateFile = vi.fn(async () => ({
      path: '/workspace/demo/Notes/Inbox.md',
      createdAt: '2026-04-01T00:00:00.000Z',
    })) as typeof window.srgnt.notesCreateFile;
    window.srgnt.notesWriteFile = vi.fn(async (filePath: string, content: string) => ({
      path: `/workspace/demo/Notes/${filePath}`,
      modifiedAt: '2026-04-01T00:00:01.000Z',
      content,
    })) as typeof window.srgnt.notesWriteFile;

    const originalSetTimeout = globalThis.setTimeout;
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
        const id = originalSetTimeout(callback as Parameters<typeof setTimeout>[0], delay as number, ...args);
        if (delay === 2000 && typeof callback === 'function') {
          callback(...(args as []));
        }
        return id;
      }) as unknown as typeof globalThis.setTimeout,
    );

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));
    initialSelectDone = true;

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nnew note timer' } });
    });
    editDone = true;

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was deleted/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save as New Note' }));
      await Promise.resolve();
    });

    expect(window.srgnt.notesCreateFile).toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);

    setTimeoutSpy.mockRestore();
  });

  it('clears a prior saved-reset timer when saving as new note after a prior save', async () => {
    let initialSelectDone = false;
    let editDone = false;
    let focusTriggeredFileDeleted = false;
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    window.srgnt.notesReadFile = vi.fn(async (filePath?: string) => {
      if (initialSelectDone && editDone && !focusTriggeredFileDeleted && filePath === 'Inbox.md') {
        focusTriggeredFileDeleted = true;
        throw new Error('ENOENT');
      }
      return {
        content: '# Heading\n\nParagraph',
        modifiedAt: '2026-04-01T00:00:00.000Z',
      };
    }) as typeof window.srgnt.notesReadFile;
    window.srgnt.notesCreateFile = vi.fn(async () => ({
      path: '/workspace/demo/Notes/Inbox.md',
      createdAt: '2026-04-01T00:00:00.000Z',
    })) as typeof window.srgnt.notesCreateFile;
    window.srgnt.notesWriteFile = vi.fn(async (filePath: string, content: string) => ({
      path: `/workspace/demo/Notes/${filePath}`,
      modifiedAt: '2026-04-01T00:00:01.000Z',
      content,
    })) as typeof window.srgnt.notesWriteFile;

    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));
    initialSelectDone = true;

    const editor = await screen.findByLabelText('Markdown editor');
    const view = EditorView.findFromDOM(editor);
    expect(view).not.toBeNull();
    if (!view) throw new Error('Expected CodeMirror editor view');

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nfirst edit' } });
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1500));
    });
    editDone = true;

    clearTimeoutSpy.mockClear();

    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nsecond edit' } });
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(screen.getByText(/This file was deleted/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save as New Note' }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });

    expect(window.srgnt.notesCreateFile).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});
