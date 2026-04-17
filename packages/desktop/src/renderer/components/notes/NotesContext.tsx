import React from 'react';

export interface NoteEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  modifiedAt: string;
}

interface DirectoryEntries {
  [dirPath: string]: NoteEntry[];
}

export interface SearchResultEntry {
  title: string;
  path: string;
  snippet: string;
  score: number;
}

export interface NotesState {
  rootEntries: NoteEntry[];
  selectedPath: string | null;
  expandedDirs: Set<string>;
  isLoading: boolean;
  error: string | null;
  activeContent: string | null;
  activeModifiedAt: string | null;
  activeContentLoading: boolean;
  searchQuery: string;
  searchResults: SearchResultEntry[];
  searchLoading: boolean;
  searchError: string | null;
}

export interface NotesActions {
  getChildEntries: (dirPath: string) => NoteEntry[];
  refresh: (dirPath?: string) => Promise<void>;
  selectNote: (path: string) => Promise<void>;
  toggleDir: (path: string) => void;
  createNote: (dirPath: string, title: string) => Promise<string | null>;
  createFolder: (dirPath: string) => Promise<string | null>;
  deleteEntry: (path: string, isDirectory: boolean) => Promise<boolean>;
  renameEntry: (oldPath: string, newName: string) => Promise<string | null>;
  writeActiveContent: (content: string) => Promise<void>;
  clearSelection: () => void;
  searchNotes: (query: string) => void;
  clearSearch: () => void;
}

export type NotesContextValue = NotesState & NotesActions;

const NotesContext = React.createContext<NotesContextValue | null>(null);

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+|\/+$/g, '');
}

function toNotesRoot(workspaceRoot: string): string {
  return normalizePath(`${workspaceRoot}/Notes`);
}

function toRelativeNotesPath(pathValue: string, notesRoot: string): string {
  const normalizedPath = normalizePath(pathValue);
  if (!notesRoot) {
    return normalizedPath;
  }

  if (normalizedPath === notesRoot) {
    return '';
  }

  const rootPrefix = `${notesRoot}/`;
  return normalizedPath.startsWith(rootPrefix)
    ? normalizedPath.slice(rootPrefix.length)
    : normalizedPath;
}

function getParentPath(pathValue: string): string {
  const normalizedPath = normalizePath(pathValue);
  const lastSlash = normalizedPath.lastIndexOf('/');
  return lastSlash === -1 ? '' : normalizedPath.slice(0, lastSlash);
}

function joinNotesPath(parentPath: string, name: string): string {
  return parentPath ? `${parentPath}/${name}` : name;
}

function renamePath(pathValue: string, oldPath: string, newPath: string): string {
  if (pathValue === oldPath) {
    return newPath;
  }

  return pathValue.startsWith(`${oldPath}/`)
    ? `${newPath}${pathValue.slice(oldPath.length)}`
    : pathValue;
}

function renameDirectoryEntries(
  entriesByDir: DirectoryEntries,
  oldPath: string,
  newPath: string,
): DirectoryEntries {
  const nextEntries: DirectoryEntries = {};

  for (const [dirPath, entries] of Object.entries(entriesByDir)) {
    const nextDirPath = renamePath(dirPath, oldPath, newPath);
    nextEntries[nextDirPath] = entries.map((entry) => ({
      ...entry,
      path: renamePath(entry.path, oldPath, newPath),
    }));
  }

  return nextEntries;
}

function renameExpandedDirs(expandedDirs: Set<string>, oldPath: string, newPath: string): Set<string> {
  return new Set(Array.from(expandedDirs, (dirPath) => renamePath(dirPath, oldPath, newPath)));
}

function isSameOrDescendant(targetPath: string, ancestorPath: string): boolean {
  return targetPath === ancestorPath || targetPath.startsWith(`${ancestorPath}/`);
}

