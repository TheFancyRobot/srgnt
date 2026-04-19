import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { Dirent, Stats } from 'fs';
import {
  makeCorpusPolicyConfig,
  isEscapedPath,
  isExcludedDirectory,
  isExcludedPath,
  validateWorkspaceRoot,
  walkCorpusFiles,
  collectCorpusFiles,
  type CorpusPolicyFs,
} from './corpus-policy.js';
import { CorpusPolicyError } from './errors.js';

function makeDirent(name: string, kind: 'file' | 'dir' | 'other' = 'file'): Dirent {
  return {
    name,
    isFile: () => kind === 'file',
    isDirectory: () => kind === 'dir',
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
  } as Dirent;
}

function makeStats(options: {
  isDirectory?: boolean;
  isSymbolicLink?: boolean;
  size?: number;
  mtimeMs?: number;
} = {}): Stats {
  return {
    size: options.size ?? 10,
    mtimeMs: options.mtimeMs ?? 100,
    isDirectory: () => options.isDirectory ?? false,
    isFile: () => !(options.isDirectory ?? false) && !(options.isSymbolicLink ?? false),
    isSymbolicLink: () => options.isSymbolicLink ?? false,
  } as Stats;
}

function makeError(code: string): NodeJS.ErrnoException {
  const err = new Error(code) as NodeJS.ErrnoException;
  err.code = code;
  return err;
}

describe('makeCorpusPolicyConfig', () => {
  it('creates config with defaults', () => {
    const config = makeCorpusPolicyConfig('/workspace');
    expect(config).toEqual({
      workspaceRoot: '/workspace',
      exclusions: ['.agent-vault', '.command-center', '.srgnt-semantic-search'],
      maxFileSizeBytes: 5 * 1024 * 1024,
      acceptedExtensions: ['.md', '.markdown'],
    });
  });
});

describe('isEscapedPath', () => {
  it('detects escaped and malformed paths', () => {
    expect(isEscapedPath('My%20File.md')).toBe(true);
    expect(isEscapedPath('bad%2.md')).toBe(true);
    expect(isEscapedPath('docs/readme.md')).toBe(false);
  });
});

describe('isExcludedDirectory', () => {
  const config = makeCorpusPolicyConfig('/workspace');

  it('returns false for empty path', () => {
    expect(isExcludedDirectory('', config)).toBe(false);
  });

  it('excludes hidden, escaped, and configured directories', () => {
    expect(isExcludedDirectory('.git', config)).toBe(true);
    expect(isExcludedDirectory('docs/My%20Folder', config)).toBe(true);
    expect(isExcludedDirectory('.agent-vault/nested', config)).toBe(true);
    expect(isExcludedDirectory('visible/folder', config)).toBe(false);
  });
});

describe('isExcludedPath', () => {
  const config = makeCorpusPolicyConfig('/workspace');

  it('includes valid markdown files', () => {
    expect(isExcludedPath('docs/readme.md', config)).toBe(false);
    expect(isExcludedPath('notes/Todo.markdown', config)).toBe(false);
    expect(isExcludedPath('docs\\readme.md', config)).toBe(false);
  });

  it('excludes hidden, escaped, configured, and non-markdown paths', () => {
    expect(isExcludedPath('.agent-vault/secret.md', config)).toBe(true);
    expect(isExcludedPath('.command-center/runs/log.md', config)).toBe(true);
    expect(isExcludedPath('.srgnt-semantic-search/index.md', config)).toBe(true);
    expect(isExcludedPath('.hidden/file.md', config)).toBe(true);
    expect(isExcludedPath('docs/.secret.md', config)).toBe(true);
    expect(isExcludedPath('docs/hello%20world.md', config)).toBe(true);
    expect(isExcludedPath('vendor/readme.md', { ...config, exclusions: ['vendor'] })).toBe(true);
    expect(isExcludedPath('image.png', config)).toBe(true);
    expect(isExcludedPath('bad%2.md', config)).toBe(true);
  });
});

describe('validateWorkspaceRoot', () => {
  it('returns stats for a valid directory', async () => {
    const stats = await validateWorkspaceRoot('/workspace', {
      readdir: async () => [],
      lstat: async () => makeStats({ isDirectory: true }),
    });
    expect(stats.isDirectory()).toBe(true);
  });

  it('throws permission-denied for root access errors', async () => {
    await expect(
      validateWorkspaceRoot('/workspace', {
        readdir: async () => [],
        lstat: async () => {
          throw makeError('EACCES');
        },
      })
    ).rejects.toMatchObject({ cause: 'permission-denied' });
  });

  it('throws not-a-directory for missing or file roots', async () => {
    await expect(
      validateWorkspaceRoot('/missing', {
        readdir: async () => [],
        lstat: async () => {
          throw makeError('ENOENT');
        },
      })
    ).rejects.toMatchObject({ cause: 'not-a-directory' });

    await expect(
      validateWorkspaceRoot('/file', {
        readdir: async () => [],
        lstat: async () => makeStats({ isDirectory: false }),
      })
    ).rejects.toMatchObject({ cause: 'not-a-directory' });
  });

  it('throws symlink-rejected for symlink roots', async () => {
    await expect(
      validateWorkspaceRoot('/link', {
        readdir: async () => [],
        lstat: async () => makeStats({ isSymbolicLink: true }),
      })
    ).rejects.toMatchObject({ cause: 'symlink-rejected' });
  });
});

