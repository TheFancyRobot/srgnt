import React from 'react';
import { useNotes } from '../notes/NotesContext.js';
import type { NoteEntry, SearchResultEntry } from '../notes/NotesContext.js';

const FILE_ICON = (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const FOLDER_ICON = (
  <svg className="w-3.5 h-3.5 flex-shrink-0 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const CHEVRON_ICON = (
  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

type DraftCreateState =
  | { kind: 'note'; parentPath: string }
  | { kind: 'folder'; parentPath: string }
  | null;

type SearchMode = 'notes' | 'semantic';

type SemanticSearchModeState = 'idle' | 'disabled' | 'indexing' | 'error' | 'ready';

function displayNameForRename(entry: NoteEntry): string {
  return entry.isDirectory ? entry.name : entry.name.replace(/\.md$/, '');
}

function InlineNameInput({
  depth,
  icon,
  placeholder,
  initialValue,
  onSubmit,
  onCancel,
}: {
  depth: number;
  icon: React.ReactNode;
  placeholder: string;
  initialValue: string;
  onSubmit: (value: string) => Promise<void>;
  onCancel: () => void;
}): React.ReactElement {
  const [value, setValue] = React.useState(initialValue);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = React.useCallback(async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isSubmitting) {
      if (!trimmedValue) {
        onCancel();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(trimmedValue);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onCancel, onSubmit, value]);

  return (
    <div className="flex items-center gap-1.5 py-1 px-1.5" style={{ paddingLeft: `${depth * 12 + 6}px` }}>
      <span className="text-text-tertiary">{icon}</span>
      <input
        ref={inputRef}
        type="text"
        className="input flex-1 min-w-0 rounded-md border-srgnt-500 px-1.5 py-0.5 text-xs placeholder:text-text-tertiary focus:ring-2 focus:ring-srgnt-500/20 disabled:bg-surface-tertiary disabled:text-text-tertiary"
        placeholder={placeholder}
        value={value}
        disabled={isSubmitting}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void submit();
          }
          if (event.key === 'Escape') {
            onCancel();
          }
        }}
        onBlur={() => {
          void submit();
        }}
      />
    </div>
  );
}

