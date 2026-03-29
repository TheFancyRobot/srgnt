import { app } from 'electron';
import type { UpdateCheckResponse, UpdateChannel } from '@srgnt/contracts';

interface GenericProviderConfig {
  provider: 'generic';
  url: string;
  channel: UpdateChannel;
}

interface GitHubProviderConfig {
  provider: 'github';
  owner: string;
  repo: string;
  private: boolean;
  channel: UpdateChannel;
}

type UpdateProviderConfig = GenericProviderConfig | GitHubProviderConfig;

function nowIso(): string {
  return new Date().toISOString();
}

function resolveProviderConfig(channel: UpdateChannel): UpdateProviderConfig | null {
  const genericUrl = process.env.SRGNT_UPDATE_URL?.trim();
  if (genericUrl) {
    return {
      provider: 'generic',
      url: genericUrl,
      channel,
    };
  }

  const owner = process.env.SRGNT_UPDATE_OWNER?.trim();
  const repo = process.env.SRGNT_UPDATE_REPO?.trim();
  if (owner && repo) {
    return {
      provider: 'github',
      owner,
      repo,
      private: process.env.SRGNT_UPDATE_PRIVATE === '1',
      channel,
    };
  }

  return null;
}

export async function checkForUpdates(channel: UpdateChannel): Promise<UpdateCheckResponse> {
  if (!app.isPackaged) {
    return {
      status: 'skipped',
      channel,
      checkedAt: nowIso(),
      message: 'Update checks are skipped in development builds.',
    };
  }

  const provider = resolveProviderConfig(channel);
  if (!provider) {
    return {
      status: 'skipped',
      channel,
      checkedAt: nowIso(),
      message: 'No update provider configured. Set SRGNT_UPDATE_URL or SRGNT_UPDATE_OWNER/SRGNT_UPDATE_REPO.',
    };
  }

  try {
    const updaterModule = await import('electron-updater');
    const updater = createUpdater(updaterModule, provider);
    updater.autoDownload = false;

    const result = await updater.checkForUpdates();
    const version = result?.updateInfo?.version;

    return {
      status: version && version !== app.getVersion() ? 'available' : 'not-available',
      channel,
      checkedAt: nowIso(),
      version,
      message: version && version !== app.getVersion()
        ? `Update ${version} is available.`
        : `No update is available for the ${channel} channel.`,
    };
  } catch (error) {
    return {
      status: 'error',
      channel,
      checkedAt: nowIso(),
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function createUpdater(
  updaterModule: typeof import('electron-updater'),
  provider: UpdateProviderConfig,
): InstanceType<typeof updaterModule.NsisUpdater> | InstanceType<typeof updaterModule.MacUpdater> | InstanceType<typeof updaterModule.AppImageUpdater> {
  if (process.platform === 'darwin') {
    return new updaterModule.MacUpdater(provider);
  }
  if (process.platform === 'win32') {
    return new updaterModule.NsisUpdater(provider);
  }
  return new updaterModule.AppImageUpdater(provider);
}