describe('walkCorpusFiles', () => {
  const config = makeCorpusPolicyConfig('/workspace');

  it('collects files while skipping excluded directories and unsupported entries', async () => {
    const fsContext: CorpusPolicyFs = {
      readdir: async (target) => {
        if (target === path.normalize('/workspace')) {
          return [
            makeDirent('notes', 'dir'),
            makeDirent('.agent-vault', 'dir'),
            makeDirent('ignored.sock', 'other'),
          ];
        }

        if (target === path.normalize('/workspace/notes')) {
          return [makeDirent('readme.md', 'file'), makeDirent('big.md', 'file'), makeDirent('asset.png', 'file')];
        }

        return [];
      },
      lstat: async (target) => {
        if (target === path.normalize('/workspace/notes')) return makeStats({ isDirectory: true });
        if (target === path.normalize('/workspace/.agent-vault')) return makeStats({ isDirectory: true });
        if (target === path.normalize('/workspace/notes/readme.md')) return makeStats({ size: 5, mtimeMs: 123 });
        if (target === path.normalize('/workspace/notes/big.md')) return makeStats({ size: 99_999_999 });
        if (target === path.normalize('/workspace/notes/asset.png')) return makeStats({ size: 5, mtimeMs: 50 });
        return makeStats();
      },
    };

    const files = await walkCorpusFiles('/workspace', '/workspace', { ...config, maxFileSizeBytes: 10 }, fsContext);
    expect(files).toEqual([
      {
        absolutePath: path.join(path.normalize('/workspace'), 'notes', 'readme.md'),
        relativePath: 'notes/readme.md',
        size: 5,
        mtimeMs: 123,
      },
    ]);
  });

  it('returns existing files unchanged when a directory was already visited', async () => {
    const files = [{ absolutePath: 'x', relativePath: 'x', size: 1, mtimeMs: 1 }];
    const visited = new Set<string>([path.normalize('/workspace')]);
    const fsContext: CorpusPolicyFs = {
      readdir: async () => {
        throw new Error('should not read visited dir');
      },
      lstat: async () => makeStats(),
    };

    await expect(walkCorpusFiles('/workspace', '/workspace', config, fsContext, visited, files)).resolves.toBe(files);
  });

  it('throws permission-denied for readdir errors', async () => {
    await expect(
      walkCorpusFiles('/workspace', '/workspace', config, {
        readdir: async () => {
          throw makeError('EACCES');
        },
        lstat: async () => makeStats(),
      })
    ).rejects.toMatchObject({ cause: 'permission-denied' });
  });

  it('swallows non-permission readdir errors and returns current files', async () => {
    await expect(
      walkCorpusFiles('/workspace', '/workspace', config, {
        readdir: async () => {
          throw makeError('ENOENT');
        },
        lstat: async () => makeStats(),
      })
    ).resolves.toEqual([]);
  });

  it('throws permission-denied for lstat entry errors', async () => {
    await expect(
      walkCorpusFiles('/workspace', '/workspace', config, {
        readdir: async () => [makeDirent('readme.md', 'file')],
        lstat: async () => {
          throw makeError('EPERM');
        },
      })
    ).rejects.toMatchObject({ cause: 'permission-denied' });
  });

  it('continues on non-permission lstat entry errors', async () => {
    await expect(
      walkCorpusFiles('/workspace', '/workspace', config, {
        readdir: async () => [makeDirent('readme.md', 'file')],
        lstat: async () => {
          throw makeError('ENOENT');
        },
      })
    ).resolves.toEqual([]);
  });

  it('throws when a symlink is encountered during walk', async () => {
    await expect(
      walkCorpusFiles('/workspace', '/workspace', config, {
        readdir: async () => [makeDirent('link.md', 'file')],
        lstat: async () => makeStats({ isSymbolicLink: true }),
      })
    ).rejects.toMatchObject({ cause: 'symlink-rejected' });
  });
});

describe('collectCorpusFiles', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'corpus-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function touch(relativePath: string, content = '# Test\n\nContent here.\n'): Promise<void> {
    const fullPath = path.join(tmpDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  it('returns empty array for empty workspace', async () => {
    await expect(collectCorpusFiles(makeCorpusPolicyConfig(tmpDir))).resolves.toEqual([]);
  });

  it('collects markdown files deterministically with metadata', async () => {
    await touch('z-last.md');
    await touch('notes/readme.markdown');
    await touch('a-first.md');
    await touch('.agent-vault/secret.md');
    await touch('.command-center/log.md');
    await touch('.srgnt-semantic-search/manifest.md');
    await touch('docs/.secret.md');
    await touch('docs/file.png', 'png');
    await touch('docs/My%20File.md');

    const files = await collectCorpusFiles(makeCorpusPolicyConfig(tmpDir));
    expect(files.map((file) => file.relativePath)).toEqual([
      'a-first.md',
      'notes/readme.markdown',
      'z-last.md',
    ]);
    expect(files[0]?.size).toBeGreaterThan(0);
    expect(files[0]?.mtimeMs).toBeGreaterThan(0);
  });

  it('rejects workspace root symlinks', async () => {
    const realWorkspace = path.join(tmpDir, 'real-workspace');
    await fs.mkdir(realWorkspace, { recursive: true });
    await fs.writeFile(path.join(realWorkspace, 'note.md'), '# Test');
    const symlinkWorkspace = path.join(tmpDir, 'workspace-link');
    await fs.symlink(realWorkspace, symlinkWorkspace, 'dir');

    await expect(collectCorpusFiles(makeCorpusPolicyConfig(symlinkWorkspace))).rejects.toMatchObject({
      cause: 'symlink-rejected',
    });
  });

  it('rejects file symlinks encountered during collection', async () => {
    await touch('notes/readme.md');
    await fs.symlink(path.join(tmpDir, 'notes', 'readme.md'), path.join(tmpDir, 'notes', 'link.md'));

    await expect(collectCorpusFiles(makeCorpusPolicyConfig(tmpDir))).rejects.toThrow(CorpusPolicyError);
  });
});