function ConfirmDelete({
  depth,
  entry,
  onConfirm,
  onCancel,
}: {
  depth: number;
  entry: NoteEntry;
  onConfirm: () => void;
  onCancel: () => void;
}): React.ReactElement {
  return (
    <div className="mx-1.5 rounded border border-error-500/20 bg-error-500/10 p-2 text-xs" style={{ marginLeft: `${depth * 12 + 6}px` }}>
      <p className="text-text-primary">Delete &ldquo;{entry.name}&rdquo;?</p>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          className="rounded bg-error-500/20 px-2 py-0.5 text-error-500 transition-colors hover:bg-error-500/30"
          onClick={onConfirm}
        >
          Delete
        </button>
        <button
          type="button"
          className="rounded px-2 py-0.5 text-text-secondary transition-colors hover:text-text-primary"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Collect all visible, non-renaming entry paths in DFS order for arrow-key navigation. */
function collectVisiblePaths(
  entries: NoteEntry[],
  expandedDirs: ReadonlySet<string>,
  getChildEntries: (dirPath: string) => NoteEntry[],
): string[] {
  const result: string[] = [];
  for (const entry of entries) {
    result.push(entry.path);
    if (entry.isDirectory && expandedDirs.has(entry.path)) {
      const children = getChildEntries(entry.path);
      result.push(...collectVisiblePaths(children, expandedDirs, getChildEntries));
    }
  }
  return result;
}

function TreeBranch({
  parentPath,
  depth,
  draftCreate,
  renamingPath,
  deletePath,
  focusedPath,
  setFocusedPath,
  setDraftCreate,
  setRenamingPath,
  setDeletePath,
}: {
  parentPath: string;
  depth: number;
  draftCreate: DraftCreateState;
  renamingPath: string | null;
  deletePath: string | null;
  focusedPath: string | null;
  setFocusedPath: React.Dispatch<React.SetStateAction<string | null>>;
  setDraftCreate: React.Dispatch<React.SetStateAction<DraftCreateState>>;
  setRenamingPath: React.Dispatch<React.SetStateAction<string | null>>;
  setDeletePath: React.Dispatch<React.SetStateAction<string | null>>;
}): React.ReactElement {
  const {
    rootEntries,
    getChildEntries,
    expandedDirs,
    selectedPath,
    selectNote,
    toggleDir,
    createNote,
    createFolder,
    renameEntry,
    deleteEntry,
  } = useNotes();

  const entries = parentPath ? getChildEntries(parentPath) : rootEntries;

  const visiblePaths = React.useMemo(
    () => collectVisiblePaths(entries, expandedDirs, getChildEntries),
    [entries, expandedDirs, getChildEntries],
  );

  const handleArrowKey = React.useCallback(
    (event: React.KeyboardEvent, currentEntry: NoteEntry) => {
      const idx = visiblePaths.indexOf(currentEntry.path);
      if (idx === -1) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (idx < visiblePaths.length - 1) {
          setFocusedPath(visiblePaths[idx + 1]);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (idx > 0) {
          setFocusedPath(visiblePaths[idx - 1]);
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (currentEntry.isDirectory) {
          if (!expandedDirs.has(currentEntry.path)) {
            toggleDir(currentEntry.path);
          }
        } else {
          void selectNote(currentEntry.path);
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (currentEntry.isDirectory && expandedDirs.has(currentEntry.path)) {
          toggleDir(currentEntry.path);
        }
      } else if (event.key === 'Home') {
        event.preventDefault();
        if (visiblePaths.length > 0) {
          setFocusedPath(visiblePaths[0]);
        }
      } else if (event.key === 'End') {
        event.preventDefault();
        if (visiblePaths.length > 0) {
          setFocusedPath(visiblePaths[visiblePaths.length - 1]);
        }
      }
    },
    [expandedDirs, selectNote, setFocusedPath, toggleDir, visiblePaths],
  );

  return (
    <>
      {draftCreate && draftCreate.parentPath === parentPath && (
        <InlineNameInput
          depth={depth}
          icon={draftCreate.kind === 'folder' ? FOLDER_ICON : FILE_ICON}
          placeholder={draftCreate.kind === 'folder' ? 'folder name...' : 'note title...'}
          initialValue=""
          onSubmit={async (value) => {
            if (draftCreate.kind === 'folder') {
              await createFolder(parentPath ? `${parentPath}/${value}` : value);
            } else {
              await createNote(parentPath, value);
            }
            setDraftCreate(null);
          }}
          onCancel={() => setDraftCreate(null)}
        />
      )}

      {entries.map((entry) => {
        const isDirectory = entry.isDirectory;
        const isExpanded = isDirectory && expandedDirs.has(entry.path);
        const isSelected = selectedPath === entry.path;

        return (
          <React.Fragment key={entry.path}>
            {renamingPath === entry.path ? (
              <InlineNameInput
                depth={depth}
                icon={isDirectory ? FOLDER_ICON : FILE_ICON}
                placeholder={isDirectory ? 'folder name...' : 'note title...'}
                initialValue={displayNameForRename(entry)}
                onSubmit={async (value) => {
                  const nextName = isDirectory ? value : `${value}.md`;
                  await renameEntry(entry.path, nextName);
                  setRenamingPath(null);
                }}
                onCancel={() => setRenamingPath(null)}
              />
            ) : (
              <div
                role="treeitem"
                aria-expanded={isDirectory ? isExpanded : undefined}
                aria-selected={isSelected}
                tabIndex={focusedPath === entry.path ? 0 : -1}
                className={`group flex w-full items-center gap-1.5 py-1 px-1.5 text-left text-xs transition-colors ${isSelected ? 'bg-surface-tertiary/60' : 'hover:bg-surface-tertiary/40'}`}
                style={{ paddingLeft: `${depth * 12 + 6}px` }}
                onFocus={() => setFocusedPath(entry.path)}
                onClick={() => {
                  setFocusedPath(entry.path);
                  if (isDirectory) {
                    toggleDir(entry.path);
                    return;
                  }

                  void selectNote(entry.path);
                }}
                onKeyDown={(event) => {
                  handleArrowKey(event, entry);

                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (isDirectory) {
                      toggleDir(entry.path);
                      return;
                    }

                    void selectNote(entry.path);
                  }

                  if (event.key === 'F2') {
                    event.preventDefault();
                    setDeletePath(null);
                    setDraftCreate(null);
                    setRenamingPath(entry.path);
                  }

                  if (event.key === 'Delete') {
                    event.preventDefault();
                    setRenamingPath(null);
                    setDraftCreate(null);
                    setDeletePath(entry.path);
                  }
                }}
              >
                {isDirectory ? (
                  <span className={`text-text-tertiary transition-transform ${isExpanded ? '' : '-rotate-90'}`}>{CHEVRON_ICON}</span>
                ) : (
                  <span className="w-3 flex-shrink-0" />
                )}
                <span className={isSelected ? 'text-srgnt-500' : 'text-text-tertiary'}>{isDirectory ? FOLDER_ICON : FILE_ICON}</span>
                <span className={`truncate ${isSelected ? 'font-medium text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                  {entry.name}
                </span>
                <span className="ml-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  {isDirectory && (
                    <>
                      <button
                        type="button"
                        className="rounded p-0.5 text-text-tertiary transition-colors hover:bg-surface-tertiary/50 hover:text-text-primary"
                        title={`New note in ${entry.name}`}
                        aria-label={`New note in ${entry.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeletePath(null);
                          setRenamingPath(null);
                          setDraftCreate({ kind: 'note', parentPath: entry.path });
                        }}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="rounded p-0.5 text-text-tertiary transition-colors hover:bg-surface-tertiary/50 hover:text-text-primary"
                        title={`New folder in ${entry.name}`}
                        aria-label={`New folder in ${entry.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeletePath(null);
                          setRenamingPath(null);
                          setDraftCreate({ kind: 'folder', parentPath: entry.path });
                        }}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5h5.25l1.5 1.5h9.75v7.5A2.25 2.25 0 0118 18.75H6A2.25 2.25 0 013.75 16.5v-9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.25v4.5m2.25-2.25h-4.5" />
                        </svg>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="rounded p-0.5 text-text-tertiary transition-colors hover:bg-surface-tertiary/50 hover:text-text-primary"
                    title={`Rename ${entry.name}`}
                    aria-label={`Rename ${entry.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeletePath(null);
                      setDraftCreate(null);
                      setRenamingPath(entry.path);
                    }}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 text-text-tertiary transition-colors hover:bg-error-500/20 hover:text-error-500"
                    title={`Delete ${entry.name}`}
                    aria-label={`Delete ${entry.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setRenamingPath(null);
                      setDraftCreate(null);
                      setDeletePath(entry.path);
                    }}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </span>
              </div>
            )}

            {deletePath === entry.path && (
              <ConfirmDelete
                depth={depth + 1}
                entry={entry}
                onConfirm={() => {
                  void deleteEntry(entry.path, entry.isDirectory).then(() => setDeletePath(null));
                }}
                onCancel={() => setDeletePath(null)}
              />
            )}

            {isDirectory && isExpanded && (
              <div role="group">
                <TreeBranch
                  parentPath={entry.path}
                  depth={depth + 1}
                  draftCreate={draftCreate}
                  renamingPath={renamingPath}
                  deletePath={deletePath}
                  focusedPath={focusedPath}
                  setFocusedPath={setFocusedPath}
                  setDraftCreate={setDraftCreate}
                  setRenamingPath={setRenamingPath}
                  setDeletePath={setDeletePath}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

function EmptyState({
  onCreateNote,
  onCreateFolder,
}: {
  onCreateNote: () => void;
  onCreateFolder: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center space-y-3 px-4 py-8 text-center">
      <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <p className="text-xs text-text-tertiary">No notes yet</p>
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={onCreateNote}>
          Create your first note
        </button>
        <button type="button" className="btn btn-ghost text-xs" onClick={onCreateFolder}>
          New folder
        </button>
      </div>
    </div>
  );
}

const SEARCH_ICON = (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const CLEAR_ICON = (
  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function renderSnippet(snippet: string): React.ReactNode {
  const parts = snippet.split(/(\*\*.*?\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    const isMatch = part.startsWith('**') && part.endsWith('**') && part.length >= 4;
    const text = isMatch ? part.slice(2, -2) : part;

    return isMatch ? (
      <mark key={`${text}-${index}`} className="rounded bg-srgnt-500/15 px-0.5 text-text-primary">
        {text}
      </mark>
    ) : (
      <React.Fragment key={`${text}-${index}`}>{text}</React.Fragment>
    );
  });
}

function SearchResults({ results, onSelect }: { results: SearchResultEntry[]; onSelect: (path: string) => void }): React.ReactElement {
  return (
    <div className="flex flex-col">
      {results.map((result) => (
        <button
          key={result.path}
          type="button"
          className="flex flex-col gap-0.5 px-3 py-1.5 text-left transition-colors hover:bg-surface-tertiary/40"
          onClick={() => onSelect(result.path)}
        >
          <span className="truncate text-xs font-medium text-text-primary">{result.title}</span>
          <span className="truncate text-[10px] text-text-tertiary">{result.path}</span>
          <span className="line-clamp-2 text-[10px] leading-relaxed text-text-secondary">
            {renderSnippet(result.snippet)}
          </span>
        </button>
      ))}
    </div>
  );
}

export function NotesSidePanel(): React.ReactElement {
  const {
    rootEntries,
    isLoading,
    error,
    refresh,
    searchResults,
    searchLoading,
    searchError,
    selectNote,
    searchNotes,
    clearSearch,
  } = useNotes();
  const [draftCreate, setDraftCreate] = React.useState<DraftCreateState>(null);
  const [renamingPath, setRenamingPath] = React.useState<string | null>(null);
  const [deletePath, setDeletePath] = React.useState<string | null>(null);
  const [focusedPath, setFocusedPath] = React.useState<string | null>(null);
  const [localSearchInput, setLocalSearchInput] = React.useState('');
  const [searchMode, setSearchMode] = React.useState<SearchMode>('notes');
  const [workspaceRoot, setWorkspaceRoot] = React.useState('');
  const [semanticSearchResults, setSemanticSearchResults] = React.useState<SearchResultEntry[]>([]);
  const [semanticSearchLoading, setSemanticSearchLoading] = React.useState(false);
  const [semanticSearchError, setSemanticSearchError] = React.useState<string | null>(null);
  const [semanticModeState, setSemanticModeState] = React.useState<SemanticSearchModeState>('idle');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const semanticSearchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const semanticSearchRequestIdRef = React.useRef(0);

  const resolveWorkspaceRoot = React.useCallback(async () => {
    if (workspaceRoot) {
      return workspaceRoot;
    }

    const root = await window.srgnt.getWorkspaceRoot();
    setWorkspaceRoot(root);
    return root;
  }, [workspaceRoot]);

  const runSemanticSearch = React.useCallback(
    (value: string) => {
      if (semanticSearchDebounceRef.current) {
        clearTimeout(semanticSearchDebounceRef.current);
      }

      if (!value.trim()) {
        setSemanticSearchResults([]);
        setSemanticSearchError(null);
        setSemanticSearchLoading(false);
        setSemanticModeState('idle');
        return;
      }

      semanticSearchDebounceRef.current = setTimeout(async () => {
        const requestId = ++semanticSearchRequestIdRef.current;
        setSemanticSearchLoading(true);
        setSemanticSearchError(null);

        try {
          const root = await resolveWorkspaceRoot();
          const status = await window.srgnt.semanticSearchStatus(root);

          if (requestId !== semanticSearchRequestIdRef.current) {
            return;
          }

          if (status.state === 'error' && status.error) {
            setSemanticModeState('error');
            setSemanticSearchError(status.error);
            setSemanticSearchResults([]);
            return;
          }

          if (status.state === 'disabled' || status.state === 'uninitialized') {
            setSemanticModeState('disabled');
            setSemanticSearchError('Semantic search is disabled for this workspace. Enable it first.');
            setSemanticSearchResults([]);
            return;
          }

          setSemanticModeState(status.state === 'indexing' ? 'indexing' : 'ready');

          const response = await window.srgnt.semanticSearchSearch(root, value, 10, 0.5);

          if (requestId !== semanticSearchRequestIdRef.current) {
            return;
          }

          setSemanticSearchResults(
            response.results.map((result) => ({
              score: result.score,
              title: result.title,
              path: result.workspaceRelativePath,
              snippet: result.snippet,
            })),
          );
        } catch (err) {
          if (requestId !== semanticSearchRequestIdRef.current) {
            return;
          }
          setSemanticModeState('error');
          setSemanticSearchError(err instanceof Error ? err.message : 'Semantic search failed');
          setSemanticSearchResults([]);
        } finally {
          if (requestId === semanticSearchRequestIdRef.current) {
            setSemanticSearchLoading(false);
          }
        }
      }, 300);
    },
    [resolveWorkspaceRoot],
  );

  const handleSearchModeChange = React.useCallback((nextMode: SearchMode) => {
    setSearchMode(nextMode);
    setLocalSearchInput('');
    clearSearch();
    if (semanticSearchDebounceRef.current) {
      clearTimeout(semanticSearchDebounceRef.current);
      semanticSearchDebounceRef.current = null;
    }
    setSemanticSearchResults([]);
    setSemanticSearchLoading(false);
    setSemanticSearchError(null);
    setSemanticModeState('idle');
  }, [clearSearch]);

  const isSearchActive = localSearchInput.length > 0;

  const handleSearchChange = React.useCallback((value: string) => {
    setLocalSearchInput(value);

    if (searchMode === 'notes') {
      searchNotes(value);
      return;
    }

    runSemanticSearch(value);
  }, [searchMode, runSemanticSearch, searchNotes]);

  const handleSearchClear = React.useCallback(() => {
    setLocalSearchInput('');
    if (searchMode === 'notes') {
      clearSearch();
    } else {
      if (semanticSearchDebounceRef.current) {
        clearTimeout(semanticSearchDebounceRef.current);
        semanticSearchDebounceRef.current = null;
      }
      setSemanticSearchResults([]);
      setSemanticSearchError(null);
      setSemanticSearchLoading(false);
      setSemanticModeState('idle');
    }

    searchInputRef.current?.focus();
  }, [clearSearch, searchMode]);

  const handleSearchResultClick = React.useCallback((resultPath: string) => {
    // Search results return workspace-relative paths (e.g., 'Notes/Alpha.md')
    // but selectNote expects notes-relative paths (e.g., 'Alpha.md')
    const notesRelativePath = resultPath.startsWith('Notes/') ? resultPath.slice(6) : resultPath;
    void selectNote(notesRelativePath);
  }, [selectNote]);

  const searchResultList =
    searchMode === 'semantic' ? semanticSearchResults : searchResults;
  const searchLoadingState =
    searchMode === 'semantic' ? semanticSearchLoading : searchLoading;
  const searchErrorState =
    searchMode === 'semantic'
      ? semanticSearchError ?? searchError
      : searchError;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-default p-3">
        <h2 className="section-heading">Explorer</h2>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-tertiary/50 hover:text-text-primary"
            title="New note"
            aria-label="New note"
            onClick={() => {
              setDeletePath(null);
              setRenamingPath(null);
              setDraftCreate({ kind: 'note', parentPath: '' });
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <button
            type="button"
            className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-tertiary/50 hover:text-text-primary"
            title="New folder"
            aria-label="New folder"
            onClick={() => {
              setDeletePath(null);
              setRenamingPath(null);
              setDraftCreate({ kind: 'folder', parentPath: '' });
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5h5.25l1.5 1.5h9.75v7.5A2.25 2.25 0 0118 18.75H6A2.25 2.25 0 013.75 16.5v-9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.25v4.5m2.25-2.25h-4.5" />
            </svg>
          </button>
          <button
            type="button"
            className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-tertiary/50 hover:text-text-primary"
            title="Refresh"
            aria-label="Refresh notes"
            onClick={() => void refresh()}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="border-b border-border-default px-3 py-2">
        <div className="mb-2 flex items-center justify-start gap-1">
          <button
            type="button"
            className={`rounded px-2 py-0.5 text-xs transition ${
              searchMode === 'notes'
                ? 'bg-srgnt-500/20 text-text-primary'
                : 'text-text-tertiary hover:bg-surface-tertiary/50 hover:text-text-primary'
            }`}
            onClick={() => handleSearchModeChange('notes')}
            data-testid="notes-search-mode"
            aria-label="Full-text search"
          >
            Full-Text
          </button>
          <button
            type="button"
            className={`rounded px-2 py-0.5 text-xs transition ${
              searchMode === 'semantic'
                ? 'bg-srgnt-500/20 text-text-primary'
                : 'text-text-tertiary hover:bg-surface-tertiary/50 hover:text-text-primary'
            }`}
            onClick={() => handleSearchModeChange('semantic')}
            data-testid="semantic-search-mode"
            aria-label="Semantic search"
          >
            Semantic
          </button>
        </div>

        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-1.5 text-text-tertiary">{SEARCH_ICON}</span>
          <input
            ref={searchInputRef}
            type="text"
            className="input w-full rounded-md border-border-default py-1 pl-7 pr-6 text-xs placeholder:text-text-tertiary focus:ring-2 focus:ring-srgnt-500/20"
            placeholder={`Search ${searchMode === 'semantic' ? 'semantically...' : 'notes...'}`}
            value={localSearchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleSearchClear();
              }
            }}
          />
          {localSearchInput && (
            <button
              type="button"
              className="absolute right-1 rounded p-0.5 text-text-tertiary transition-colors hover:text-text-primary"
              onClick={handleSearchClear}
            >
              {CLEAR_ICON}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {isSearchActive ? (
          searchLoadingState ? (
            <div className="px-3 py-2 text-xs text-text-tertiary animate-pulse">Searching...</div>
          ) : searchMode === 'semantic' && semanticModeState === 'disabled' ? (
            <div className="px-3 py-2 text-xs text-text-tertiary">Enable semantic search for this workspace first.</div>
          ) : searchMode === 'semantic' && semanticModeState === 'indexing' ? (
            <div className="px-3 py-2 text-xs text-text-tertiary">Indexing workspace...</div>
          ) : searchErrorState ? (
            <div className="px-3 py-2 text-xs text-error-500">{searchErrorState}</div>
          ) : searchResultList.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-tertiary">
              No results for &ldquo;{localSearchInput}&rdquo;
            </div>
          ) : (
            <SearchResults results={searchResultList} onSelect={handleSearchResultClick} />
          )
        ) : isLoading && rootEntries.length === 0 ? (
          <div className="px-3 py-2 text-xs text-text-tertiary animate-pulse">Loading notes...</div>
        ) : rootEntries.length === 0 && !draftCreate ? (
          <EmptyState
            onCreateNote={() => setDraftCreate({ kind: 'note', parentPath: '' })}
            onCreateFolder={() => setDraftCreate({ kind: 'folder', parentPath: '' })}
          />
        ) : (
          <div role="tree" aria-label="Notes file tree">
            <TreeBranch
              parentPath=""
              depth={0}
              draftCreate={draftCreate}
              renamingPath={renamingPath}
              deletePath={deletePath}
              focusedPath={focusedPath}
              setFocusedPath={setFocusedPath}
              setDraftCreate={setDraftCreate}
              setRenamingPath={setRenamingPath}
              setDeletePath={setDeletePath}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-border-default px-3 py-2 text-xs text-error-500">
          {error}
        </div>
      )}
    </div>
  );
}
