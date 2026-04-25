import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { NotesProvider } from '../notes/NotesContext.js';
import { NotesView } from '../NotesView.js';
import { NotesSidePanel } from './NotesSidePanel.js';

async function flushAsyncState(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function clickAndFlush(element: HTMLElement): Promise<void> {
  await act(async () => {
    fireEvent.click(element);
    await flushAsyncState();
  });
}

async function keyDownAndFlush(element: HTMLElement, key: string): Promise<void> {
  await act(async () => {
    fireEvent.keyDown(element, { key });
    await flushAsyncState();
  });
}

async function focusAndFlush(element: HTMLElement): Promise<void> {
  await act(async () => {
    fireEvent.focus(element);
    await flushAsyncState();
  });
}

async function changeAndFlush(element: HTMLElement, value: string): Promise<void> {
  await act(async () => {
    fireEvent.change(element, { target: { value } });
    await flushAsyncState();
  });
}

async function waitForDebounce(ms = 350): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await flushAsyncState();
  });
}

describe('NotesSidePanel', () => {
  beforeEach(() => {
    document.documentElement.className = '';

    const notesListDir = vi.fn(async (dirPath: string) => {
      switch (dirPath) {
        case '':
          return {
            entries: [
              {
                name: 'Projects',
                path: '/workspace/demo/Notes/Projects',
                isDirectory: true,
                modifiedAt: '2026-04-01T00:00:00.000Z',
              },
              {
                name: 'Inbox.md',
                path: '/workspace/demo/Notes/Inbox.md',
                isDirectory: false,
                modifiedAt: '2026-04-01T00:00:00.000Z',
              },
            ],
          };
        case 'Projects':
          return {
            entries: [
              {
                name: 'Roadmap.md',
                path: '/workspace/demo/Notes/Projects/Roadmap.md',
                isDirectory: false,
                modifiedAt: '2026-04-01T00:00:00.000Z',
              },
            ],
          };
        default:
          return { entries: [] };
      }
    });

    window.srgnt = {
      getWorkspaceRoot: vi.fn().mockResolvedValue('/workspace/demo'),
      notesListDir,
      notesReadFile: vi.fn(async (filePath: string) => ({
        content: `content:${filePath}`,
        modifiedAt: '2026-04-01T00:00:00.000Z',
      })),
      notesCreateFile: vi.fn(async (filePath: string) => ({
        path: `/workspace/demo/Notes/${filePath}`,
        createdAt: '2026-04-01T00:00:00.000Z',
      })),
      notesCreateFolder: vi.fn(async (dirPath: string) => ({
        path: `/workspace/demo/Notes/${dirPath}`,
      })),
      notesRename: vi.fn(async (oldPath: string, newName: string) => {
        const parent = oldPath.includes('/') ? oldPath.slice(0, oldPath.lastIndexOf('/')) : '';
        return { newPath: `/workspace/demo/Notes/${parent ? `${parent}/` : ''}${newName}`.replace('/Notes//', '/Notes/') };
      }),
      notesDelete: vi.fn().mockResolvedValue({ deleted: true }),
      notesWriteFile: vi.fn(),
      semanticSearchStatus: vi.fn(async () => ({ state: 'ready', error: null })),
      semanticSearchSearch: vi.fn(async () => ({ results: [] })),
    } as unknown as typeof window.srgnt;
  });

  it('loads the root notes tree and reveals nested files after expanding a folder', async () => {
    await act(async () => {
      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );
    });

    expect(await screen.findByRole('tree', { name: 'Notes file tree' })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Projects/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Inbox\.md/ })).toBeInTheDocument();

    await clickAndFlush(screen.getByRole('treeitem', { name: /Projects/ }));

    expect(await screen.findByRole('treeitem', { name: /Roadmap\.md/ })).toBeInTheDocument();
    expect(window.srgnt.notesListDir).toHaveBeenCalledWith('Projects');
  });

  it('shares selected note state with NotesView using renderer-relative paths', async () => {
    render(
      <NotesProvider>
        <div>
          <NotesSidePanel />
          <NotesView />
        </div>
      </NotesProvider>,
    );

    await clickAndFlush(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

    await waitFor(() => {
      expect(window.srgnt.notesReadFile).toHaveBeenCalledWith('Inbox.md');
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Inbox.md' })).toBeInTheDocument();
    expect(screen.getByText('content:Inbox.md')).toBeInTheDocument();
  });

  it('creates a nested note inside an expanded folder', async () => {
    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    await clickAndFlush(await screen.findByRole('treeitem', { name: /Projects/ }));
    fireEvent.click(await screen.findByTitle('New note in Projects'));

    const input = screen.getByPlaceholderText('note title...');
    fireEvent.change(input, { target: { value: 'Retro' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(window.srgnt.notesCreateFile).toHaveBeenCalledWith('Projects/Retro.md', 'Retro');
    });
  });

  it('uses the shared input styling for inline create controls', async () => {
    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    fireEvent.click(await screen.findByTitle('New note'));

    const input = screen.getByPlaceholderText('note title...');
    expect(input).toHaveClass('input');
    expect(input).toHaveClass('border-srgnt-500');
    expect(input).toHaveClass('placeholder:text-text-tertiary');
  });

  it('uses roving tabindex: only one treeitem has tabIndex=0', async () => {
    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    const tree = await screen.findByRole('tree', { name: 'Notes file tree' });
    const items = tree.querySelectorAll('[role="treeitem"]');
    // Initially none should be focused (focusedPath is null), but all should have tabIndex -1 or 0
    const tabbable = Array.from(items).filter((el) => el.getAttribute('tabIndex') === '0');
    // At most one item should be tabbable at a time (roving tabindex)
    expect(tabbable.length).toBeLessThanOrEqual(1);
  });

  it('moves focus on ArrowDown between visible treeitems', async () => {
    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    const firstItem = await screen.findByRole('treeitem', { name: /Projects/ });
    const secondItem = screen.getByRole('treeitem', { name: /Inbox\.md/ });

    // Focus first item without triggering directory expansion
    await focusAndFlush(firstItem);
    expect(firstItem).toHaveAttribute('tabIndex', '0');

    // ArrowDown should move focus to the second item
    await keyDownAndFlush(firstItem, 'ArrowDown');
    expect(secondItem).toHaveAttribute('tabIndex', '0');
    expect(firstItem).toHaveAttribute('tabIndex', '-1');
  });

  it('moves focus on ArrowUp between visible treeitems', async () => {
    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    const firstItem = await screen.findByRole('treeitem', { name: /Projects/ });
    const secondItem = screen.getByRole('treeitem', { name: /Inbox\.md/ });

    // Focus second item without triggering note selection
    await focusAndFlush(secondItem);
    expect(secondItem).toHaveAttribute('tabIndex', '0');

    // ArrowUp should move focus to the first item
    await keyDownAndFlush(secondItem, 'ArrowUp');
    expect(firstItem).toHaveAttribute('tabIndex', '0');
    expect(secondItem).toHaveAttribute('tabIndex', '-1');
  });

  it('expands folder on ArrowRight and collapses on ArrowLeft', async () => {
    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    const folderItem = await screen.findByRole('treeitem', { name: /Projects/ });
    await focusAndFlush(folderItem);

    // ArrowRight should expand
    await keyDownAndFlush(folderItem, 'ArrowRight');
    const childItem = await screen.findByRole('treeitem', { name: /Roadmap\.md/ });
    expect(childItem).toBeInTheDocument();

    // ArrowLeft should collapse
    await keyDownAndFlush(folderItem, 'ArrowLeft');
    expect(screen.queryByRole('treeitem', { name: /Roadmap\.md/ })).not.toBeInTheDocument();
  });

  it('Home/End jump to first/last visible treeitem', async () => {
    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    const firstItem = await screen.findByRole('treeitem', { name: /Projects/ });
    const secondItem = screen.getByRole('treeitem', { name: /Inbox\.md/ });

    // Focus the second item without triggering note selection
    await focusAndFlush(secondItem);
    expect(secondItem).toHaveAttribute('tabIndex', '0');

    // Home should jump to first item
    await keyDownAndFlush(secondItem, 'Home');
    expect(firstItem).toHaveAttribute('tabIndex', '0');
    expect(secondItem).toHaveAttribute('tabIndex', '-1');

    // End should jump to last item
    await keyDownAndFlush(firstItem, 'End');
    expect(secondItem).toHaveAttribute('tabIndex', '0');
    expect(firstItem).toHaveAttribute('tabIndex', '-1');
  });

  it('toolbar icon-only buttons have aria-labels', async () => {
    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    expect(await screen.findByLabelText('New note')).toBeInTheDocument();
    expect(screen.getByLabelText('New folder')).toBeInTheDocument();
    expect(screen.getByLabelText('Refresh notes')).toBeInTheDocument();
  });

  it('row action buttons have aria-labels on expanded folder items', async () => {
    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    // Expand the Projects folder
    await clickAndFlush(await screen.findByRole('treeitem', { name: /Projects/ }));

    // Check that the row action buttons for the folder have aria-labels
    expect(screen.getByLabelText('New note in Projects')).toBeInTheDocument();
    expect(screen.getByLabelText('New folder in Projects')).toBeInTheDocument();
    expect(screen.getByLabelText('Rename Projects')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete Projects')).toBeInTheDocument();
  });

  describe('Search', () => {

    it('search input triggers searchNotes with 300ms debounce', async () => {
      window.srgnt.notesSearch = vi.fn(async () => ({ results: [] }));

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      const searchInput = screen.getByPlaceholderText('Search notes...');
      await changeAndFlush(searchInput, 'test query');

      // Debounce should prevent immediate IPC call
      expect(window.srgnt.notesSearch).not.toHaveBeenCalled();

      // Advance past the 300ms debounce
      await waitForDebounce();

      expect(window.srgnt.notesSearch).toHaveBeenCalledWith('test query');
    });

    it('search results show loading state while search is in progress', async () => {
      let resolveSearch: () => void;
      window.srgnt.notesSearch = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveSearch = () => resolve({ results: [] });
          }),
      );

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      const searchInput = screen.getByPlaceholderText('Search notes...');
      await changeAndFlush(searchInput, 'test');

      await waitForDebounce();

      expect(screen.getByText('Searching...')).toBeInTheDocument();

      // Resolve the search
      resolveSearch!();

      await waitFor(() => {
        expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
      });
    });

    it('search results render search result entries with title, path, and snippet', async () => {
      window.srgnt.notesSearch = vi.fn(async () => ({
        results: [
          { title: 'Alpha Note', path: 'Notes/Alpha.md', snippet: 'This is the alpha content', score: 0.9 },
          { title: 'Beta Note', path: 'Notes/Beta.md', snippet: 'Beta snippet here', score: 0.8 },
        ],
      }));

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      const searchInput = screen.getByPlaceholderText('Search notes...');
      await changeAndFlush(searchInput, 'alpha');

      await waitForDebounce();

      await waitFor(() => {
        expect(screen.getByText('Alpha Note')).toBeInTheDocument();
      });

      expect(screen.getByText('Notes/Alpha.md')).toBeInTheDocument();
      expect(screen.getByText('This is the alpha content')).toBeInTheDocument();
      expect(screen.getByText('Beta Note')).toBeInTheDocument();
      expect(screen.getByText('Notes/Beta.md')).toBeInTheDocument();
    });

    it('clicking a search result calls selectNote with notes-relative path', async () => {
      window.srgnt.notesSearch = vi.fn(async () => ({
        results: [{ title: 'Alpha', path: 'Notes/Alpha.md', snippet: 'alpha content', score: 0.9 }],
      }));

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      const searchInput = screen.getByPlaceholderText('Search notes...');
      await changeAndFlush(searchInput, 'alpha');

      await waitForDebounce();

      await waitFor(() => {
        expect(screen.getByText('Alpha')).toBeInTheDocument();
      });

      await clickAndFlush(screen.getByText('Alpha'));

      await waitFor(() => {
        expect(window.srgnt.notesReadFile).toHaveBeenCalledWith('Alpha.md');
      });
    });

    it('search shows no results message when search returns empty', async () => {
      window.srgnt.notesSearch = vi.fn(async () => ({ results: [] }));

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      const searchInput = screen.getByPlaceholderText('Search notes...');
      await changeAndFlush(searchInput, 'nonexistent');

      await waitForDebounce();

      expect(screen.getByText((content) => {
        return content.includes('No results for') && content.includes('nonexistent');
      })).toBeInTheDocument();
    });

    it('search shows error message when search fails', async () => {
      window.srgnt.notesSearch = vi.fn(async () => {
        throw new Error('Search failed');
      });

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      const searchInput = screen.getByPlaceholderText('Search notes...');
      await changeAndFlush(searchInput, 'test');

      await waitForDebounce();

      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });

    it('clearing search input calls clearSearch and shows tree view again', async () => {
      window.srgnt.notesSearch = vi.fn(async () => ({
        results: [{ title: 'Alpha', path: 'Notes/Alpha.md', snippet: 'alpha', score: 0.9 }],
      }));

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      const searchInput = screen.getByPlaceholderText('Search notes...');
      await changeAndFlush(searchInput, 'alpha');

      await waitForDebounce();

      await waitFor(() => {
        expect(screen.getByText('Alpha')).toBeInTheDocument();
      });

      // Clear via Escape key
      await keyDownAndFlush(searchInput, 'Escape');

      await waitFor(() => {
        expect(screen.queryByText((content) => {
          return content.includes('No results for') && content.includes('alpha');
        })).not.toBeInTheDocument();
      });

      // Tree should be visible again
      expect(screen.getByRole('tree', { name: 'Notes file tree' })).toBeInTheDocument();
    });
  });

  describe('Semantic Search', () => {
    it('switches to semantic search mode and updates placeholder', async () => {
      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      // Default mode is notes
      expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument();

      // Switch to semantic mode
      await clickAndFlush(screen.getByTestId('semantic-search-mode'));

      expect(screen.getByPlaceholderText('Search semantically...')).toBeInTheDocument();
    });

    it('shows disabled message when semantic search is not enabled for workspace', async () => {
      (window.srgnt.semanticSearchStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ state: 'disabled', error: null });

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      // Switch to semantic mode
      await clickAndFlush(screen.getByTestId('semantic-search-mode'));

      const searchInput = screen.getByPlaceholderText('Search semantically...');
      await changeAndFlush(searchInput, 'test');

      // Wait for debounce + async status check
      await waitForDebounce(400);

      await waitFor(() => {
        expect(screen.getByText('Enable semantic search for this workspace first.')).toBeInTheDocument();
      });
    });

    it('shows indexing message when semantic search is still indexing', async () => {
      (window.srgnt.semanticSearchStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ state: 'indexing', error: null });

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      // Switch to semantic mode
      await clickAndFlush(screen.getByTestId('semantic-search-mode'));

      const searchInput = screen.getByPlaceholderText('Search semantically...');
      await changeAndFlush(searchInput, 'test');

      // Wait for debounce + async status check
      await waitForDebounce(400);

      await waitFor(() => {
        expect(screen.getByText('Indexing workspace...')).toBeInTheDocument();
      });
    });

    it('shows search error from semantic search status', async () => {
      (window.srgnt.semanticSearchStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ state: 'error', error: 'Index corrupted' });

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      // Switch to semantic mode
      await clickAndFlush(screen.getByTestId('semantic-search-mode'));

      const searchInput = screen.getByPlaceholderText('Search semantically...');
      await changeAndFlush(searchInput, 'test');

      // Wait for debounce + async status check
      await waitForDebounce(400);

      await waitFor(() => {
        expect(screen.getByText('Index corrupted')).toBeInTheDocument();
      });
    });

    it('renders semantic search results', async () => {
      (window.srgnt.semanticSearchSearch as ReturnType<typeof vi.fn>).mockResolvedValue({
        results: [
          { title: 'Semantic Result', workspaceRelativePath: 'Notes/Semantic.md', snippet: 'A **semantic** match', score: 0.95 },
        ],
      });

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      // Switch to semantic mode
      await clickAndFlush(screen.getByTestId('semantic-search-mode'));

      const searchInput = screen.getByPlaceholderText('Search semantically...');
      await changeAndFlush(searchInput, 'semantic');

      // Wait for debounce + search
      await waitForDebounce(400);

      await waitFor(() => {
        expect(screen.getByText('Semantic Result')).toBeInTheDocument();
      });
      expect(screen.getByText('Notes/Semantic.md')).toBeInTheDocument();
      expect(screen.getByText('semantic')).toContainHTML('mark');
    });

    it('shows no results message when semantic search returns empty', async () => {
      (window.srgnt.semanticSearchSearch as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [] });

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      // Switch to semantic mode
      await clickAndFlush(screen.getByTestId('semantic-search-mode'));

      const searchInput = screen.getByPlaceholderText('Search semantically...');
      await changeAndFlush(searchInput, 'nothing');

      // Wait for debounce + search
      await waitForDebounce(400);

      await waitFor(() => {
        expect(screen.getByText((content) => {
          return content.includes('No results for') && content.includes('nothing');
        })).toBeInTheDocument();
      });
    });

    it('handles semantic search API error gracefully', async () => {
      (window.srgnt.semanticSearchSearch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Search service unavailable'));

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      // Switch to semantic mode
      await clickAndFlush(screen.getByTestId('semantic-search-mode'));

      const searchInput = screen.getByPlaceholderText('Search semantically...');
      await changeAndFlush(searchInput, 'test');

      // Wait for debounce + search
      await waitForDebounce(400);

      await waitFor(() => {
        expect(screen.getByText('Search service unavailable')).toBeInTheDocument();
      });
    });

    it('clears semantic search state when switching back to notes mode', async () => {
      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      // Switch to semantic mode
      await clickAndFlush(screen.getByTestId('semantic-search-mode'));

      const searchInput = screen.getByPlaceholderText('Search semantically...');
      await changeAndFlush(searchInput, 'test');

      // Wait for debounce
      await waitForDebounce(400);

      // Switch back to notes mode
      await clickAndFlush(screen.getByTestId('notes-search-mode'));

      // Search input should be cleared and placeholder updated
      expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument();
      expect((screen.getByPlaceholderText('Search notes...') as HTMLInputElement).value).toBe('');

      // Tree should be visible again
      expect(screen.getByRole('tree', { name: 'Notes file tree' })).toBeInTheDocument();
    });

    it('clicking semantic search result calls selectNote with notes-relative path', async () => {
      (window.srgnt.semanticSearchSearch as ReturnType<typeof vi.fn>).mockResolvedValue({
        results: [
          { title: 'Found Note', workspaceRelativePath: 'Notes/Found.md', snippet: 'found content', score: 0.9 },
        ],
      });

      render(
        <NotesProvider>
          <div>
            <NotesSidePanel />
            <NotesView />
          </div>
        </NotesProvider>,
      );

      // Switch to semantic mode
      await clickAndFlush(screen.getByTestId('semantic-search-mode'));

      const searchInput = screen.getByPlaceholderText('Search semantically...');
      await changeAndFlush(searchInput, 'found');

      // Wait for debounce + search
      await waitForDebounce(400);

      await waitFor(() => {
        expect(screen.getByText('Found Note')).toBeInTheDocument();
      });

      await clickAndFlush(screen.getByText('Found Note'));

      await waitFor(() => {
        expect(window.srgnt.notesReadFile).toHaveBeenCalledWith('Found.md');
      });
    });

    it('shows uninitialized message when semantic search status is uninitialized', async () => {
      (window.srgnt.semanticSearchStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ state: 'uninitialized', error: null });

      render(
        <NotesProvider>
          <NotesSidePanel />
        </NotesProvider>,
      );

      // Switch to semantic mode
      await clickAndFlush(screen.getByTestId('semantic-search-mode'));

      const searchInput = screen.getByPlaceholderText('Search semantically...');
      await changeAndFlush(searchInput, 'test');

      // Wait for debounce + async status check
      await waitForDebounce(400);

      await waitFor(() => {
        expect(screen.getByText('Enable semantic search for this workspace first.')).toBeInTheDocument();
      });
    });
  });
});