export function NotesProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [entriesByDir, setEntriesByDir] = React.useState<DirectoryEntries>({ '': [] });
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = React.useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeContent, setActiveContent] = React.useState<string | null>(null);
  const [activeModifiedAt, setActiveModifiedAt] = React.useState<string | null>(null);
  const [activeContentLoading, setActiveContentLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<SearchResultEntry[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = React.useRef(0);
  const notesRootRef = React.useRef('');
  const expandedDirsRef = React.useRef(expandedDirs);
  const selectedPathRef = React.useRef(selectedPath);
  const readRequestIdRef = React.useRef(0);

  React.useEffect(() => {
    expandedDirsRef.current = expandedDirs;
  }, [expandedDirs]);

  React.useEffect(() => {
    selectedPathRef.current = selectedPath;
  }, [selectedPath]);

  const loadDirectory = React.useCallback(async (dirPath: string): Promise<NoteEntry[]> => {
    const response = await window.srgnt.notesListDir(dirPath);
    const normalizedEntries = response.entries.map((entry) => ({
      ...entry,
      path: toRelativeNotesPath(entry.path, notesRootRef.current),
    }));

    setEntriesByDir((prev) => ({
      ...prev,
      [dirPath]: normalizedEntries,
    }));

    return normalizedEntries;
  }, []);

  const clearActiveSelection = React.useCallback(() => {
    setSelectedPath(null);
    setActiveContent(null);
    setActiveModifiedAt(null);
    setActiveContentLoading(false);
  }, []);

  const refresh = React.useCallback(async (dirPath?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (dirPath && dirPath !== '') {
        await loadDirectory(dirPath);
        return;
      }

      const directoriesToLoad = new Set<string>(['']);
      for (const expandedDir of expandedDirsRef.current) {
        directoriesToLoad.add(expandedDir);
      }

      const currentSelectedPath = selectedPathRef.current;
      if (currentSelectedPath) {
        directoriesToLoad.add(getParentPath(currentSelectedPath));
      }

      const nextEntriesByDir: DirectoryEntries = {};
      for (const directoryPath of Array.from(directoriesToLoad).sort((a, b) => a.length - b.length)) {
        const response = await window.srgnt.notesListDir(directoryPath);
        nextEntriesByDir[directoryPath] = response.entries.map((entry) => ({
          ...entry,
          path: toRelativeNotesPath(entry.path, notesRootRef.current),
        }));
      }

      setEntriesByDir(nextEntriesByDir);

      const nextExpandedDirs = new Set(
        Array.from(expandedDirsRef.current).filter((expandedDir) => expandedDir in nextEntriesByDir),
      );
      setExpandedDirs(nextExpandedDirs);

      if (currentSelectedPath) {
        const selectedParentPath = getParentPath(currentSelectedPath);
        const selectedStillExists = (nextEntriesByDir[selectedParentPath] ?? []).some(
          (entry) => entry.path === currentSelectedPath,
        );

        if (!selectedStillExists) {
          clearActiveSelection();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [clearActiveSelection, loadDirectory]);

  const selectNote = React.useCallback(async (path: string) => {
    const requestId = ++readRequestIdRef.current;
    setError(null);
    setSelectedPath(path);
    setActiveContentLoading(true);

    try {
      const response = await window.srgnt.notesReadFile(path);
      if (readRequestIdRef.current !== requestId) {
        return;
      }

      setActiveContent(response.content);
      setActiveModifiedAt(response.modifiedAt);
    } catch (err) {
      if (readRequestIdRef.current !== requestId) {
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to read note');
      setActiveContent(null);
      setActiveModifiedAt(null);
    } finally {
      if (readRequestIdRef.current === requestId) {
        setActiveContentLoading(false);
      }
    }
  }, []);

  const toggleDir = React.useCallback((path: string) => {
    const normalizedPath = normalizePath(path);

    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedPath)) {
        next.delete(normalizedPath);
      } else {
        next.add(normalizedPath);
        if (!(normalizedPath in entriesByDir)) {
          void loadDirectory(normalizedPath).catch((err) => {
            setError(err instanceof Error ? err.message : 'Failed to load notes');
          });
        }
      }
      return next;
    });
  }, [entriesByDir, loadDirectory]);

  const createNote = React.useCallback(async (dirPath: string, title: string): Promise<string | null> => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return null;
    }

    setError(null);

    try {
      const fileName = trimmedTitle.endsWith('.md') ? trimmedTitle : `${trimmedTitle}.md`;
      const response = await window.srgnt.notesCreateFile(
        joinNotesPath(dirPath, fileName),
        trimmedTitle.replace(/\.md$/, ''),
      );
      const nextPath = toRelativeNotesPath(response.path, notesRootRef.current);

      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (dirPath) {
          next.add(dirPath);
        }
        return next;
      });

      await refresh();
      await selectNote(nextPath);
      return nextPath;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
      return null;
    }
  }, [refresh, selectNote]);

  const createFolder = React.useCallback(async (dirPath: string): Promise<string | null> => {
    const normalizedDirPath = normalizePath(dirPath);
    if (!normalizedDirPath) {
      return null;
    }

    setError(null);

    try {
      const response = await window.srgnt.notesCreateFolder(normalizedDirPath);
      const nextPath = toRelativeNotesPath(response.path, notesRootRef.current);

      setExpandedDirs((prev) => {
        const next = new Set(prev);
        next.add(getParentPath(nextPath));
        next.add(nextPath);
        return next;
      });

      await refresh();
      return nextPath;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      return null;
    }
  }, [refresh]);

  const deleteEntry = React.useCallback(async (path: string, isDirectory: boolean): Promise<boolean> => {
    setError(null);

    try {
      const response = await window.srgnt.notesDelete(path, isDirectory);
      if (!response.deleted) {
        return false;
      }

      const currentSelectedPath = selectedPathRef.current;
      if (currentSelectedPath && isSameOrDescendant(currentSelectedPath, path)) {
        clearActiveSelection();
      }

      if (isDirectory) {
        setExpandedDirs((prev) => new Set(Array.from(prev).filter((dirPath) => !isSameOrDescendant(dirPath, path))));
      }

      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      return false;
    }
  }, [clearActiveSelection, refresh]);

  const renameEntry = React.useCallback(async (oldPath: string, newName: string): Promise<string | null> => {
    setError(null);

    try {
      const response = await window.srgnt.notesRename(oldPath, newName);
      const nextPath = toRelativeNotesPath(response.newPath, notesRootRef.current);

      setEntriesByDir((prev) => renameDirectoryEntries(prev, oldPath, nextPath));
      setExpandedDirs((prev) => renameExpandedDirs(prev, oldPath, nextPath));

      const currentSelectedPath = selectedPathRef.current;
      if (currentSelectedPath && isSameOrDescendant(currentSelectedPath, oldPath)) {
        setSelectedPath(renamePath(currentSelectedPath, oldPath, nextPath));
      }

      await refresh();
      return nextPath;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename');
      return null;
    }
  }, [refresh]);

  const writeActiveContent = React.useCallback(async (content: string) => {
    const currentSelectedPath = selectedPathRef.current;
    if (!currentSelectedPath) {
      throw new Error('No active note selected');
    }

    setError(null);

    try {
      const response = await window.srgnt.notesWriteFile(currentSelectedPath, content);
      setActiveContent(content);
      setActiveModifiedAt(response.modifiedAt);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save note');
      setError(error.message);
      throw error;
    }
  }, []);

  const clearSelection = React.useCallback(() => {
    clearActiveSelection();
  }, [clearActiveSelection]);

  const searchNotes = React.useCallback((query: string) => {
    setSearchQuery(query);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!query.trim()) {
      searchRequestIdRef.current += 1;
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    setSearchLoading(true);
    setSearchError(null);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const response = await window.srgnt.notesSearch(query);
        if (searchRequestIdRef.current !== requestId) {
          return;
        }
        setSearchResults(response.results);
      } catch (err) {
        if (searchRequestIdRef.current !== requestId) {
          return;
        }
        setSearchError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults([]);
      } finally {
        if (searchRequestIdRef.current === requestId) {
          setSearchLoading(false);
        }
      }
    }, 300);
  }, []);

  const clearSearch = React.useCallback(() => {
    searchRequestIdRef.current += 1;
    setSearchQuery('');
    setSearchResults([]);
    setSearchLoading(false);
    setSearchError(null);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchRequestIdRef.current += 1;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setError(null);

      try {
        const workspaceRoot = await window.srgnt.getWorkspaceRoot();
        if (cancelled) {
          return;
        }

        notesRootRef.current = toNotesRoot(workspaceRoot);
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load notes');
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const getChildEntries = React.useCallback((dirPath: string) => entriesByDir[dirPath] ?? [], [entriesByDir]);

  const value = React.useMemo<NotesContextValue>(
    () => ({
      rootEntries: entriesByDir[''] ?? [],
      selectedPath,
      expandedDirs,
      isLoading,
      error,
      activeContent,
      activeModifiedAt,
      activeContentLoading,
      searchQuery,
      searchResults,
      searchLoading,
      searchError,
      getChildEntries,
      refresh,
      selectNote,
      toggleDir,
      createNote,
      createFolder,
      deleteEntry,
      renameEntry,
      writeActiveContent,
      clearSelection,
      searchNotes,
      clearSearch,
    }),
    [
      entriesByDir,
      selectedPath,
      expandedDirs,
      isLoading,
      error,
      activeContent,
      activeModifiedAt,
      activeContentLoading,
      searchQuery,
      searchResults,
      searchLoading,
      searchError,
      getChildEntries,
      refresh,
      selectNote,
      toggleDir,
      createNote,
      createFolder,
      deleteEntry,
      renameEntry,
      writeActiveContent,
      clearSelection,
      searchNotes,
      clearSearch,
    ],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const ctx = React.useContext(NotesContext);
  if (!ctx) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return ctx;
}
