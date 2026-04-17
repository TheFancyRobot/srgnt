import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotesProvider } from '../notes/NotesContext.js';
import { NotesView } from '../NotesView.js';
import { NotesSidePanel } from './NotesSidePanel.js';

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
    } as unknown as typeof window.srgnt;
  });

  it('loads the root notes tree and reveals nested files after expanding a folder', async () => {
    render(
      <NotesProvider>
        <NotesSidePanel />
      </NotesProvider>,
    );

    expect(await screen.findByRole('tree', { name: 'Notes file tree' })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Projects/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Inbox\.md/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: /Projects/ }));

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

    fireEvent.click(await screen.findByRole('treeitem', { name: /Inbox\.md/ }));

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

    fireEvent.click(await screen.findByRole('treeitem', { name: /Projects/ }));
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

    // Click first item to give it focus
    fireEvent.click(firstItem);
    expect(firstItem).toHaveAttribute('tabIndex', '0');

    // ArrowDown should move focus to the second item
    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
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

    // Click second item to give it focus
    fireEvent.click(secondItem);
    expect(secondItem).toHaveAttribute('tabIndex', '0');

    // ArrowUp should move focus to the first item
    fireEvent.keyDown(secondItem, { key: 'ArrowUp' });
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
    fireEvent.click(folderItem);

    // ArrowRight should expand
    fireEvent.keyDown(folderItem, { key: 'ArrowRight' });
    const childItem = await screen.findByRole('treeitem', { name: /Roadmap\.md/ });
    expect(childItem).toBeInTheDocument();

    // ArrowLeft should collapse
    fireEvent.keyDown(folderItem, { key: 'ArrowLeft' });
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

    // Click the second item to focus it
    fireEvent.click(secondItem);
    expect(secondItem).toHaveAttribute('tabIndex', '0');

    // Home should jump to first item
    fireEvent.keyDown(secondItem, { key: 'Home' });
    expect(firstItem).toHaveAttribute('tabIndex', '0');
    expect(secondItem).toHaveAttribute('tabIndex', '-1');

    // End should jump to last item
    fireEvent.keyDown(firstItem, { key: 'End' });
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
    fireEvent.click(await screen.findByRole('treeitem', { name: /Projects/ }));

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
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      // Debounce should prevent immediate IPC call
      expect(window.srgnt.notesSearch).not.toHaveBeenCalled();

      // Advance past the 300ms debounce
      await new Promise((resolve) => setTimeout(resolve, 350));

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
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await new Promise((resolve) => setTimeout(resolve, 350));

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
      fireEvent.change(searchInput, { target: { value: 'alpha' } });

      await new Promise((resolve) => setTimeout(resolve, 350));

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
      fireEvent.change(searchInput, { target: { value: 'alpha' } });

      await new Promise((resolve) => setTimeout(resolve, 350));

      await waitFor(() => {
        expect(screen.getByText('Alpha')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Alpha'));

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
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await new Promise((resolve) => setTimeout(resolve, 350));


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
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await new Promise((resolve) => setTimeout(resolve, 350));

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
      fireEvent.change(searchInput, { target: { value: 'alpha' } });

      await new Promise((resolve) => setTimeout(resolve, 350));

      await waitFor(() => {
        expect(screen.getByText('Alpha')).toBeInTheDocument();
      });

      // Clear via Escape key
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText((content) => {
          return content.includes('No results for') && content.includes('alpha');
        })).not.toBeInTheDocument();
      });

      // Tree should be visible again
      expect(screen.getByRole('tree', { name: 'Notes file tree' })).toBeInTheDocument();
    });
  });
});
