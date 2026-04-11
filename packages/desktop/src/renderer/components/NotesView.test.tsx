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

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(editor).toHaveAttribute('data-display-mode', 'rendered');
    });

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
});
