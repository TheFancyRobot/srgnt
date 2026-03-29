import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { bootstrapWorkspace, validateWorkspace, WorkspaceBootstrapError } from './bootstrap.js';

describe('bootstrapWorkspace', () => {
  const testRoot = '/tmp/srgnt-workspace-test';

  beforeEach(async () => {
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('creates workspace root and all subdirectories on first run', async () => {
    const result = await bootstrapWorkspace(testRoot, { create: true });

    expect(result.workspaceRoot.path).toBe(testRoot);
    expect(result.created).toBe(true);
    expect(result.missingDirectories).toEqual([]);

    const expectedDirs = [
      'Daily', 'Projects', 'People', 'Meetings', 'Systems', 'Dashboards', 'Inbox',
      '.command-center/config', '.command-center/skills', '.command-center/connectors',
      '.command-center/state', '.command-center/logs', '.command-center/cache',
      '.command-center/templates', '.command-center/approvals', '.command-center/runs',
    ];

    for (const dir of expectedDirs) {
      const fullPath = path.join(testRoot, dir);
      const stat = await fs.stat(fullPath);
      expect(stat.isDirectory()).toBe(true);
    }
  });

  it('returns created=false when reopening existing workspace', async () => {
    await bootstrapWorkspace(testRoot, { create: true });
    const result = await bootstrapWorkspace(testRoot);

    expect(result.created).toBe(false);
    expect(result.workspaceRoot.path).toBe(testRoot);
  });

  it('detects missing directories and creates them on reopen', async () => {
    await bootstrapWorkspace(testRoot, { create: true });

    await fs.rm(path.join(testRoot, 'Daily'), { recursive: true, force: true });
    await fs.rm(path.join(testRoot, '.command-center/logs'), { recursive: true, force: true });

    const result = await bootstrapWorkspace(testRoot);

    expect(result.missingDirectories).toEqual([]);
    expect(result.created).toBe(true);

    const dailyStat = await fs.stat(path.join(testRoot, 'Daily'));
    expect(dailyStat.isDirectory()).toBe(true);
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

  it('handles paths with special characters correctly', async () => {
    const pathWithSpecial = '/tmp/srgnt-workspace_123';
    try {
      await fs.rm(pathWithSpecial, { recursive: true, force: true });
      const result = await bootstrapWorkspace(pathWithSpecial, { create: true });
      expect(result.workspaceRoot.path).toBe(pathWithSpecial);
      expect(result.created).toBe(true);
    } finally {
      await fs.rm(pathWithSpecial, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe('validateWorkspace', () => {
  const testRoot = '/tmp/srgnt-workspace-test';

  beforeEach(async () => {
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('returns valid=true for a complete workspace', async () => {
    await bootstrapWorkspace(testRoot, { create: true });
    const result = await validateWorkspace(testRoot);
    expect(result.valid).toBe(true);
    expect(result.missingDirectories).toEqual([]);
  });

  it('returns valid=false with missing directories', async () => {
    await bootstrapWorkspace(testRoot, { create: true });
    await fs.rm(path.join(testRoot, 'Daily'), { recursive: true, force: true });
    await fs.rm(path.join(testRoot, '.command-center/runs'), { recursive: true, force: true });

    const result = await validateWorkspace(testRoot);
    expect(result.valid).toBe(false);
    expect(result.missingDirectories).toContain(path.join(testRoot, 'Daily'));
    expect(result.missingDirectories).toContain(path.join(testRoot, '.command-center/runs'));
  });

  it('throws WorkspaceBootstrapError when workspace root does not exist', async () => {
    await expect(validateWorkspace('/non/existent/path')).rejects.toThrow(WorkspaceBootstrapError);
  });
});