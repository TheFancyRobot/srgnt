import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { bootstrapWorkspace, validateWorkspace, WorkspaceBootstrapError } from './bootstrap.js';

const expectedDirs = ['projects', 'groups', 'groups/templates'];
const expectedFiles = ['harnesses.json', 'settings.json'];

describe('bootstrapWorkspace', () => {
  const testRoot = '/tmp/srgnt-workspace-test';

  beforeEach(async () => {
    await fs.rm(testRoot, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(testRoot, { recursive: true, force: true });
  });

  it('creates exactly the v2 layout on first run', async () => {
    const result = await bootstrapWorkspace(testRoot, { create: true });

    expect(result.workspaceRoot.path).toBe(testRoot);
    expect(result.created).toBe(true);
    expect(result.missingDirectories).toEqual([]);

    for (const dir of expectedDirs) {
      const stat = await fs.stat(path.join(testRoot, dir));
      expect(stat.isDirectory()).toBe(true);
    }

    for (const file of expectedFiles) {
      const stat = await fs.stat(path.join(testRoot, file));
      expect(stat.isFile()).toBe(true);
    }

    // Nothing beyond the v2 layout is created — no PARA aggregator dirs.
    const rootEntries = (await fs.readdir(testRoot)).sort();
    expect(rootEntries).toEqual(['groups', 'harnesses.json', 'projects', 'settings.json']);
  });

  it('seeds harnesses.json and settings.json with valid JSON defaults', async () => {
    await bootstrapWorkspace(testRoot, { create: true });

    const harnesses = JSON.parse(await fs.readFile(path.join(testRoot, 'harnesses.json'), 'utf8'));
    expect(harnesses).toEqual({ version: 1, harnesses: [] });

    const settings = JSON.parse(await fs.readFile(path.join(testRoot, 'settings.json'), 'utf8'));
    expect(settings).toEqual({});
  });

  it('is idempotent: re-running reports created=false and changes nothing', async () => {
    await bootstrapWorkspace(testRoot, { create: true });
    const result = await bootstrapWorkspace(testRoot);

    expect(result.created).toBe(false);
    expect(result.missingDirectories).toEqual([]);
    expect(result.workspaceRoot.path).toBe(testRoot);
  });

  it('never overwrites existing seed files', async () => {
    await bootstrapWorkspace(testRoot, { create: true });
    const customSettings = '{ "theme": "dark" }\n';
    await fs.writeFile(path.join(testRoot, 'settings.json'), customSettings, 'utf8');

    await bootstrapWorkspace(testRoot);

    const preserved = await fs.readFile(path.join(testRoot, 'settings.json'), 'utf8');
    expect(preserved).toBe(customSettings);
  });

  it('recreates missing directories and seed files on reopen', async () => {
    await bootstrapWorkspace(testRoot, { create: true });

    await fs.rm(path.join(testRoot, 'projects'), { recursive: true, force: true });
    await fs.rm(path.join(testRoot, 'groups/templates'), { recursive: true, force: true });
    await fs.rm(path.join(testRoot, 'harnesses.json'), { force: true });

    const result = await bootstrapWorkspace(testRoot);

    expect(result.created).toBe(true);
    expect(result.missingDirectories).toEqual([]);
    expect((await fs.stat(path.join(testRoot, 'projects'))).isDirectory()).toBe(true);
    expect((await fs.stat(path.join(testRoot, 'groups/templates'))).isDirectory()).toBe(true);
    expect((await fs.stat(path.join(testRoot, 'harnesses.json'))).isFile()).toBe(true);
  });

  it('ignores aggregator-era v1 directories and never removes user data', async () => {
    // Simulate an existing aggregator-era workspace.
    await fs.mkdir(path.join(testRoot, 'Daily'), { recursive: true });
    await fs.mkdir(path.join(testRoot, '.command-center/config'), { recursive: true });
    const userNote = path.join(testRoot, 'Daily', 'note.md');
    await fs.writeFile(userNote, '# do not lose me\n', 'utf8');

    const result = await bootstrapWorkspace(testRoot);

    expect(result.created).toBe(true);
    expect(await fs.readFile(userNote, 'utf8')).toBe('# do not lose me\n');
    expect((await fs.stat(path.join(testRoot, '.command-center/config'))).isDirectory()).toBe(true);
    expect((await fs.stat(path.join(testRoot, 'projects'))).isDirectory()).toBe(true);
  });

  it('resolves layout paths against the workspace root in the result', async () => {
    const result = await bootstrapWorkspace(testRoot, { create: true });
    const layoutDirs = result.workspaceRoot.layout.directories.map((dir) => dir.path);
    expect(layoutDirs).toEqual(expectedDirs.map((dir) => path.join(testRoot, dir)));
    const layoutFiles = result.workspaceRoot.layout.seedFiles.map((file) => file.path);
    expect(layoutFiles).toEqual(expectedFiles.map((file) => path.join(testRoot, file)));
  });

  it('throws WorkspaceBootstrapError when workspace root does not exist', async () => {
    await expect(bootstrapWorkspace('/non/existent/path')).rejects.toThrow(WorkspaceBootstrapError);
  });

  it('throws WorkspaceBootstrapError with permission-denied cause for invalid permissions', async () => {
    if (process.platform === 'win32') {
      return;
    }

    await bootstrapWorkspace(testRoot, { create: true });

    if (process.getuid && process.getuid() === 0) {
      return;
    }

    await fs.chmod(testRoot, 0o000);

    try {
      await expect(bootstrapWorkspace(testRoot)).rejects.toThrow(WorkspaceBootstrapError);
    } finally {
      await fs.chmod(testRoot, 0o755).catch(() => {});
    }
  });

  it('handles paths with spaces correctly', async () => {
    const pathWithSpaces = '/tmp/srgnt workspace test';
    try {
      await fs.rm(pathWithSpaces, { recursive: true, force: true });
      const result = await bootstrapWorkspace(pathWithSpaces, { create: true });
      expect(result.workspaceRoot.path).toBe(pathWithSpaces);
      expect(result.created).toBe(true);
    } finally {
      await fs.rm(pathWithSpaces, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe('validateWorkspace', () => {
  const testRoot = '/tmp/srgnt-workspace-test';

  beforeEach(async () => {
    await fs.rm(testRoot, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(testRoot, { recursive: true, force: true });
  });

  it('returns valid=true for a complete v2 workspace', async () => {
    await bootstrapWorkspace(testRoot, { create: true });
    const result = await validateWorkspace(testRoot);
    expect(result.valid).toBe(true);
    expect(result.missingDirectories).toEqual([]);
    expect(result.missingFiles).toEqual([]);
  });

  it('reports missing directories without creating them', async () => {
    await bootstrapWorkspace(testRoot, { create: true });
    await fs.rm(path.join(testRoot, 'projects'), { recursive: true, force: true });
    await fs.rm(path.join(testRoot, 'groups/templates'), { recursive: true, force: true });

    const result = await validateWorkspace(testRoot);
    expect(result.valid).toBe(false);
    expect(result.missingDirectories).toContain(path.join(testRoot, 'projects'));
    expect(result.missingDirectories).toContain(path.join(testRoot, 'groups/templates'));

    // validate() is read-only: still missing afterwards.
    await expect(fs.stat(path.join(testRoot, 'projects'))).rejects.toThrow();
  });

  it('reports missing seed files', async () => {
    await bootstrapWorkspace(testRoot, { create: true });
    await fs.rm(path.join(testRoot, 'harnesses.json'), { force: true });

    const result = await validateWorkspace(testRoot);
    expect(result.valid).toBe(false);
    expect(result.missingFiles).toEqual([path.join(testRoot, 'harnesses.json')]);
  });

  it('throws WorkspaceBootstrapError when workspace root does not exist', async () => {
    await expect(validateWorkspace('/non/existent/path')).rejects.toThrow(WorkspaceBootstrapError);
  });
});
