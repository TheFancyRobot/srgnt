import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotesProvider } from './notes/NotesContext.js';
import { NotesSidePanel } from './sidepanels/NotesSidePanel.js';
import { NotesView } from './NotesView.js';

describe('NotesView', () => {
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
      notesSearch: vi.fn(),
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
});
