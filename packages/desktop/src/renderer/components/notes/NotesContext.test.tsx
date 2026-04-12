import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NotesProvider, useNotes, type SearchResultEntry } from './NotesContext.js';

async function waitForBootstrap(result: { current: ReturnType<typeof useNotes> }): Promise<void> {
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
}

describe('NotesContext', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

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
              {
                name: 'Projects',
                path: '/workspace/demo/Notes/Projects',
                isDirectory: true,
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
      notesReadFile: vi.fn(async (filePath: string) => ({
        content: `content:${filePath}`,
        modifiedAt: '2026-04-01T00:00:00.000Z',
      })),
      notesCreateFile: vi.fn(async (filePath: string, _title: string) => ({
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
      notesWriteFile: vi.fn(async (filePath: string, content: string) => ({
        path: `/workspace/demo/Notes/${filePath}`,
        modifiedAt: '2026-04-01T00:00:01.000Z',
        content,
      })),
      notesSearch: vi.fn().mockResolvedValue({
        results: [
          {
            title: 'Test Note',
            path: 'Test.md',
            snippet: 'Test **snippet**',
            score: 10,
          },
        ],
      }),
      notesResolveWikilink: vi.fn(),
      notesListWorkspaceMarkdown: vi.fn(),
      windowMinimize: vi.fn(),
      windowMaximize: vi.fn(),
      windowClose: vi.fn(),
      windowIsMaximized: vi.fn(),
      onWindowMaximizedChange: vi.fn(() => () => {}),
      checkForUpdates: vi.fn(),
      platform: 'linux',
    } as unknown as typeof window.srgnt;
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  describe('Context provider rendering', () => {
    it('renders children correctly', () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });

      expect(result.current.rootEntries).toBeDefined();
      expect(result.current.expandedDirs).toBeDefined();
      expect(result.current.selectedPath).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
      expect(result.current.error).toBeDefined();
    });

    it('initial state has correct default values', () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });

      expect(result.current.rootEntries).toEqual([]);
      expect(result.current.selectedPath).toBeNull();
      expect(result.current.expandedDirs).toBeInstanceOf(Set);
      expect(result.current.expandedDirs.size).toBe(0);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.activeContent).toBeNull();
      expect(result.current.activeModifiedAt).toBeNull();
      expect(result.current.activeContentLoading).toBe(false);
      expect(result.current.searchQuery).toBe('');
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.searchLoading).toBe(false);
      expect(result.current.searchError).toBeNull();
    });
  });

  describe('useNotes() hook errors', () => {
    it('throws when used outside NotesProvider', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useNotes());
      }).toThrow('useNotes must be used within a NotesProvider');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('File selection state', () => {
    it('selectNote loads and displays note content', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Inbox.md');
      });

      expect(result.current.selectedPath).toBe('Inbox.md');
      expect(result.current.activeContent).toBe('content:Inbox.md');
      expect(result.current.activeModifiedAt).toBe('2026-04-01T00:00:00.000Z');
      expect(window.srgnt.notesReadFile).toHaveBeenCalledWith('Inbox.md');
    });

    it('selectNote sets loading state correctly', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      act(() => {
        result.current.selectNote('Inbox.md');
      });

      expect(result.current.activeContentLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.activeContentLoading).toBe(false);
      });
    });

    it('selectNote sets error on read failure', async () => {
      window.srgnt.notesReadFile = vi.fn().mockRejectedValue(new Error('File not found')) as typeof window.srgnt.notesReadFile;

      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('NonExistent.md');
      });

      expect(result.current.error).toBe('File not found');
      expect(result.current.activeContent).toBeNull();
    });

    it('clearSelection resets note state', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Inbox.md');
      });

      expect(result.current.selectedPath).toBe('Inbox.md');
      expect(result.current.activeContent).not.toBeNull();

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedPath).toBeNull();
      expect(result.current.activeContent).toBeNull();
      expect(result.current.activeModifiedAt).toBeNull();
    });
  });

  describe('File tree state', () => {
    it('toggleDir expands a collapsed folder', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      act(() => {
        result.current.toggleDir('Projects');
      });

      expect(result.current.expandedDirs.has('Projects')).toBe(true);
      expect(window.srgnt.notesListDir).toHaveBeenCalledWith('Projects');
    });

    it('toggleDir collapses an expanded folder', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      act(() => {
        result.current.toggleDir('Projects');
      });

      expect(result.current.expandedDirs.has('Projects')).toBe(true);

      act(() => {
        result.current.toggleDir('Projects');
      });

      expect(result.current.expandedDirs.has('Projects')).toBe(false);
    });

    it('toggleDir normalizes paths correctly', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      act(() => {
        result.current.toggleDir('./Projects/');
      });

      expect(result.current.expandedDirs.has('Projects')).toBe(true);
    });

    it('getChildEntries returns entries for a directory', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const rootEntries = result.current.getChildEntries('');
      expect(rootEntries).toHaveLength(2);
      expect(rootEntries[0].name).toBe('Inbox.md');
      expect(rootEntries[1].name).toBe('Projects');
    });

    it('getChildEntries returns empty array for non-existent directory', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const entries = result.current.getChildEntries('NonExistent');
      expect(entries).toEqual([]);
    });

    it('toggleDir loads directory entries on expand', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      act(() => {
        result.current.toggleDir('Projects');
      });

      await waitFor(() => {
        expect(result.current.getChildEntries('Projects').length).toBeGreaterThan(0);
      });

      expect(result.current.getChildEntries('Projects')[0].name).toBe('Roadmap.md');
    });
  });

  describe('CRUD operations - Create', () => {
    it('createNote creates a new note file', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const newPath = await act(async () => {
        return await result.current.createNote('', 'New Note');
      });

      expect(newPath).toBe('New Note.md');
      expect(window.srgnt.notesCreateFile).toHaveBeenCalledWith('New Note.md', 'New Note');
    });

    it('createNote appends .md extension if not present', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.createNote('', 'Note');
      });

      expect(window.srgnt.notesCreateFile).toHaveBeenCalledWith('Note.md', 'Note');
    });

    it('createNote creates note in nested folder', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.createNote('Projects', 'Nested Note');
      });

      expect(window.srgnt.notesCreateFile).toHaveBeenCalledWith('Projects/Nested Note.md', 'Nested Note');
    });

    it('createNote returns null for empty title', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const newPath = await act(async () => {
        return await result.current.createNote('', '   ');
      });

      expect(newPath).toBeNull();
      expect(window.srgnt.notesCreateFile).not.toHaveBeenCalled();
    });

    it('createNote expands parent folder and selects new note', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.createNote('Projects', 'New Note');
      });

      await waitFor(() => {
        expect(result.current.selectedPath).toBe('Projects/New Note.md');
      });
    });

    it('createNote sets error on failure', async () => {
      window.srgnt.notesCreateFile = vi.fn().mockRejectedValue(new Error('Permission denied')) as typeof window.srgnt.notesCreateFile;

      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const newPath = await act(async () => {
        return await result.current.createNote('', 'New Note');
      });

      expect(newPath).toBeNull();
      expect(result.current.error).toBe('Permission denied');
    });

    it('createFolder creates a new folder', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const newPath = await act(async () => {
        return await result.current.createFolder('NewFolder');
      });

      expect(newPath).toBe('NewFolder');
      expect(window.srgnt.notesCreateFolder).toHaveBeenCalledWith('NewFolder');
    });

    it('createFolder returns null for empty path', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const newPath = await act(async () => {
        return await result.current.createFolder('');
      });

      expect(newPath).toBeNull();
      expect(window.srgnt.notesCreateFolder).not.toHaveBeenCalled();
    });

    it('createFolder adds parent and new folder to expandedDirs before refresh', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      // Spy on setExpandedDirs behavior via the returned path
      const newPath = await act(async () => {
        return await result.current.createFolder('Projects/NewFolder');
      });

      expect(newPath).toBe('Projects/NewFolder');
      expect(window.srgnt.notesCreateFolder).toHaveBeenCalledWith('Projects/NewFolder');
    });
  });

  describe('CRUD operations - Delete', () => {
    it('deleteEntry deletes a note file', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Inbox.md');
      });

      const deleted = await act(async () => {
        return await result.current.deleteEntry('Inbox.md', false);
      });

      expect(deleted).toBe(true);
      expect(window.srgnt.notesDelete).toHaveBeenCalledWith('Inbox.md', false);
      expect(result.current.selectedPath).toBeNull();
    });

    it('deleteEntry deletes a folder', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      act(() => {
        result.current.toggleDir('Projects');
      });

      const deleted = await act(async () => {
        return await result.current.deleteEntry('Projects', true);
      });

      expect(deleted).toBe(true);
      expect(window.srgnt.notesDelete).toHaveBeenCalledWith('Projects', true);
    });

    it('deleteEntry clears selection if deleting selected file', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Inbox.md');
      });

      expect(result.current.selectedPath).toBe('Inbox.md');

      await act(async () => {
        await result.current.deleteEntry('Inbox.md', false);
      });

      expect(result.current.selectedPath).toBeNull();
    });

    it('deleteEntry clears selection if deleting ancestor folder', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Projects/Roadmap.md');
      });

      expect(result.current.selectedPath).toBe('Projects/Roadmap.md');

      await act(async () => {
        await result.current.deleteEntry('Projects', true);
      });

      expect(result.current.selectedPath).toBeNull();
    });

    it('deleteEntry returns false if server reports not deleted', async () => {
      window.srgnt.notesDelete = vi.fn().mockResolvedValue({ deleted: false }) as typeof window.srgnt.notesDelete;

      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const deleted = await act(async () => {
        return await result.current.deleteEntry('Inbox.md', false);
      });

      expect(deleted).toBe(false);
    });

    it('deleteEntry sets error on failure', async () => {
      window.srgnt.notesDelete = vi.fn().mockRejectedValue(new Error('Delete failed')) as typeof window.srgnt.notesDelete;

      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const deleted = await act(async () => {
        return await result.current.deleteEntry('Inbox.md', false);
      });

      expect(deleted).toBe(false);
      expect(result.current.error).toBe('Delete failed');
    });

    it('deleteEntry clears active content when deleting selected note', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Inbox.md');
      });

      expect(result.current.activeContent).not.toBeNull();

      await act(async () => {
        await result.current.deleteEntry('Inbox.md', false);
      });

      expect(result.current.selectedPath).toBeNull();
      expect(result.current.activeContent).toBeNull();
      expect(result.current.activeModifiedAt).toBeNull();
    });
  });

  describe('CRUD operations - Rename', () => {
    it('renameEntry renames a note file', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const newPath = await act(async () => {
        return await result.current.renameEntry('Inbox.md', 'NewName.md');
      });

      expect(newPath).toBe('NewName.md');
      expect(window.srgnt.notesRename).toHaveBeenCalledWith('Inbox.md', 'NewName.md');
    });

    it('renameEntry updates selectedPath if selected file is renamed', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Inbox.md');
      });

      expect(result.current.selectedPath).toBe('Inbox.md');

      await act(async () => {
        await result.current.renameEntry('Inbox.md', 'NewName.md');
      });

      expect(result.current.selectedPath).toBe('NewName.md');
    });

    it('renameEntry updates selectedPath for descendants of renamed folder', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Projects/Roadmap.md');
      });

      expect(result.current.selectedPath).toBe('Projects/Roadmap.md');

      await act(async () => {
        await result.current.renameEntry('Projects', 'NewFolder');
      });

      expect(result.current.selectedPath).toBe('NewFolder/Roadmap.md');
    });

    it('renameEntry sets error on failure', async () => {
      window.srgnt.notesRename = vi.fn().mockRejectedValue(new Error('Rename failed')) as typeof window.srgnt.notesRename;

      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const newPath = await act(async () => {
        return await result.current.renameEntry('Inbox.md', 'NewName.md');
      });

      expect(newPath).toBeNull();
      expect(result.current.error).toBe('Rename failed');
    });
  });

  describe('Write active content', () => {
    it('writeActiveContent saves note content', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Inbox.md');
      });

      await act(async () => {
        await result.current.writeActiveContent('New content');
      });

      expect(window.srgnt.notesWriteFile).toHaveBeenCalledWith('Inbox.md', 'New content');
      expect(result.current.activeContent).toBe('New content');
    });

    it('writeActiveContent throws when no note is selected', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await expect(async () => {
        await result.current.writeActiveContent('Content');
      }).rejects.toThrow('No active note selected');
    });

    it('writeActiveContent sets error and throws on failure', async () => {
      window.srgnt.notesWriteFile = vi.fn().mockRejectedValue(new Error('Save failed')) as typeof window.srgnt.notesWriteFile;

      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Inbox.md');
      });

      await act(async () => {
        try {
          await result.current.writeActiveContent('Content');
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Save failed');
    });

    it('writeActiveContent updates activeModifiedAt on success', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Inbox.md');
      });

      await act(async () => {
        await result.current.writeActiveContent('New content');
      });

      expect(result.current.activeModifiedAt).toBe('2026-04-01T00:00:01.000Z');
    });
  });

  describe('Search state', () => {
    it('searchNotes updates searchQuery immediately', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      act(() => {
        result.current.searchNotes('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });

    it('searchNotes sets loading state and debounces IPC call', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      vi.useFakeTimers();

      act(() => {
        result.current.searchNotes('test query');
      });

      expect(result.current.searchLoading).toBe(true);
      expect(window.srgnt.notesSearch).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(window.srgnt.notesSearch).toHaveBeenCalledWith('test query');

      vi.useRealTimers();
    });

    it('searchNotes populates searchResults after debounce resolves', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      vi.useFakeTimers();

      act(() => {
        result.current.searchNotes('test');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(result.current.searchResults).toHaveLength(1);
      expect(result.current.searchResults[0].title).toBe('Test Note');
      expect(result.current.searchLoading).toBe(false);

      vi.useRealTimers();
    });

    it('searchNotes synchronously clears results for empty/whitespace query', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      act(() => {
        result.current.searchNotes('   ');
      });

      expect(result.current.searchResults).toEqual([]);
      expect(result.current.searchLoading).toBe(false);
      expect(window.srgnt.notesSearch).not.toHaveBeenCalled();
    });

    it('searchNotes cancels previous debounce when called again', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      vi.useFakeTimers();

      // First search
      act(() => {
        result.current.searchNotes('alpha');
      });

      // Second search before debounce fires
      act(() => {
        result.current.searchNotes('beta');
      });

      // Advance past the first debounce window
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // Only the second query should have been sent
      expect(window.srgnt.notesSearch).toHaveBeenCalledTimes(1);
      expect(window.srgnt.notesSearch).toHaveBeenCalledWith('beta');

      vi.useRealTimers();
    });

    it('searchNotes sets error on IPC failure', async () => {
      window.srgnt.notesSearch = vi.fn().mockRejectedValue(new Error('Search failed')) as typeof window.srgnt.notesSearch;

      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      vi.useFakeTimers();

      act(() => {
        result.current.searchNotes('test');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(result.current.searchError).toBe('Search failed');
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.searchLoading).toBe(false);

      vi.useRealTimers();
    });

    it('clearSearch resets all search state', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      act(() => {
        result.current.searchNotes('test');
      });

      expect(result.current.searchQuery).toBe('test');

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.searchLoading).toBe(false);
      expect(result.current.searchError).toBeNull();
    });

    it('searchNotes ignores stale responses from superseded searches', async () => {
      let callCount = 0;
      let resolveSearchFirst: ((value: { results: SearchResultEntry[] }) => void) | undefined;
      let resolveSearchSecond: ((value: { results: SearchResultEntry[] }) => void) | undefined;

      window.srgnt.notesSearch = vi.fn(
        () => new Promise((resolve) => {
          callCount++;
          if (callCount === 1) {
            resolveSearchFirst = resolve;
          } else {
            resolveSearchSecond = resolve;
          }
        }),
      ) as typeof window.srgnt.notesSearch;

      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      vi.useFakeTimers();

      // Start first search and advance to fire the debounce
      act(() => {
        result.current.searchNotes('first');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // First search IPC has fired but promise is pending. Now start second search
      // (which clears the first debounce timeout, but the first IPC is already in-flight)
      act(() => {
        result.current.searchNotes('second');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // Resolve the FIRST search with stale data - should be ignored because requestId changed
      resolveSearchFirst?.({
        results: [{ title: 'Stale Result', path: 'Stale.md', snippet: 'stale', score: 1 }],
      });

      // Resolve the SECOND search with fresh data - should be accepted
      resolveSearchSecond?.({
        results: [{ title: 'Fresh Result', path: 'Fresh.md', snippet: 'fresh', score: 5 }],
      });

      // Flush microtasks
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Only the fresh result should appear; stale result should have been ignored
      expect(result.current.searchResults).toEqual([
        expect.objectContaining({ title: 'Fresh Result' }),
      ]);
      expect(result.current.searchResults).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ title: 'Stale Result' })]),
      );

      vi.useRealTimers();
    });
  });

  describe('Refresh functionality', () => {
    it('refresh loads root directory entries', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.rootEntries).toHaveLength(2);
      expect(window.srgnt.notesListDir).toHaveBeenCalledWith('');
    });

    it('refresh loads a specific directory when dirPath provided', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.refresh('Projects');
      });

      expect(window.srgnt.notesListDir).toHaveBeenCalledWith('Projects');
    });

    it('refresh clears selected file if it no longer exists on disk', async () => {
      window.srgnt.notesListDir = vi.fn(async (dirPath: string) => {
        if (dirPath === '') {
          return {
            entries: [
              {
                name: 'Other.md',
                path: '/workspace/demo/Notes/Other.md',
                isDirectory: false,
                modifiedAt: '2026-04-01T00:00:00.000Z',
              },
            ],
          };
        }
        return { entries: [] };
      }) as typeof window.srgnt.notesListDir;

      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.selectNote('Inbox.md');
      });

      expect(result.current.selectedPath).toBe('Inbox.md');

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.selectedPath).toBeNull();
    });

    it('refresh sets error on failure', async () => {
      window.srgnt.notesListDir = vi.fn().mockRejectedValue(new Error('Load failed')) as typeof window.srgnt.notesListDir;

      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('Load failed');
    });
  });

  describe('Edge cases', () => {
    it('handles rapid selectNote calls - only last result is displayed', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      act(() => {
        result.current.selectNote('First.md');
        result.current.selectNote('Second.md');
        result.current.selectNote('Third.md');
      });

      await waitFor(() => {
        expect(result.current.selectedPath).toBe('Third.md');
      });
    });

    it('handles toggling non-existent folder gracefully without throwing', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      expect(() => {
        act(() => {
          result.current.toggleDir('NonExistent/Folder');
        });
      }).not.toThrow();

      expect(result.current.expandedDirs.has('NonExistent/Folder')).toBe(true);
    });

    it('handles normalizing Windows-style backslash paths', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      act(() => {
        result.current.toggleDir('Projects\\SubFolder');
      });

      expect(result.current.expandedDirs.has('Projects/SubFolder')).toBe(true);
    });

    it('handles creating note in empty directory path', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const newPath = await act(async () => {
        return await result.current.createNote('', 'Note');
      });

      expect(newPath).toBe('Note.md');
    });

    it('handles rename failure gracefully', async () => {
      window.srgnt.notesRename = vi.fn().mockRejectedValue(new Error('Invalid name')) as typeof window.srgnt.notesRename;

      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      const newPath = await act(async () => {
        return await result.current.renameEntry('Inbox.md', '');
      });

      expect(newPath).toBeNull();
      expect(result.current.error).toBe('Invalid name');
    });

    it('handles clearing selection when no note is selected', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      expect(() => {
        act(() => {
          result.current.clearSelection();
        });
      }).not.toThrow();

      expect(result.current.selectedPath).toBeNull();
      expect(result.current.activeContent).toBeNull();
    });

    it('handles clearing search when search is already empty', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      expect(() => {
        act(() => {
          result.current.clearSearch();
        });
      }).not.toThrow();

      expect(result.current.searchQuery).toBe('');
      expect(result.current.searchResults).toEqual([]);
    });
  });

  describe('Lifecycle and cleanup', () => {
    it('cleans up search debounce timeout on unmount', async () => {
      const { result, unmount } = renderHook(() => useNotes(), { wrapper: NotesProvider });
      await waitForBootstrap(result);

      vi.useFakeTimers();

      act(() => {
        result.current.searchNotes('test');
      });

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    });

    it('cancels async bootstrap on unmount without errors', async () => {
      const { unmount } = renderHook(() => useNotes(), { wrapper: NotesProvider });

      // Unmount immediately before bootstrap completes
      unmount();

      // Should not cause any errors
      await Promise.resolve();
    });
  });
});
