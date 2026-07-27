import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { defaultWorkspaceLayout, type DesktopSettings } from '@srgnt/contracts';

export interface DesktopBootstrapState {
  workspaceRoot: string;
}

export const defaultDesktopSettings: DesktopSettings = {
  theme: 'system',
  updateChannel: 'stable',
  telemetryEnabled: false,
  crashReportsEnabled: false,
  debugMode: false,
  maxConcurrentRuns: '3',
  layout: {
    sidebarWidth: 240,
    sidebarCollapsed: false,
  },
};

/**
 * `SRGNT_DEFAULT_WORKSPACE_ROOT` exists for E2E isolation. Onboarding's "Use
 * Default Location" otherwise resolves to the real `$HOME/srgnt-workspace`, so
 * every Playwright run wrote notes — and, since projects landed, a project
 * directory per test — into the developer's actual workspace.
 */
export function resolveDefaultWorkspaceRoot(homePath: string): string {
  const override = process.env.SRGNT_DEFAULT_WORKSPACE_ROOT;
  if (override !== undefined && override !== '') return override;
  return path.join(homePath, 'srgnt-workspace');
}

export function getBootstrapStatePath(userDataPath: string): string {
  return path.join(userDataPath, 'bootstrap-state.json');
}

export function getDesktopSettingsPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, 'settings.json');
}

/** Aggregator-era settings location; read as a fallback, never written. */
export function getLegacyDesktopSettingsPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.command-center', 'config', 'desktop-settings.json');
}

export async function ensureWorkspaceLayout(workspaceRoot: string): Promise<void> {
  await fs.mkdir(workspaceRoot, { recursive: true });

  for (const directory of defaultWorkspaceLayout.directories) {
    await fs.mkdir(path.join(workspaceRoot, directory.path), { recursive: true });
  }

  for (const seedFile of defaultWorkspaceLayout.seedFiles) {
    const filePath = path.join(workspaceRoot, seedFile.path);
    try {
      // 'wx' never overwrites an existing file.
      await fs.writeFile(filePath, seedFile.defaultContent, { encoding: 'utf8', flag: 'wx' });
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
        continue;
      }
      throw error;
    }
  }
}

export async function readBootstrapState(userDataPath: string): Promise<DesktopBootstrapState> {
  const filePath = getBootstrapStatePath(userDataPath);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DesktopBootstrapState>;
    return {
      workspaceRoot: typeof parsed.workspaceRoot === 'string' ? parsed.workspaceRoot : '',
    };
  } catch {
    return { workspaceRoot: '' };
  }
}

export async function writeBootstrapState(userDataPath: string, state: DesktopBootstrapState): Promise<void> {
  const filePath = getBootstrapStatePath(userDataPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
}

export async function readDesktopSettings(workspaceRoot: string): Promise<DesktopSettings> {
  if (!workspaceRoot) {
    return { ...defaultDesktopSettings };
  }

  for (const filePath of [getDesktopSettingsPath(workspaceRoot), getLegacyDesktopSettingsPath(workspaceRoot)]) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DesktopSettings>;
      // A fresh v2 seed is an empty object; fall through to the legacy file
      // so aggregator-era settings survive the layout change.
      if (Object.keys(parsed).length === 0) {
        continue;
      }
      return mergeDesktopSettings(parsed);
    } catch {
      continue;
    }
  }

  return { ...defaultDesktopSettings };
}

export async function writeDesktopSettings(workspaceRoot: string, settings: DesktopSettings): Promise<void> {
  await ensureWorkspaceLayout(workspaceRoot);

  const filePath = getDesktopSettingsPath(workspaceRoot);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(mergeDesktopSettings(settings), null, 2), 'utf8');
}

export function mergeDesktopSettings(settings?: Partial<DesktopSettings>): DesktopSettings {
  // Older profiles may still carry an aggregator-era `connectors` key on disk.
  // Strip it here so it never re-enters memory or gets persisted again.
  const { connectors: _legacyConnectors, ...rest } = (settings ?? {}) as Partial<DesktopSettings> & { connectors?: unknown };
  void _legacyConnectors;

  return {
    ...defaultDesktopSettings,
    ...rest,
    layout: {
      ...defaultDesktopSettings.layout,
      ...(settings?.layout ?? {}),
    },
  };
}
