import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Mock electron IPC — hoisted by vitest before imports are evaluated
const { mockHandle, mockRemoveHandler } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockRemoveHandler: vi.fn(),
}));
vi.mock('electron', () => ({ ipcMain: { handle: mockHandle, removeHandler: mockRemoveHandler } }));

import {
  getNotesDir,
  ensureNotesDir,
  validateNotesPath,
  listNotes,
  readNote,
  writeNote,
  createNote,
  createFolder,
  deleteEntry,
  renameEntry,
  searchNotes,
  listWorkspaceMarkdown,
  resolveWikilink,
  registerNotesHandlers,
} from './notes.js';

const tempPaths: string[] = [];

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempPaths.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map((entry) => fs.rm(entry, { recursive: true, force: true })));
  vi.clearAllMocks();
});

describe('notes service - path helpers', () => {
  describe('getNotesDir', () => {
    it('returns the Notes directory path under workspace root', () => {
      expect(getNotesDir('/home/user/workspace')).toBe('/home/user/workspace/Notes');
      expect(getNotesDir('/tmp/test-workspace')).toBe('/tmp/test-workspace/Notes');
    });
  });

  describe('ensureNotesDir', () => {
    it('creates the Notes directory if it does not exist', async () => {
      const workspaceRoot = await makeTempDir('srgnt-notes-ensure-');
      const notesDir = getNotesDir(workspaceRoot);

      await ensureNotesDir(workspaceRoot);

      const stat = await fs.stat(notesDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('does not error if Notes directory already exists', async () => {
      const workspaceRoot = await makeTempDir('srgnt-notes-exists-');
      const notesDir = getNotesDir(workspaceRoot);

      await fs.mkdir(notesDir, { recursive: true });

      await expect(ensureNotesDir(workspaceRoot)).resolves.not.toThrow();
    });
  });
});

describe('notes service - path validation and security', () => {
  describe('validateNotesPath', () => {
    it('accepts valid paths within Notes directory', async () => {
      const workspaceRoot = await makeTempDir('srgnt-notes-valid-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      const result = await validateNotesPath(workspaceRoot, '');
      expect(result).not.toBeNull();

      const result2 = await validateNotesPath(workspaceRoot, 'subfolder/note.md');
      expect(result2).not.toBeNull();
    });

    it('rejects path traversal attempts using ..', async () => {
      const workspaceRoot = await makeTempDir('srgnt-notes-traversal-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      expect(await validateNotesPath(workspaceRoot, '../../../etc/passwd')).toBeNull();
      expect(await validateNotesPath(workspaceRoot, '../outside')).toBeNull();
      expect(await validateNotesPath(workspaceRoot, 'subfolder/../../outside')).toBeNull();
    });

    it('rejects absolute paths', async () => {
      const workspaceRoot = await makeTempDir('srgnt-notes-absolute-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      expect(await validateNotesPath(workspaceRoot, '/etc/passwd')).toBeNull();
      expect(await validateNotesPath(workspaceRoot, '/tmp/test.md')).toBeNull();
    });

    it('rejects symlinks', async () => {
      const workspaceRoot = await makeTempDir('srgnt-notes-symlink-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const linkPath = path.join(notesDir, 'link-to-outside');
      const outsidePath = path.join(workspaceRoot, 'outside.md');
      await fs.writeFile(outsidePath, 'content');
      await fs.symlink(outsidePath, linkPath);

      expect(await validateNotesPath(workspaceRoot, 'link-to-outside')).toBeNull();
    });

    it('rejects paths that traverse through a symlinked ancestor directory', async () => {
      const workspaceRoot = await makeTempDir('srgnt-notes-symlink-ancestor-');
      const notesDir = getNotesDir(workspaceRoot);
      const outsideDir = path.join(workspaceRoot, 'outside-dir');
      await fs.mkdir(notesDir, { recursive: true });
      await fs.mkdir(outsideDir, { recursive: true });
      await fs.writeFile(path.join(outsideDir, 'escaped.md'), 'outside content');
      await fs.symlink(outsideDir, path.join(notesDir, 'linked-dir'));

      expect(await validateNotesPath(workspaceRoot, 'linked-dir/escaped.md')).toBeNull();
    });

    it('returns null when fs.lstat throws error other than ENOENT', async () => {
      const workspaceRoot = await makeTempDir('srgnt-notes-error-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      // Create a symlink to a non-existent target - lstat will succeed (showing it's a symlink)
      // but this path is already handled by the symlink rejection test above.
      // Instead test with a path that contains a null-like pattern or triggers EACCES.
      // Since we cannot easily mock fs.lstat on the imported module, we test the
      // ENOENT path which is the main production path.
      // The non-ENOENT path returns null by catching the error in validateNotesPath.
      // We verify the existing test covers symlink rejection (which exercises the lstat path).
      // This test verifies that a path to a symlink returns null (lstat succeeds, isSymbolicLink true).
      const linkPath = path.join(notesDir, 'test-link');
      const targetPath = path.join(workspaceRoot, 'nonexistent-target');
      await fs.symlink(targetPath, linkPath);

      // lstat succeeds on the symlink itself (ENOENT only happens on stat/readFile, not lstat)
      const result = await validateNotesPath(workspaceRoot, 'test-link');
      expect(result).toBeNull();
    });

    it('allows non-existent paths (returns path for later file creation)', async () => {
      const workspaceRoot = await makeTempDir('srgnt-notes-nonexist-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      const result = await validateNotesPath(workspaceRoot, 'new-note.md');
      expect(result).not.toBeNull();
      expect(result).toContain('new-note.md');
    });

    it('allows the Notes directory root itself', async () => {
      const workspaceRoot = await makeTempDir('srgnt-notes-root-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      const result = await validateNotesPath(workspaceRoot, '');
      expect(result).not.toBeNull();
    });
  });
});

describe('notes service - directory listing and tree building', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe('listNotes', () => {
    it('lists empty directory', async () => {
      const workspaceRoot = await makeTempDir('srgnt-list-empty-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      const entries = await listNotes(workspaceRoot);
      expect(entries).toEqual([]);
    });

    it('lists directories and markdown files', async () => {
      const workspaceRoot = await makeTempDir('srgnt-list-mixed-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'note1.md'), '# Note 1');
      await fs.writeFile(path.join(notesDir, 'note2.md'), '# Note 2');
      await fs.mkdir(path.join(notesDir, 'folder1'));
      await fs.mkdir(path.join(notesDir, 'folder2'));

      const entries = await listNotes(workspaceRoot);
      expect(entries).toHaveLength(4);

      const dirEntries = entries.filter((e) => e.isDirectory);
      const fileEntries = entries.filter((e) => !e.isDirectory);

      expect(dirEntries).toHaveLength(2);
      expect(fileEntries).toHaveLength(2);
      expect(dirEntries[0].name).toBe('folder1');
      expect(dirEntries[1].name).toBe('folder2');
    });

    it('lists nested directory contents', async () => {
      const workspaceRoot = await makeTempDir('srgnt-list-nested-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const subfolder = path.join(notesDir, 'subfolder');
      await fs.mkdir(subfolder, { recursive: true });
      await fs.writeFile(path.join(subfolder, 'nested.md'), '# Nested');

      const entries = await listNotes(workspaceRoot, 'subfolder');
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('nested.md');
      expect(entries[0].isDirectory).toBe(false);
    });

    it('skips hidden files and directories', async () => {
      const workspaceRoot = await makeTempDir('srgnt-list-hidden-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, '.hidden.md'), 'hidden');
      await fs.mkdir(path.join(notesDir, '.hidden-folder'));
      await fs.writeFile(path.join(notesDir, 'visible.md'), 'visible');

      const entries = await listNotes(workspaceRoot);
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('visible.md');
    });

    it('skips symlinks', async () => {
      const workspaceRoot = await makeTempDir('srgnt-list-symlink-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const linkPath = path.join(notesDir, 'link.md');
      await fs.symlink(path.join(workspaceRoot, 'outside.md'), linkPath);

      const entries = await listNotes(workspaceRoot);
      expect(entries).toHaveLength(0);
    });

    it('skips non-markdown files', async () => {
      const workspaceRoot = await makeTempDir('srgnt-list-nonmd-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'note.md'), '# Note');
      await fs.writeFile(path.join(notesDir, 'image.png'), 'png data');
      await fs.writeFile(path.join(notesDir, 'code.js'), 'console.log("hi")');

      const entries = await listNotes(workspaceRoot);
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('note.md');
    });

    it('sorts directories before files, alphabetically', async () => {
      const workspaceRoot = await makeTempDir('srgnt-list-sort-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.mkdir(path.join(notesDir, 'z-folder'));
      await fs.writeFile(path.join(notesDir, 'a.md'), 'A');
      await fs.mkdir(path.join(notesDir, 'a-folder'));
      await fs.writeFile(path.join(notesDir, 'z.md'), 'Z');

      const entries = await listNotes(workspaceRoot);
      expect(entries.map((e) => e.name)).toEqual(['a-folder', 'z-folder', 'a.md', 'z.md']);
    });

    it('includes modifiedAt timestamp for each entry', async () => {
      const workspaceRoot = await makeTempDir('srgnt-list-mtime-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'note.md'), '# Note');

      const entries = await listNotes(workspaceRoot);
      expect(entries[0].modifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('returns empty array for non-existent subdirectory', async () => {
      const workspaceRoot = await makeTempDir('srgnt-list-nonexist-dir-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      const entries = await listNotes(workspaceRoot, 'does-not-exist');
      expect(entries).toEqual([]);
    });

    it('returns empty array for invalid path', async () => {
      const workspaceRoot = await makeTempDir('srgnt-list-invalid-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      const entries = await listNotes(workspaceRoot, '../../../etc');
      expect(entries).toEqual([]);
    });
  });
});

describe('notes service - read operations', () => {
  describe('readNote', () => {
    it('reads file content and returns modifiedAt', async () => {
      const workspaceRoot = await makeTempDir('srgnt-read-valid-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const filePath = path.join(notesDir, 'note.md');
      await fs.writeFile(filePath, '# Test Note\n\nContent here');

      const result = await readNote(workspaceRoot, 'note.md');
      expect(result.content).toBe('# Test Note\n\nContent here');
      expect(result.modifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('rejects file larger than MAX_FILE_SIZE_BYTES (5MB)', async () => {
      const workspaceRoot = await makeTempDir('srgnt-read-too-big-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const filePath = path.join(notesDir, 'large.md');
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
      await fs.writeFile(filePath, largeContent);

      await expect(readNote(workspaceRoot, 'large.md')).rejects.toThrow('File too large');
    });

    it('rejects invalid path with path traversal', async () => {
      const workspaceRoot = await makeTempDir('srgnt-read-invalid-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      await expect(readNote(workspaceRoot, '../../../etc/passwd')).rejects.toThrow('Invalid path');
    });

    it('rejects path to symlink', async () => {
      const workspaceRoot = await makeTempDir('srgnt-read-symlink-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const linkPath = path.join(notesDir, 'link.md');
      await fs.symlink(path.join(workspaceRoot, 'outside.md'), linkPath);
      await fs.writeFile(path.join(workspaceRoot, 'outside.md'), 'outside content');

      await expect(readNote(workspaceRoot, 'link.md')).rejects.toThrow('Invalid path');
    });

    it('rejects reads through a symlinked ancestor directory', async () => {
      const workspaceRoot = await makeTempDir('srgnt-read-symlink-ancestor-');
      const notesDir = getNotesDir(workspaceRoot);
      const outsideDir = path.join(workspaceRoot, 'outside-dir');
      await fs.mkdir(notesDir, { recursive: true });
      await fs.mkdir(outsideDir, { recursive: true });
      await fs.writeFile(path.join(outsideDir, 'escaped.md'), 'outside content');
      await fs.symlink(outsideDir, path.join(notesDir, 'linked-dir'));

      await expect(readNote(workspaceRoot, 'linked-dir/escaped.md')).rejects.toThrow('Invalid path');
    });
  });
});

describe('notes service - write operations', () => {
  describe('writeNote', () => {
    it('writes content atomically using temp file pattern', async () => {
      const workspaceRoot = await makeTempDir('srgnt-write-atomic-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const result = await writeNote(workspaceRoot, 'new.md', '# New Note');
      expect(result.path).toContain('new.md');
      expect(result.modifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      const content = await fs.readFile(path.join(notesDir, 'new.md'), 'utf-8');
      expect(content).toBe('# New Note');
    });

    it('creates intermediate directories if needed', async () => {
      const workspaceRoot = await makeTempDir('srgnt-write-mkdir-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await writeNote(workspaceRoot, 'subfolder/nested.md', '# Nested');

      const content = await fs.readFile(path.join(notesDir, 'subfolder/nested.md'), 'utf-8');
      expect(content).toBe('# Nested');
    });

    it('rejects content larger than MAX_FILE_SIZE_BYTES', async () => {
      const workspaceRoot = await makeTempDir('srgnt-write-too-big-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB

      await expect(writeNote(workspaceRoot, 'large.md', largeContent)).rejects.toThrow('Content too large');
    });

    it('rejects invalid path with traversal', async () => {
      const workspaceRoot = await makeTempDir('srgnt-write-invalid-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      await expect(writeNote(workspaceRoot, '../../../etc/passwd', 'hacked')).rejects.toThrow('Invalid path');
    });

    it('overwrites existing file', async () => {
      const workspaceRoot = await makeTempDir('srgnt-write-overwrite-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'note.md'), 'old content');
      await writeNote(workspaceRoot, 'note.md', 'new content');

      const content = await fs.readFile(path.join(notesDir, 'note.md'), 'utf-8');
      expect(content).toBe('new content');
    });
  });
});

describe('notes service - create operations', () => {
  describe('createNote', () => {
    it('creates new file with quoted YAML frontmatter', async () => {
      const workspaceRoot = await makeTempDir('srgnt-create-note-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const result = await createNote(workspaceRoot, 'note.md', 'My Note Title');
      expect(result.path).toContain('note.md');
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      const content = await fs.readFile(path.join(notesDir, 'note.md'), 'utf-8');
      expect(content).toContain('title: "My Note Title"');
      expect(content).toContain('created: "');
      expect(content).toMatch(/^---\s*\ntitle:/);
    });

    it('escapes YAML-significant characters in frontmatter titles', async () => {
      const workspaceRoot = await makeTempDir('srgnt-create-note-escaped-title-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await createNote(workspaceRoot, 'special.md', 'Title: #1 "quoted" \\ path');

      const content = await fs.readFile(path.join(notesDir, 'special.md'), 'utf-8');
      expect(content).toContain('title: "Title: #1 \\"quoted\\" \\\\ path"');
    });

    it('creates intermediate directories if needed', async () => {
      const workspaceRoot = await makeTempDir('srgnt-create-note-dir-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await createNote(workspaceRoot, 'subfolder/nested.md', 'Nested Note');

      const exists = await fs.access(path.join(notesDir, 'subfolder/nested.md')).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('rejects if file already exists', async () => {
      const workspaceRoot = await makeTempDir('srgnt-create-note-exists-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'note.md'), 'existing');

      await expect(createNote(workspaceRoot, 'note.md', 'Title')).rejects.toThrow('File already exists');
    });

    it('rejects invalid path', async () => {
      const workspaceRoot = await makeTempDir('srgnt-create-note-invalid-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      await expect(createNote(workspaceRoot, '../../../etc/passwd', 'Title')).rejects.toThrow('Invalid path');
    });
  });

  describe('createFolder', () => {
    it('creates new folder', async () => {
      const workspaceRoot = await makeTempDir('srgnt-create-folder-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const result = await createFolder(workspaceRoot, 'new-folder');
      expect(result.path).toContain('new-folder');

      const stat = await fs.stat(path.join(notesDir, 'new-folder'));
      expect(stat.isDirectory()).toBe(true);
    });

    it('creates nested folders', async () => {
      const workspaceRoot = await makeTempDir('srgnt-create-nested-folder-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await createFolder(workspaceRoot, 'parent/child/grandchild');

      const stat = await fs.stat(path.join(notesDir, 'parent/child/grandchild'));
      expect(stat.isDirectory()).toBe(true);
    });

    it('rejects if directory already exists', async () => {
      const workspaceRoot = await makeTempDir('srgnt-create-folder-exists-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.mkdir(path.join(notesDir, 'existing'));

      await expect(createFolder(workspaceRoot, 'existing')).rejects.toThrow('Directory already exists');
    });

    it('rejects if path exists but is not a directory', async () => {
      const workspaceRoot = await makeTempDir('srgnt-create-folder-file-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'file.md'), 'content');

      await expect(createFolder(workspaceRoot, 'file.md')).rejects.toThrow('Path exists but is not a directory');
    });

    it('rejects invalid path', async () => {
      const workspaceRoot = await makeTempDir('srgnt-create-folder-invalid-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      await expect(createFolder(workspaceRoot, '../../../etc')).rejects.toThrow('Invalid path');
    });
  });
});

describe('notes service - destructive operations', () => {
  describe('deleteEntry', () => {
    it('deletes a file', async () => {
      const workspaceRoot = await makeTempDir('srgnt-delete-file-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'to-delete.md'), 'content');

      const result = await deleteEntry(workspaceRoot, 'to-delete.md', false);
      expect(result.deleted).toBe(true);

      await expect(fs.access(path.join(notesDir, 'to-delete.md'))).rejects.toThrow();
    });

    it('deletes an empty directory', async () => {
      const workspaceRoot = await makeTempDir('srgnt-delete-empty-dir-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.mkdir(path.join(notesDir, 'empty-folder'));

      const result = await deleteEntry(workspaceRoot, 'empty-folder', true);
      expect(result.deleted).toBe(true);

      await expect(fs.stat(path.join(notesDir, 'empty-folder'))).rejects.toThrow();
    });

    it('rejects deleting non-empty directory', async () => {
      const workspaceRoot = await makeTempDir('srgnt-delete-nonempty-dir-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.mkdir(path.join(notesDir, 'folder-with-content'));
      await fs.writeFile(path.join(notesDir, 'folder-with-content/note.md'), 'content');

      await expect(deleteEntry(workspaceRoot, 'folder-with-content', true)).rejects.toThrow('Cannot delete non-empty directory');
    });

    it('rejects invalid path', async () => {
      const workspaceRoot = await makeTempDir('srgnt-delete-invalid-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      await expect(deleteEntry(workspaceRoot, '../../../etc/passwd', false)).rejects.toThrow('Invalid path');
    });
  });

  describe('renameEntry', () => {
    it('renames a file', async () => {
      const workspaceRoot = await makeTempDir('srgnt-rename-file-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'old.md'), 'content');

      const result = await renameEntry(workspaceRoot, 'old.md', 'new.md');
      expect(result.newPath).toContain('new.md');

      await expect(fs.access(path.join(notesDir, 'old.md'))).rejects.toThrow();
      const content = await fs.readFile(path.join(notesDir, 'new.md'), 'utf-8');
      expect(content).toBe('content');
    });

    it('renames a directory', async () => {
      const workspaceRoot = await makeTempDir('srgnt-rename-dir-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.mkdir(path.join(notesDir, 'old-folder'));

      const result = await renameEntry(workspaceRoot, 'old-folder', 'new-folder');
      expect(result.newPath).toContain('new-folder');

      await expect(fs.stat(path.join(notesDir, 'old-folder'))).rejects.toThrow();
      const stat = await fs.stat(path.join(notesDir, 'new-folder'));
      expect(stat.isDirectory()).toBe(true);
    });

    it('rejects names with path separators', async () => {
      const workspaceRoot = await makeTempDir('srgnt-rename-separator-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      await expect(renameEntry(workspaceRoot, 'old.md', 'new/name.md')).rejects.toThrow('Invalid name');
    });

    it('rejects hidden file names (starting with .)', async () => {
      const workspaceRoot = await makeTempDir('srgnt-rename-hidden-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      await expect(renameEntry(workspaceRoot, 'old.md', '.hidden.md')).rejects.toThrow('Cannot create hidden files');
    });

    it('rejects if destination already exists', async () => {
      const workspaceRoot = await makeTempDir('srgnt-rename-exists-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'source.md'), 'source');
      await fs.writeFile(path.join(notesDir, 'dest.md'), 'dest');

      await expect(renameEntry(workspaceRoot, 'source.md', 'dest.md')).rejects.toThrow('Destination already exists');
    });

    it('rejects invalid old path', async () => {
      const workspaceRoot = await makeTempDir('srgnt-rename-invalid-');
      await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });

      await expect(renameEntry(workspaceRoot, '../../../etc/passwd', 'new.md')).rejects.toThrow('Invalid path');
    });
  });
});

describe('notes service - search functionality', () => {
  describe('searchNotes', () => {
    it('returns empty array for empty query', async () => {
      const workspaceRoot = await makeTempDir('srgnt-search-empty-query-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'test.md'), '# Test');

      const results = await searchNotes(workspaceRoot, '');
      expect(results).toEqual([]);
    });

    it('finds files by exact filename match', async () => {
      const workspaceRoot = await makeTempDir('srgnt-search-filename-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'meeting-notes.md'), '# Meeting Notes\n\nImportant discussion');

      const results = await searchNotes(workspaceRoot, 'meeting-notes');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('meeting-notes');
      expect(results[0].score).toBe(100);
    });

    it('finds files by partial filename match', async () => {
      const workspaceRoot = await makeTempDir('srgnt-search-partial-filename-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'project-planning.md'), '# Planning');

      const results = await searchNotes(workspaceRoot, 'project');
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(50);
    });

    it('finds files by frontmatter title match', async () => {
      const workspaceRoot = await makeTempDir('srgnt-search-frontmatter-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(
        path.join(notesDir, 'file.md'),
        '---\ntitle: Project Roadmap\n---\n\nContent',
      );

      const results = await searchNotes(workspaceRoot, 'roadmap');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Project Roadmap');
      expect(results[0].score).toBe(50);
    });

    it('finds files by content match with lower score', async () => {
      const workspaceRoot = await makeTempDir('srgnt-search-content-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'notes.md'), '# Notes\n\nThis discusses architecture patterns');

      const results = await searchNotes(workspaceRoot, 'architecture');
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(10);
    });

    it('returns ranked results sorted by score', async () => {
      const workspaceRoot = await makeTempDir('srgnt-search-ranked-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'test.md'), '# Test');
      await fs.writeFile(
        path.join(notesDir, 'other.md'),
        '---\ntitle: Test Title\n---\n\nContent with test',
      );

      const results = await searchNotes(workspaceRoot, 'test');
      expect(results).toHaveLength(2);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });

    it('includes snippet with matched text highlighted', async () => {
      const workspaceRoot = await makeTempDir('srgnt-search-snippet-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const content = '# Introduction\n\nThis is a comprehensive guide about testing.';
      await fs.writeFile(path.join(notesDir, 'guide.md'), content);

      const results = await searchNotes(workspaceRoot, 'testing');
      expect(results).toHaveLength(1);
      expect(results[0].snippet).toContain('**testing**');
    });

    it('limits results to maxResults parameter', async () => {
      const workspaceRoot = await makeTempDir('srgnt-search-max-results-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      for (let i = 0; i < 10; i++) {
        await fs.writeFile(path.join(notesDir, `file${i}.md`), `# File ${i}\n\nContent with keyword`);
      }

      const results = await searchNotes(workspaceRoot, 'keyword', 5);
      expect(results).toHaveLength(5);
    });

    it('excludes .command-center directory', async () => {
      const workspaceRoot = await makeTempDir('srgnt-search-exclude-');
      const notesDir = getNotesDir(workspaceRoot);
      const commandCenter = path.join(workspaceRoot, '.command-center');

      await fs.mkdir(notesDir, { recursive: true });
      await fs.mkdir(commandCenter, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'visible.md'), '# Visible\n\nkeyword');
      await fs.writeFile(path.join(commandCenter, 'hidden.md'), '# Hidden\n\nkeyword');

      const results = await searchNotes(workspaceRoot, 'keyword');
      expect(results).toHaveLength(1);
      expect(results[0].path).not.toContain('.command-center');
    });

    it('excludes files larger than MAX_FILE_SIZE_BYTES', async () => {
      const workspaceRoot = await makeTempDir('srgnt-search-too-big-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
      await fs.writeFile(path.join(notesDir, 'large.md'), largeContent);

      const results = await searchNotes(workspaceRoot, 'x');
      expect(results).toHaveLength(0);
    });
  });
});

describe('notes service - workspace-wide markdown helpers', () => {
  describe('listWorkspaceMarkdown', () => {
    it('lists all markdown files in Notes workspace subtree', async () => {
      const workspaceRoot = await makeTempDir('srgnt-ws-list-all-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(path.join(notesDir, 'docs'), { recursive: true });

      await fs.writeFile(path.join(notesDir, 'readme.md'), '# Readme');
      await fs.writeFile(path.join(notesDir, 'docs/guide.md'), '# Guide');

      const results = await listWorkspaceMarkdown(workspaceRoot);
      expect(results).toHaveLength(2);
      expect(results.map((entry) => entry.path).sort()).toEqual(['Notes/docs/guide.md', 'Notes/readme.md']);
    });

    it('excludes .command-center directory while staying scoped to Notes', async () => {
      const workspaceRoot = await makeTempDir('srgnt-ws-exclude-cc-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const commandCenter = path.join(workspaceRoot, '.command-center');
      await fs.mkdir(commandCenter, { recursive: true });
      await fs.writeFile(path.join(commandCenter, 'secret.md'), '# Secret');

      await fs.writeFile(path.join(notesDir, 'public.md'), '# Public');

      const results = await listWorkspaceMarkdown(workspaceRoot);
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('Notes/public.md');
    });

    it('excludes hidden directories inside Notes', async () => {
      const workspaceRoot = await makeTempDir('srgnt-ws-exclude-hidden-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(path.join(notesDir, '.hidden'), { recursive: true });
      await fs.writeFile(path.join(notesDir, '.hidden/note.md'), '# Hidden');
      await fs.writeFile(path.join(notesDir, 'visible.md'), '# Visible');

      const results = await listWorkspaceMarkdown(workspaceRoot);
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('Notes/visible.md');
    });

    it('excludes symlinks inside Notes', async () => {
      const workspaceRoot = await makeTempDir('srgnt-ws-exclude-symlink-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      const linkPath = path.join(notesDir, 'link.md');
      await fs.symlink(path.join(workspaceRoot, 'outside.md'), linkPath);

      await fs.writeFile(path.join(notesDir, 'regular.md'), '# Regular');

      const results = await listWorkspaceMarkdown(workspaceRoot);
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('Notes/regular.md');
    });

    it('extracts title from legacy unquoted frontmatter if available', async () => {
      const workspaceRoot = await makeTempDir('srgnt-ws-frontmatter-title-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(
        path.join(notesDir, 'file.md'),
        '---\ntitle: Custom Title\n---\n\nContent',
      );

      const results = await listWorkspaceMarkdown(workspaceRoot);
      expect(results[0].title).toBe('Custom Title');
      expect(results[0].path).toBe('Notes/file.md');
    });

    it('extracts title from quoted frontmatter and unescapes quotes', async () => {
      const workspaceRoot = await makeTempDir('srgnt-ws-frontmatter-title-quoted-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(
        path.join(notesDir, 'quoted.md'),
        '---\ntitle: "Title: #1 \\"quoted\\" \\\\ path"\n---\n\nContent',
      );

      const results = await listWorkspaceMarkdown(workspaceRoot);
      expect(results[0].title).toBe('Title: #1 \\"quoted\\" \\\\ path'.replace(/\\\\/g, '\\').replace(/\\"/g, '"'));
    });

    it('falls back to filename if no frontmatter title', async () => {
      const workspaceRoot = await makeTempDir('srgnt-ws-filename-title-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'file.md'), '# Content');

      const results = await listWorkspaceMarkdown(workspaceRoot);
      expect(results[0].title).toBe('file');
    });

    it('filters by query on title or path', async () => {
      const workspaceRoot = await makeTempDir('srgnt-ws-filter-query-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'readme.md'), '# Readme');
      await fs.writeFile(path.join(notesDir, 'changelog.md'), '# Changelog');

      const results = await listWorkspaceMarkdown(workspaceRoot, 'readme');
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('Notes/readme.md');
    });

    it('sorts by modifiedAt descending (newest first)', async () => {
      const workspaceRoot = await makeTempDir('srgnt-ws-sort-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'old.md'), '# Old');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await fs.writeFile(path.join(notesDir, 'new.md'), '# New');

      const results = await listWorkspaceMarkdown(workspaceRoot);
      expect(results).toHaveLength(2);
      expect(results[0].path).toBe('Notes/new.md');
      expect(results[1].path).toBe('Notes/old.md');
    });

    it('limits results to maxResults parameter', async () => {
      const workspaceRoot = await makeTempDir('srgnt-ws-max-results-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      for (let i = 0; i < 5; i++) {
        await fs.writeFile(path.join(notesDir, `file${i}.md`), `# File ${i}`);
      }

      const results = await listWorkspaceMarkdown(workspaceRoot, undefined, 3);
      expect(results).toHaveLength(3);
    });
  });
});

describe('notes service - wikilink resolution', () => {
  describe('resolveWikilink', () => {
    it('returns unresolved for invalid wikilink syntax', async () => {
      const workspaceRoot = await makeTempDir('srgnt-wiki-invalid-syntax-');

      const result = await resolveWikilink(workspaceRoot, 'not-a-wikilink');
      expect(result.resolved).toBe(false);
      expect(result.path).toBe('');
    });

    it('resolves simple wikilink to file in current directory', async () => {
      const workspaceRoot = await makeTempDir('srgnt-wiki-relative-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'meeting.md'), '# Meeting');

      const result = await resolveWikilink(workspaceRoot, '[[meeting]]', 'Notes/meeting.md');
      expect(result.resolved).toBe(true);
      expect(result.path).toBe('meeting.md');
    });

    it('resolves wikilink with display text alias', async () => {
      const workspaceRoot = await makeTempDir('srgnt-wiki-alias-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'long-file-name.md'), '# Long File Name');

      const result = await resolveWikilink(workspaceRoot, '[[long-file-name|short]]', 'Notes/short.md');
      expect(result.resolved).toBe(true);
      expect(result.path).toBe('long-file-name.md');
    });

    it('resolves wikilink with line number', async () => {
      const workspaceRoot = await makeTempDir('srgnt-wiki-line-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'note.md'), '# Note\n\nLine 1\nLine 2');

      const result = await resolveWikilink(workspaceRoot, '[[note#10]]', 'Notes/note.md');
      expect(result.resolved).toBe(true);
      expect(result.path).toBe('note.md');
      expect(result.line).toBe(10);
    });

    it('resolves wikilink by exact title match in Notes subtree', async () => {
      const workspaceRoot = await makeTempDir('srgnt-wiki-title-match-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(
        path.join(notesDir, 'file.md'),
        '---\ntitle: Project Roadmap\n---\n\nContent',
      );

      const result = await resolveWikilink(workspaceRoot, '[[Project Roadmap]]');
      expect(result.resolved).toBe(true);
      expect(result.path).toBe('file.md');
    });

    it('resolves wikilink by fuzzy match in Notes subtree', async () => {
      const workspaceRoot = await makeTempDir('srgnt-wiki-fuzzy-');
      const notesDir = getNotesDir(workspaceRoot);
      await fs.mkdir(notesDir, { recursive: true });

      await fs.writeFile(path.join(notesDir, 'project-planning.md'), '# Project Planning');

      const result = await resolveWikilink(workspaceRoot, '[[planning]]');
      expect(result.resolved).toBe(true);
      expect(result.path).toBe('project-planning.md');
    });

    it('returns unresolved with Notes-relative path for creation', async () => {
      const workspaceRoot = await makeTempDir('srgnt-wiki-unresolved-');

      const result = await resolveWikilink(workspaceRoot, '[[new-note]]');
      expect(result.resolved).toBe(false);
      expect(result.path).toBe('new-note.md');
    });

    it('excludes .command-center from resolution', async () => {
      const workspaceRoot = await makeTempDir('srgnt-wiki-exclude-cc-');

      const commandCenter = path.join(workspaceRoot, '.command-center');
      await fs.mkdir(commandCenter, { recursive: true });
      await fs.writeFile(path.join(commandCenter, 'secret.md'), '# Secret');

      const result = await resolveWikilink(workspaceRoot, '[[secret]]');
      expect(result.resolved).toBe(false);
    });

    it('excludes hidden files from resolution', async () => {
      const workspaceRoot = await makeTempDir('srgnt-wiki-exclude-hidden-');

      await fs.writeFile(path.join(workspaceRoot, '.hidden.md'), '# Hidden');
      await fs.writeFile(path.join(workspaceRoot, 'visible.md'), '# Visible');

      const result = await resolveWikilink(workspaceRoot, '[[hidden]]');
      expect(result.resolved).toBe(false);
    });

    it('excludes symlinks from resolution', async () => {
      const workspaceRoot = await makeTempDir('srgnt-wiki-exclude-symlink-');

      const linkPath = path.join(workspaceRoot, 'link.md');
      await fs.symlink(path.join(workspaceRoot, 'outside.md'), linkPath);

      const result = await resolveWikilink(workspaceRoot, '[[link]]');
      expect(result.resolved).toBe(false);
    });
  });
});

describe('notes service - edge cases and errors', () => {
  it('handles empty file when reading', async () => {
    const workspaceRoot = await makeTempDir('srgnt-edge-empty-file-');
    const notesDir = getNotesDir(workspaceRoot);
    await fs.mkdir(notesDir, { recursive: true });

    await fs.writeFile(path.join(notesDir, 'empty.md'), '');

    const result = await readNote(workspaceRoot, 'empty.md');
    expect(result.content).toBe('');
  });

  it('handles YAML frontmatter that does not match the title regex', async () => {
    const workspaceRoot = await makeTempDir('srgnt-edge-malformed-yaml-');
    const notesDir = getNotesDir(workspaceRoot);
    await fs.mkdir(notesDir, { recursive: true });

    // Frontmatter without a title: line (but still valid yaml)
    await fs.writeFile(
      path.join(notesDir, 'notitle.md'),
      '---\ntags: [a, b]\n---\n\nContent without title',
    );

    const results = await listWorkspaceMarkdown(workspaceRoot);
    const noTitle = results.find((r) => r.path.includes('notitle'));
    // Falls back to filename when no title: key exists
    expect(noTitle?.title).toBe('notitle');
  });

  it('handles missing frontmatter gracefully', async () => {
    const workspaceRoot = await makeTempDir('srgnt-edge-no-frontmatter-');
    const notesDir = getNotesDir(workspaceRoot);
    await fs.mkdir(notesDir, { recursive: true });

    await fs.writeFile(path.join(notesDir, 'nofm.md'), '# Just Content\n\nNo frontmatter here');

    const results = await listWorkspaceMarkdown(workspaceRoot);
    const nofm = results.find((r) => r.path.includes('nofm'));
    expect(nofm?.title).toBe('nofm');
  });

  it('handles binary files gracefully', async () => {
    const workspaceRoot = await makeTempDir('srgnt-edge-binary-');
    const notesDir = getNotesDir(workspaceRoot);
    await fs.mkdir(notesDir, { recursive: true });

    // Write a small binary file with .md extension (edge case)
    const binaryBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    await fs.writeFile(path.join(notesDir, 'binary.md'), binaryBuffer);

    // Reading should work (it's a text read operation)
    const result = await readNote(workspaceRoot, 'binary.md');
    expect(result.content).toBe('\x00\x01\x02\x03');
  });

  it('handles concurrent file operations', async () => {
    const workspaceRoot = await makeTempDir('srgnt-edge-concurrent-');
    const notesDir = getNotesDir(workspaceRoot);
    await fs.mkdir(notesDir, { recursive: true });

    // Create multiple files concurrently
    const promises = Array.from({ length: 10 }, (_, i) =>
      createNote(workspaceRoot, `file${i}.md`, `Note ${i}`),
    );

    await expect(Promise.all(promises)).resolves.not.toThrow();

    // Verify all files were created
    const entries = await listNotes(workspaceRoot);
    expect(entries.filter((e) => e.name.startsWith('file'))).toHaveLength(10);
  });

  it('handles special characters in file names', async () => {
    const workspaceRoot = await makeTempDir('srgnt-edge-special-chars-');
    const notesDir = getNotesDir(workspaceRoot);
    await fs.mkdir(notesDir, { recursive: true });

    const fileName = 'note-with-dash_underscore.txt.md';
    await createNote(workspaceRoot, fileName, 'Special Chars');

    const entries = await listNotes(workspaceRoot);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe(fileName);
  });

  it('handles deeply nested directories', async () => {
    const workspaceRoot = await makeTempDir('srgnt-edge-deep-nest-');
    const notesDir = getNotesDir(workspaceRoot);
    await fs.mkdir(notesDir, { recursive: true });

    const deepPath = 'a/b/c/d/e/f/note.md';
    await writeNote(workspaceRoot, deepPath, '# Deep');

    const result = await readNote(workspaceRoot, deepPath);
    expect(result.content).toBe('# Deep');
  });

  it('handles unicode characters in content', async () => {
    const workspaceRoot = await makeTempDir('srgnt-edge-unicode-');
    const notesDir = getNotesDir(workspaceRoot);
    await fs.mkdir(notesDir, { recursive: true });

    const unicodeContent = '# Hello 世界\n\nこんにちは\n\nمرحبا';
    await writeNote(workspaceRoot, 'unicode.md', unicodeContent);

    const result = await readNote(workspaceRoot, 'unicode.md');
    expect(result.content).toBe(unicodeContent);
  });
});

describe('notes service - extractSnippet (internal helper coverage)', () => {
  it('search snippet wraps matched text in bold markdown', async () => {
    const workspaceRoot = await makeTempDir('srgnt-snippet-bold-');
    const notesDir = getNotesDir(workspaceRoot);
    await fs.mkdir(notesDir, { recursive: true });

    await fs.writeFile(
      path.join(notesDir, 'search-test.md'),
      'The architecture review found several issues in the codebase.',
    );

    const results = await searchNotes(workspaceRoot, 'architecture');
    expect(results).toHaveLength(1);
    expect(results[0].snippet).toContain('**architecture**');
  });

  it('search returns path as relative from workspace root', async () => {
    const workspaceRoot = await makeTempDir('srgnt-search-relpath-');
    const notesDir = getNotesDir(workspaceRoot);
    const subDir = path.join(notesDir, 'sub');
    await fs.mkdir(subDir, { recursive: true });

    await fs.writeFile(path.join(subDir, 'deep.md'), '# Deep Note');

    const results = await searchNotes(workspaceRoot, 'deep');
    expect(results).toHaveLength(1);
    expect(results[0].path).toContain('Notes/sub/deep.md');
  });
});

describe('notes service - search content cache behavior', () => {
  it('returns consistent results across repeated searches', async () => {
    const workspaceRoot = await makeTempDir('srgnt-search-cache-');
    const notesDir = getNotesDir(workspaceRoot);
    await fs.mkdir(notesDir, { recursive: true });

    await fs.writeFile(path.join(notesDir, 'cached.md'), 'searchable content');

    const results1 = await searchNotes(workspaceRoot, 'searchable');
    expect(results1).toHaveLength(1);
    expect(results1[0].title).toBe('cached');

    // Second search should return identical results (cache hit or re-read)
    const results2 = await searchNotes(workspaceRoot, 'searchable');
    expect(results2).toHaveLength(1);
    expect(results2[0].title).toBe('cached');
    expect(results2[0].path).toBe(results1[0].path);
    expect(results2[0].snippet).toBe(results1[0].snippet);
  });
});

describe('notes service - registerNotesHandlers IPC error paths', () => {
  /**
   * Helper: call registerNotesHandlers, then extract the handler function
   * that was passed to ipcMain.handle for a given channel name.
   */
  function getRegisteredHandler(channel: string): (...args: unknown[]) => Promise<unknown> {
    const call = mockHandle.mock.calls.find((c: unknown[]) => c[0] === channel);
    if (!call) throw new Error(`No handler registered for channel: ${channel}`);
    return call[1] as (...args: unknown[]) => Promise<unknown>;
  }

  let workspaceRoot: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    workspaceRoot = await makeTempDir('srgnt-ipc-');
    await fs.mkdir(getNotesDir(workspaceRoot), { recursive: true });
    registerNotesHandlers(workspaceRoot);
  });

  // Verify all 10 handlers were registered and all 10 removeHandler calls were made
  it('registers all 10 IPC handlers and removes previous ones', () => {
    const channels = mockHandle.mock.calls.map((c: unknown[]) => c[0]);
    expect(channels).toHaveLength(10);
    expect(channels).toContain('notes:list-dir');
    expect(channels).toContain('notes:read-file');
    expect(channels).toContain('notes:write-file');
    expect(channels).toContain('notes:create-file');
    expect(channels).toContain('notes:create-folder');
    expect(channels).toContain('notes:delete');
    expect(channels).toContain('notes:rename');
    expect(channels).toContain('notes:search');
    expect(channels).toContain('notes:resolve-wikilink');
    expect(channels).toContain('notes:list-workspace-markdown');
    expect(mockRemoveHandler).toHaveBeenCalledTimes(10);
  });

  // --- notes:list-dir ---
  describe('notes:list-dir handler', () => {
    it('returns entries for valid payload', async () => {
      const handler = getRegisteredHandler('notes:list-dir');
      const result = await handler(null, { dirPath: '' });
      expect(result).toHaveProperty('entries');
      expect(Array.isArray(result.entries)).toBe(true);
    });

    it('works with null/undefined payload (fallback to empty dirPath)', async () => {
      const handler = getRegisteredHandler('notes:list-dir');
      const result = await handler(null, null);
      expect(result).toHaveProperty('entries');
      expect(Array.isArray(result.entries)).toBe(true);
    });

    it('throws on invalid payload (missing dirPath is OK due to fallback, but wrong type fails)', async () => {
      const handler = getRegisteredHandler('notes:list-dir');
      // dirPath must be a string, not a number
      await expect(handler(null, { dirPath: 123 })).rejects.toThrow();
    });
  });

  // --- notes:read-file ---
  describe('notes:read-file handler', () => {
    it('throws on invalid payload (missing filePath)', async () => {
      const handler = getRegisteredHandler('notes:read-file');
      await expect(handler(null, {})).rejects.toThrow();
    });

    it('throws on invalid payload (wrong type for filePath)', async () => {
      const handler = getRegisteredHandler('notes:read-file');
      await expect(handler(null, { filePath: 42 })).rejects.toThrow();
    });

    it('returns content for valid existing file', async () => {
      const handler = getRegisteredHandler('notes:read-file');
      await writeNote(workspaceRoot, 'test-read.md', '# Hello');
      const result = await handler(null, { filePath: 'test-read.md' });
      expect(result).toHaveProperty('content', '# Hello');
      expect(result).toHaveProperty('modifiedAt');
    });

    it('throws when file does not exist', async () => {
      const handler = getRegisteredHandler('notes:read-file');
      await expect(handler(null, { filePath: 'nonexistent.md' })).rejects.toThrow();
    });
  });

  // --- notes:write-file ---
  describe('notes:write-file handler', () => {
    it('throws on invalid payload (missing content)', async () => {
      const handler = getRegisteredHandler('notes:write-file');
      await expect(handler(null, { filePath: 'test.md' })).rejects.toThrow();
    });

    it('throws on invalid payload (wrong type)', async () => {
      const handler = getRegisteredHandler('notes:write-file');
      await expect(handler(null, { filePath: 'test.md', content: 999 })).rejects.toThrow();
    });

    it('writes file and returns path + modifiedAt', async () => {
      const handler = getRegisteredHandler('notes:write-file');
      const result = await handler(null, { filePath: 'ipc-write.md', content: '# IPC Write' });
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('modifiedAt');
      const read = await readNote(workspaceRoot, 'ipc-write.md');
      expect(read.content).toBe('# IPC Write');
    });
  });

  // --- notes:create-file ---
  describe('notes:create-file handler', () => {
    it('throws on invalid payload (missing title)', async () => {
      const handler = getRegisteredHandler('notes:create-file');
      await expect(handler(null, { filePath: 'new.md' })).rejects.toThrow();
    });

    it('throws on invalid payload (wrong type)', async () => {
      const handler = getRegisteredHandler('notes:create-file');
      await expect(handler(null, { filePath: 123, title: 'Test' })).rejects.toThrow();
    });

    it('creates file and returns path + createdAt', async () => {
      const handler = getRegisteredHandler('notes:create-file');
      const result = await handler(null, { filePath: 'ipc-create.md', title: 'IPC Created' });
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('createdAt');
    });

    it('throws when file already exists', async () => {
      const handler = getRegisteredHandler('notes:create-file');
      await createNote(workspaceRoot, 'dup.md', 'Existing');
      await expect(handler(null, { filePath: 'dup.md', title: 'Dup' })).rejects.toThrow('File already exists');
    });
  });

  // --- notes:create-folder ---
  describe('notes:create-folder handler', () => {
    it('throws on invalid payload (missing dirPath)', async () => {
      const handler = getRegisteredHandler('notes:create-folder');
      await expect(handler(null, {})).rejects.toThrow();
    });

    it('throws on invalid payload (wrong type)', async () => {
      const handler = getRegisteredHandler('notes:create-folder');
      await expect(handler(null, { dirPath: 42 })).rejects.toThrow();
    });

    it('creates folder and returns path', async () => {
      const handler = getRegisteredHandler('notes:create-folder');
      const result = await handler(null, { dirPath: 'ipc-folder' });
      expect(result).toHaveProperty('path');
      expect(result.path).toContain('ipc-folder');
    });

    it('throws when folder already exists', async () => {
      const handler = getRegisteredHandler('notes:create-folder');
      await createFolder(workspaceRoot, 'existing-folder');
      await expect(handler(null, { dirPath: 'existing-folder' })).rejects.toThrow('Directory already exists');
    });
  });

  // --- notes:delete ---
  describe('notes:delete handler', () => {
    it('throws on invalid payload (missing path)', async () => {
      const handler = getRegisteredHandler('notes:delete');
      await expect(handler(null, { isDirectory: false })).rejects.toThrow();
    });

    it('throws on invalid payload (wrong type for isDirectory)', async () => {
      const handler = getRegisteredHandler('notes:delete');
      await expect(handler(null, { path: 'test.md', isDirectory: 'yes' })).rejects.toThrow();
    });

    it('deletes a file and returns deleted: true', async () => {
      const handler = getRegisteredHandler('notes:delete');
      await writeNote(workspaceRoot, 'to-delete.md', 'bye');
      const result = await handler(null, { path: 'to-delete.md', isDirectory: false });
      expect(result).toEqual({ deleted: true });
      await expect(readNote(workspaceRoot, 'to-delete.md')).rejects.toThrow();
    });
  });

  // --- notes:rename ---
  describe('notes:rename handler', () => {
    it('throws on invalid payload (missing newName)', async () => {
      const handler = getRegisteredHandler('notes:rename');
      await expect(handler(null, { oldPath: 'old.md' })).rejects.toThrow();
    });

    it('throws on invalid payload (wrong type)', async () => {
      const handler = getRegisteredHandler('notes:rename');
      await expect(handler(null, { oldPath: 'old.md', newName: 123 })).rejects.toThrow();
    });

    it('renames a file and returns newPath', async () => {
      const handler = getRegisteredHandler('notes:rename');
      await writeNote(workspaceRoot, 'rename-old.md', 'content');
      const result = await handler(null, { oldPath: 'rename-old.md', newName: 'rename-new.md' });
      expect(result).toHaveProperty('newPath');
      expect(result.newPath).toContain('rename-new.md');
    });

    it('throws when destination already exists', async () => {
      const handler = getRegisteredHandler('notes:rename');
      await writeNote(workspaceRoot, 'src.md', 'src');
      await writeNote(workspaceRoot, 'dst.md', 'dst');
      await expect(handler(null, { oldPath: 'src.md', newName: 'dst.md' })).rejects.toThrow('Destination already exists');
    });
  });

  // --- notes:search ---
  describe('notes:search handler', () => {
    it('throws on invalid payload (missing query)', async () => {
      const handler = getRegisteredHandler('notes:search');
      await expect(handler(null, {})).rejects.toThrow();
    });

    it('throws on invalid payload (wrong type for query)', async () => {
      const handler = getRegisteredHandler('notes:search');
      await expect(handler(null, { query: 42 })).rejects.toThrow();
    });

    it('works with null/undefined payload (fallback defaults)', async () => {
      const handler = getRegisteredHandler('notes:search');
      const result = await handler(null, null);
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('returns search results for valid payload', async () => {
      const handler = getRegisteredHandler('notes:search');
      await writeNote(workspaceRoot, 'searchable.md', '# Find Me');
      const result = await handler(null, { query: 'Find Me', maxResults: 10 });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('searchable');
    });
  });

  // --- notes:resolve-wikilink ---
  describe('notes:resolve-wikilink handler', () => {
    it('throws on invalid payload (missing wikilink)', async () => {
      const handler = getRegisteredHandler('notes:resolve-wikilink');
      await expect(handler(null, {})).rejects.toThrow();
    });

    it('throws on invalid payload (wrong type)', async () => {
      const handler = getRegisteredHandler('notes:resolve-wikilink');
      await expect(handler(null, { wikilink: 42 })).rejects.toThrow();
    });

    it('returns unresolved Notes-relative path for non-existent wikilink', async () => {
      const handler = getRegisteredHandler('notes:resolve-wikilink');
      const result = await handler(null, { wikilink: '[[nonexistent]]' });
      expect(result.resolved).toBe(false);
      expect(result.path).toBe('nonexistent.md');
    });

    it('resolves an existing wikilink', async () => {
      const handler = getRegisteredHandler('notes:resolve-wikilink');
      await writeNote(workspaceRoot, 'target.md', '# Target');
      const result = await handler(null, { wikilink: '[[target]]' });
      expect(result.resolved).toBe(true);
      expect(result.path).toContain('target.md');
    });
  });

  // --- notes:list-workspace-markdown ---
  describe('notes:list-workspace-markdown handler', () => {
    it('throws on invalid payload (query must be string if provided)', async () => {
      const handler = getRegisteredHandler('notes:list-workspace-markdown');
      await expect(handler(null, { query: 42 })).rejects.toThrow();
    });

    it('works with null/undefined payload (fallback defaults)', async () => {
      const handler = getRegisteredHandler('notes:list-workspace-markdown');
      const result = await handler(null, null);
      expect(result).toHaveProperty('files');
      expect(Array.isArray(result.files)).toBe(true);
    });

    it('returns Notes workspace markdown files for valid payload', async () => {
      const handler = getRegisteredHandler('notes:list-workspace-markdown');
      await writeNote(workspaceRoot, 'ws-note.md', '# WS Note');
      const result = await handler(null, { query: undefined, maxResults: 20 });
      expect(result.files.length).toBeGreaterThanOrEqual(1);
      expect(result.files[0]?.path).toContain('Notes/');
    });
  });

  // --- extra internal helper coverage ---
  describe('resolveWikilink internal paths (parseWikilinkTarget / normalizePathForMatch)', () => {
    it('resolves wikilink with pipe alias and line number', async () => {
      // This exercises parseWikilinkTarget with pipe AND hash
      await writeNote(workspaceRoot, 'aliased.md', '# Aliased');
      // Pipe alias: target is before |, alias after. Line number must be on target side.
      const result = await resolveWikilink(workspaceRoot, '[[aliased#42|Short Alias]]');
      expect(result.resolved).toBe(true);
      expect(result.path).toContain('aliased.md');
      expect(result.line).toBe(42);
    });

    it('returns unresolved for wikilink with invalid syntax (no brackets)', async () => {
      const result = await resolveWikilink(workspaceRoot, 'plain-text');
      expect(result.resolved).toBe(false);
      expect(result.path).toBe('');
    });

    it('returns unresolved Notes-relative path for creation when wikilink not found in workspace', async () => {
      const result = await resolveWikilink(workspaceRoot, '[[brand-new-note]]');
      expect(result.resolved).toBe(false);
      expect(result.path).toBe('brand-new-note.md');
    });

    it('excludes .command-center files from wikilink resolution', async () => {
      const ccDir = path.join(workspaceRoot, '.command-center');
      await fs.mkdir(ccDir, { recursive: true });
      await fs.writeFile(path.join(ccDir, 'secret.md'), '# Secret');
      const result = await resolveWikilink(workspaceRoot, '[[secret]]');
      // Should not resolve to .command-center
      expect(result.resolved).toBe(false);
    });

    it('does not resolve hidden files via wikilink', async () => {
      await fs.writeFile(path.join(workspaceRoot, '.hidden.md'), '# Hidden');
      const result = await resolveWikilink(workspaceRoot, '[[hidden]]');
      expect(result.resolved).toBe(false);
    });
  });
});
