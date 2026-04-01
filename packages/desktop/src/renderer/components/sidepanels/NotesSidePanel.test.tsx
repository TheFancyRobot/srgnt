import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotesProvider } from '../notes/NotesContext.js';
import { NotesView } from '../NotesView.js';
import { NotesSidePanel } from './NotesSidePanel.js';

describe('NotesSidePanel', () => {
  beforeEach(() => {
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
});
