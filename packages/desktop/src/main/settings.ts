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
  connectors: {
    jira: false,
    outlook: false,
    teams: false,
  },
  debugMode: false,
  maxConcurrentRuns: '3',
  layout: {
    sidebarWidth: 240,
    sidebarCollapsed: false,
  },
};

export function resolveDefaultWorkspaceRoot(homePath: string): string {
  return path.join(homePath, 'srgnt-workspace');
}

export function getBootstrapStatePath(userDataPath: string): string {
  return path.join(userDataPath, 'bootstrap-state.json');
}

export function getDesktopSettingsPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.command-center', 'config', 'desktop-settings.json');
}

export async function ensureWorkspaceLayout(workspaceRoot: string): Promise<void> {
  await fs.mkdir(workspaceRoot, { recursive: true });

  for (const directory of defaultWorkspaceLayout.rootDirectories) {
    await fs.mkdir(path.join(workspaceRoot, directory.path), { recursive: true });
  }

  const commandCenterRoot = path.join(workspaceRoot, defaultWorkspaceLayout.commandCenter.root);
  await fs.mkdir(commandCenterRoot, { recursive: true });

  for (const subdirectory of Object.values(defaultWorkspaceLayout.commandCenter.subdirectories)) {
    await fs.mkdir(path.join(workspaceRoot, subdirectory), { recursive: true });
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

  const filePath = getDesktopSettingsPath(workspaceRoot);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DesktopSettings>;
    return mergeDesktopSettings(parsed);
  } catch {
    return { ...defaultDesktopSettings };
  }
}

export async function writeDesktopSettings(workspaceRoot: string, settings: DesktopSettings): Promise<void> {
  await ensureWorkspaceLayout(workspaceRoot);

  const filePath = getDesktopSettingsPath(workspaceRoot);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(mergeDesktopSettings(settings), null, 2), 'utf8');
}

export function mergeDesktopSettings(settings?: Partial<DesktopSettings>): DesktopSettings {
  return {
    ...defaultDesktopSettings,
    ...settings,
    connectors: {
      ...defaultDesktopSettings.connectors,
      ...(settings?.connectors ?? {}),
    },
    layout: {
      ...defaultDesktopSettings.layout,
      ...(settings?.layout ?? {}),
    },
  };
}
