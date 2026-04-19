import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { defaultWorkspaceLayout, type DesktopSettings } from '@srgnt/contracts';

const knownCatalogConnectorIds = ['jira', 'outlook', 'teams'] as const;
export interface DesktopBootstrapState {
  workspaceRoot: string;
}

function normalizeInstalledConnectorId(id: unknown): string | undefined {
  if (typeof id !== 'string') {
    return undefined;
  }

  const trimmed = id.trim();
  return trimmed === '' ? undefined : trimmed;
}

export const defaultDesktopSettings: DesktopSettings = {
  theme: 'system',
  updateChannel: 'stable',
  telemetryEnabled: false,
  crashReportsEnabled: false,
  connectors: {
    installedConnectorIds: [] as readonly string[],
  },
  debugMode: false,
  maxConcurrentRuns: '3',
  layout: {
    sidebarWidth: 240,
    sidebarCollapsed: false,
  },
};

/**
 * Migrates legacy connector flags or reads the new install-map shape.
 *
 * Migration contract:
 * - Legacy { id: true } (id in catalog)   → add id to installedConnectorIds
 * - Legacy { id: false } or absent         → exclude id
 * - Legacy unknown ID                       → ignore (no throw)
 * - Legacy malformed value (string/null)    → exclude id, keep startup safe
 * - New shape already present               → new shape wins (no double-truth)
 * - Fresh / empty                           → defaults (all false)
 */
function migrateConnectorSettings(rawConnectors: unknown): string[] {
  if (!rawConnectors || typeof rawConnectors !== 'object' || Array.isArray(rawConnectors)) {
    return [];
  }

  const parsed = rawConnectors as Record<string, unknown>;

  // New shape already present — wins over legacy
  // Preserve ALL valid non-empty string IDs in new shape (knownCatalogConnectorIds
  // filter only applies to legacy boolean migration to avoid unexpectedly dropping
  // arbitrary valid custom connector IDs).
  if (Object.prototype.hasOwnProperty.call(parsed, 'installedConnectorIds')) {
    const installed = parsed.installedConnectorIds;
    if (Array.isArray(installed)) {
      const uniqueIds = [...new Set(installed
        .map((candidate) => normalizeInstalledConnectorId(candidate))
        .filter((candidate): candidate is string => candidate !== undefined)
      )].sort();

      return uniqueIds;
    }
    return [];
  }

  // Legacy shape: { jira: true, outlook: false, teams: false }
  const installed: string[] = [];

  for (const id of knownCatalogConnectorIds) {
    if (parsed[id] === true) {
      installed.push(id);
    }
  }

  return installed;
}

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
  const installedConnectorIds: readonly string[] = migrateConnectorSettings(settings?.connectors);

  return {
    ...defaultDesktopSettings,
    ...settings,
    connectors: {
      installedConnectorIds,
    },
    layout: {
      ...defaultDesktopSettings.layout,
      ...(settings?.layout ?? {}),
    },
  };
}
