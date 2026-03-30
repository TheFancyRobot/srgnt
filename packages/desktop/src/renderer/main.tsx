import React from 'react';
import { createRoot } from 'react-dom/client';
import type { DesktopSettings, LaunchContext, UpdateCheckResponse } from '@srgnt/contracts';
import { AppLayout } from './components/Navigation.js';
import { SettingsPanel } from './components/Settings.js';
import type { SettingsSection } from './components/Settings.js';
import { ConnectorStatusPanel } from './components/ConnectorStatus.js';
import type { ConnectorInfo } from './components/ConnectorStatus.js';
import { TodayView } from './components/TodayView.js';
import { CalendarView } from './components/CalendarView.js';
import { OnboardingWizard } from './components/Onboarding.js';
import type { OnboardingFlow } from './components/Onboarding.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { LayoutProvider, useLayout } from './components/LayoutContext.js';
import type { PanelDefinition } from './components/LayoutContext.js';
import { navIcons } from './components/icons.js';
import { NotesView } from './components/NotesView.js';
import { TodaySidePanel } from './components/sidepanels/TodaySidePanel.js';
import { CalendarSidePanel } from './components/sidepanels/CalendarSidePanel.js';
import { NotesSidePanel } from './components/sidepanels/NotesSidePanel.js';
import { ConnectorsSidePanel } from './components/sidepanels/ConnectorsSidePanel.js';
import { SettingsSidePanel } from './components/sidepanels/SettingsSidePanel.js';

const LazyTerminalPanel = React.lazy(async () => {
  const module = await import('./components/TerminalPanel.js');
  return { default: module.TerminalPanel };
});

const defaultSettings: DesktopSettings = {
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

const initialUpdateStatus: UpdateCheckResponse = {
  status: 'skipped',
  channel: 'stable',
  checkedAt: new Date(0).toISOString(),
  message: 'Update checks have not run yet.',
};

const defaultPanels: PanelDefinition[] = [
  { id: 'today', icon: navIcons['today']!, label: 'Daily Dashboard', section: 'main', order: 1, sidePanelContent: TodaySidePanel },
  { id: 'calendar', icon: navIcons['calendar']!, label: 'Calendar', section: 'main', order: 2, sidePanelContent: CalendarSidePanel },
  { id: 'notes', icon: navIcons['notes']!, label: 'Notes', section: 'main', order: 3, sidePanelContent: NotesSidePanel },
  { id: 'connectors', icon: navIcons['connectors']!, label: 'Connectors', section: 'system', order: 4 },
  { id: 'settings', icon: navIcons['settings']!, label: 'Settings', section: 'system', order: 5, sidePanelContent: SettingsSidePanel },
  { id: 'terminal', icon: navIcons['terminal']!, label: 'Terminal', section: 'utility', order: 6 },
];

function TerminalLoadingState(): React.ReactElement {
  return (
    <div className="h-full w-full bg-surface-secondary flex items-center justify-center p-6">
      <div className="card p-8 text-center space-y-3 animate-scale-in">
        <p className="text-sm font-mono-data text-text-tertiary">Loading terminal surface...</p>
        <div className="w-10 h-1 rounded-full bg-surface-tertiary overflow-hidden mx-auto">
          <div className="h-full w-1/2 bg-srgnt-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function AppContent({
  initialSettings,
  persistSettings,
}: {
  initialSettings: DesktopSettings;
  persistSettings: (nextSettings: DesktopSettings) => Promise<DesktopSettings>;
}): React.ReactElement {
  const { activePanel, setActivePanel, registerPanel } = useLayout();
  const [pendingLaunchContext, setPendingLaunchContext] = React.useState<LaunchContext | null>(null);
  const [connectors, setConnectors] = React.useState<ConnectorInfo[]>([]);
  const [settings, setSettings] = React.useState<DesktopSettings>(initialSettings);
  const [workspaceRoot, setWorkspaceRoot] = React.useState('');
  const [workspaceRootDraft, setWorkspaceRootDraft] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [updateStatus, setUpdateStatus] = React.useState<UpdateCheckResponse>(initialUpdateStatus);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [simulateRenderCrash, setSimulateRenderCrash] = React.useState(false);
  const settingsRef = React.useRef(initialSettings);

  const syncSettings = React.useCallback(
    (nextSettings: DesktopSettings) => {
      settingsRef.current = nextSettings;
      setSettings(nextSettings);
    },
    [],
  );

  React.useEffect(() => {
    settingsRef.current = initialSettings;
    setSettings(initialSettings);
  }, [initialSettings]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [{ settings: loadedSettings, workspaceRoot: loadedWorkspaceRoot }, connectorResponse] = await Promise.all([
          window.srgnt.getDesktopSettings(),
          window.srgnt.listConnectors(),
        ]);

        if (cancelled) {
          return;
        }

        syncSettings(loadedSettings);
        setWorkspaceRoot(loadedWorkspaceRoot);
        setWorkspaceRootDraft(loadedWorkspaceRoot);
        setShowOnboarding(!loadedWorkspaceRoot);
        setConnectors(connectorResponse.connectors);
      } catch (error) {
        console.error('[renderer] failed to load desktop state', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [syncSettings]);

  React.useEffect(() => {
    if (activePanel !== 'terminal') {
      setPendingLaunchContext(null);
    }
  }, [activePanel]);

  const connectorsSidePanel = React.useMemo(() => {
    function ConnectorsPanel(): React.ReactElement {
      return <ConnectorsSidePanel connectors={connectors} />;
    }

    ConnectorsPanel.displayName = 'ConnectorsPanel';
    return ConnectorsPanel;
  }, [connectors]);

  React.useEffect(() => {
    registerPanel({
      id: 'connectors',
      icon: navIcons['connectors']!,
      label: 'Connectors',
      section: 'system',
      order: 4,
      sidePanelContent: connectorsSidePanel,
    });
  }, [connectorsSidePanel, registerPanel]);

  React.useEffect(() => {
    const updateTheme = () => {
      const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };

    updateTheme();

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => updateTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }

    return undefined;
  }, [settings.theme]);

  const reloadConnectors = React.useCallback(async () => {
    const response = await window.srgnt.listConnectors();
    setConnectors(response.connectors);
  }, []);

  const saveSettings = React.useCallback(async (nextSettings: DesktopSettings) => {
    const savedSettings = await persistSettings(nextSettings);
    syncSettings(savedSettings);
    await reloadConnectors();
  }, [persistSettings, reloadConnectors, syncSettings]);

  const patchSettings = React.useCallback(async (patch: Partial<DesktopSettings>) => {
    const currentSettings = settingsRef.current;
    const nextSettings: DesktopSettings = {
      ...currentSettings,
      ...patch,
      connectors: {
        ...currentSettings.connectors,
        ...(patch.connectors ?? {}),
      },
      layout: {
        ...currentSettings.layout,
        ...(patch.layout ?? {}),
      },
    };
    await saveSettings(nextSettings);
  }, [saveSettings]);

  const refreshWorkspaceState = React.useCallback(async () => {
    const response = await window.srgnt.getDesktopSettings();
    syncSettings(response.settings);
    setWorkspaceRoot(response.workspaceRoot);
    setWorkspaceRootDraft(response.workspaceRoot);
    setShowOnboarding(!response.workspaceRoot);
    await reloadConnectors();
  }, [reloadConnectors, syncSettings]);

  const handleConnect = React.useCallback(async (id: string) => {
    await window.srgnt.connectConnector(id);
    await refreshWorkspaceState();
  }, [refreshWorkspaceState]);

  const handleDisconnect = React.useCallback(async (id: string) => {
    await window.srgnt.disconnectConnector(id);
    await refreshWorkspaceState();
  }, [refreshWorkspaceState]);

  const handleLaunchContext = React.useCallback((launchContext: LaunchContext) => {
    setPendingLaunchContext(launchContext);
    setActivePanel('terminal');
  }, [setActivePanel]);

  const ensureDefaultWorkspace = React.useCallback(async () => {
    const nextRoot = await window.srgnt.createDefaultWorkspaceRoot();
    const [{ settings: loadedSettings, workspaceRoot: loadedWorkspaceRoot }, connectorResponse] = await Promise.all([
      window.srgnt.getDesktopSettings(),
      window.srgnt.listConnectors(),
    ]);
    syncSettings(loadedSettings);
    setWorkspaceRoot(loadedWorkspaceRoot || nextRoot);
    setWorkspaceRootDraft(loadedWorkspaceRoot || nextRoot);
    setConnectors(connectorResponse.connectors);
  }, [syncSettings]);

  const handleChooseWorkspaceRoot = React.useCallback(async () => {
    const nextRoot = await window.srgnt.chooseWorkspaceRoot();
    if (nextRoot) {
      setWorkspaceRoot(nextRoot);
      setWorkspaceRootDraft(nextRoot);
      setShowOnboarding(false);
      await refreshWorkspaceState();
    }
  }, [refreshWorkspaceState]);

  const handleApplyWorkspaceDraft = React.useCallback(async () => {
    if (!workspaceRootDraft.trim()) {
      return;
    }
    await window.srgnt.setWorkspaceRoot(workspaceRootDraft.trim());
    await refreshWorkspaceState();
    setStatusMessage(`Workspace updated to ${workspaceRootDraft.trim()}.`);
  }, [refreshWorkspaceState, workspaceRootDraft]);

  const handleCheckForUpdates = React.useCallback(async () => {
    const nextStatus = await window.srgnt.checkForUpdates();
    setUpdateStatus(nextStatus);
    setStatusMessage(nextStatus.message);
  }, []);

  const handleWriteDiagnosticCrashLog = React.useCallback(async () => {
    const result = await window.srgnt.writeDiagnosticCrashLog();
    setStatusMessage(`Wrote a redacted diagnostic crash log to ${result.directory}.`);
  }, []);

  const handleOnboardingComplete = React.useCallback(async () => {
    if (!workspaceRoot) {
      await ensureDefaultWorkspace();
      return;
    }
    setShowOnboarding(false);
  }, [ensureDefaultWorkspace, workspaceRoot]);

  const handleOnboardingSkip = React.useCallback(async () => {
    await ensureDefaultWorkspace();
  }, [ensureDefaultWorkspace]);

  const onboardingFlow: OnboardingFlow = React.useMemo(() => ({
    steps: [
      {
        id: 'workspace',
        title: 'Create Your Workspace',
        description: workspaceRoot
          ? 'Your workspace is ready. You can adjust the path later from Settings if you want to move it.'
          : 'Create a local-first workspace now. srgnt will scaffold the command-center folders for you and keep non-secret settings there.',
        note: workspaceRoot || 'Suggested path: ~/srgnt-workspace',
        requiresAction: true,
        isComplete: Boolean(workspaceRoot),
        action: {
          label: workspaceRoot ? 'Workspace Ready' : 'Create Workspace',
          action: ensureDefaultWorkspace,
        },
      },
      {
        id: 'connectors',
        title: 'Know What Connects First',
        description: 'Teams, Jira, and Outlook stay fixture-backed by default. The Connectors view lets you verify status without needing live credentials on first run.',
        note: 'Live auth is still optional. Offline validation stays first-class for release QA.',
      },
      {
        id: 'ready',
        title: 'You\'re All Set',
        description: 'Today, Calendar, Terminal, Connectors, and Settings are ready for the release-readiness walkthrough.',
        note: 'Settings persist in .command-center/config/desktop-settings.json inside your workspace.',
      },
    ],
    onComplete: () => {
      void handleOnboardingComplete();
    },
    onSkip: () => {
      void handleOnboardingSkip();
    },
  }), [ensureDefaultWorkspace, handleOnboardingComplete, handleOnboardingSkip, workspaceRoot]);

  const settingsSections: SettingsSection[] = React.useMemo(() => ([
    {
      id: 'general',
      title: 'General',
      settings: [
        {
          id: 'workspace-path',
          label: 'Workspace Path',
          description: 'Change the workspace location, then apply it below to re-scaffold the local folder if needed.',
          type: 'path',
          value: workspaceRootDraft,
          onChange: (value) => setWorkspaceRootDraft(String(value)),
          onBrowse: () => {
            void handleChooseWorkspaceRoot();
          },
        },
        {
          id: 'theme',
          label: 'Theme',
          description: 'Choose how srgnt looks.',
          type: 'select',
          value: settings.theme,
          options: [
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ],
          onChange: (value) => {
            void patchSettings({ theme: value as DesktopSettings['theme'] });
          },
        },
        {
          id: 'update-channel',
          label: 'Update Channel',
          description: 'Pick which release track update checks should target.',
          type: 'select',
          value: settings.updateChannel,
          options: [
            { label: 'Stable', value: 'stable' },
            { label: 'Beta', value: 'beta' },
            { label: 'Nightly', value: 'nightly' },
          ],
          onChange: (value) => {
            void patchSettings({ updateChannel: value as DesktopSettings['updateChannel'] });
          },
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy',
      settings: [
        {
          id: 'telemetry-enabled',
          label: 'Allow Redacted Usage Telemetry',
          description: 'Off by default. Future remote telemetry remains opt-in and must stay redacted.',
          type: 'boolean',
          value: settings.telemetryEnabled,
          onChange: (value) => {
            void patchSettings({ telemetryEnabled: Boolean(value) });
          },
        },
        {
          id: 'crash-reports',
          label: 'Allow Future Crash Uploads',
          description: 'Local redacted crash logs are always written. This toggle reserves consent for any future remote upload flow.',
          type: 'boolean',
          value: settings.crashReportsEnabled,
          onChange: (value) => {
            void patchSettings({ crashReportsEnabled: Boolean(value) });
          },
        },
      ],
    },
    {
      id: 'connectors',
      title: 'Connectors',
      settings: [
        {
          id: 'jira-enabled',
          label: 'Jira Integration',
          description: 'Persist whether Jira is connected for the next launch.',
          type: 'boolean',
          value: settings.connectors.jira,
          onChange: (value) => {
            void patchSettings({ connectors: { ...settings.connectors, jira: Boolean(value) } });
          },
        },
        {
          id: 'outlook-enabled',
          label: 'Outlook Integration',
          description: 'Persist whether Outlook Calendar is connected for the next launch.',
          type: 'boolean',
          value: settings.connectors.outlook,
          onChange: (value) => {
            void patchSettings({ connectors: { ...settings.connectors, outlook: Boolean(value) } });
          },
        },
        {
          id: 'teams-enabled',
          label: 'Teams Integration',
          description: 'Persist whether Microsoft Teams is connected for the next launch.',
          type: 'boolean',
          value: settings.connectors.teams,
          onChange: (value) => {
            void patchSettings({ connectors: { ...settings.connectors, teams: Boolean(value) } });
          },
        },
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced',
      settings: [
        {
          id: 'debug-mode',
          label: 'Debug Mode',
          description: 'Enable extra logging for release diagnostics.',
          type: 'boolean',
          value: settings.debugMode,
          onChange: (value) => {
            void patchSettings({ debugMode: Boolean(value) });
          },
        },
        {
          id: 'max-concurrent-runs',
          label: 'Max Concurrent Runs',
          description: 'Limit how many sync or workflow runs may execute at once.',
          type: 'select',
          value: settings.maxConcurrentRuns,
          options: [
            { label: '1', value: '1' },
            { label: '3', value: '3' },
            { label: '5', value: '5' },
          ],
          onChange: (value) => {
            void patchSettings({ maxConcurrentRuns: value as DesktopSettings['maxConcurrentRuns'] });
          },
        },
      ],
    },
  ]), [handleChooseWorkspaceRoot, patchSettings, settings, workspaceRootDraft]);

  if (simulateRenderCrash) {
    throw new Error('Simulated renderer crash for release QA');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-secondary grain flex items-center justify-center p-6">
        <div className="card p-8 text-center space-y-3 animate-scale-in">
          <p className="text-sm font-mono-data text-text-tertiary">Bootstrapping desktop state...</p>
          <div className="w-10 h-1 rounded-full bg-surface-tertiary overflow-hidden mx-auto">
            <div className="h-full w-1/2 bg-srgnt-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingWizard flow={onboardingFlow} />;
  }

  const renderContent = () => {
    switch (activePanel) {
      case 'today':
        return <TodayView onLaunchContext={handleLaunchContext} />;
      case 'calendar':
        return <CalendarView onLaunchContext={handleLaunchContext} />;
      case 'notes':
        return <NotesView />;
      case 'terminal':
        return (
          <React.Suspense fallback={<TerminalLoadingState />}>
            <LazyTerminalPanel className="h-full w-full" launchContext={pendingLaunchContext} />
          </React.Suspense>
        );
      case 'connectors':
        return (
          <ConnectorStatusPanel
            connectors={connectors}
            onConnect={(id) => {
              void handleConnect(id);
            }}
            onDisconnect={(id) => {
              void handleDisconnect(id);
            }}
          />
        );
      case 'settings':
        return (
          <div className="space-y-8">
            <SettingsPanel sections={settingsSections} theme={settings.theme} onThemeChange={(theme) => {
              void patchSettings({ theme });
            }} />
            <SettingsUtilityPanel
              statusMessage={statusMessage}
              updateStatus={updateStatus}
              workspaceRootDraft={workspaceRootDraft}
              canApplyWorkspacePath={workspaceRootDraft.trim() !== workspaceRoot}
              onApplyWorkspacePath={() => {
                void handleApplyWorkspaceDraft();
              }}
              onCheckForUpdates={() => {
                void handleCheckForUpdates();
              }}
              onWriteDiagnosticCrashLog={() => {
                void handleWriteDiagnosticCrashLog();
              }}
              onTriggerRendererCrash={() => setSimulateRenderCrash(true)}
            />
          </div>
        );
      default:
        return <TodayView onLaunchContext={handleLaunchContext} />;
    }
  };

  return (
    <AppLayout fullBleed={activePanel === 'terminal'}>
      {renderContent()}
    </AppLayout>
  );
}

function SettingsUtilityPanel({
  statusMessage,
  updateStatus,
  workspaceRootDraft,
  canApplyWorkspacePath,
  onApplyWorkspacePath,
  onCheckForUpdates,
  onWriteDiagnosticCrashLog,
  onTriggerRendererCrash,
}: {
  statusMessage: string;
  updateStatus: UpdateCheckResponse;
  workspaceRootDraft: string;
  canApplyWorkspacePath: boolean;
  onApplyWorkspacePath: () => void;
  onCheckForUpdates: () => void;
  onWriteDiagnosticCrashLog: () => void;
  onTriggerRendererCrash: () => void;
}): React.ReactElement {
  return (
    <section className="space-y-4 animate-slide-up stagger-2">
      <h2 className="section-heading">Release QA Utilities</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-medium text-text-primary">Workspace</h3>
          <p className="text-xs text-text-secondary break-all">{workspaceRootDraft || 'No workspace selected.'}</p>
          <button type="button" className="btn btn-secondary text-xs" disabled={!canApplyWorkspacePath} onClick={onApplyWorkspacePath}>
            Apply Workspace Path
          </button>
        </div>
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-medium text-text-primary">Updates</h3>
          <p className="text-xs text-text-secondary">Channel: <span className="font-mono-data">{updateStatus.channel}</span></p>
          <p className="text-xs text-text-tertiary">{updateStatus.message}</p>
          <button type="button" className="btn btn-secondary text-xs" onClick={onCheckForUpdates}>
            Check For Updates
          </button>
        </div>
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-medium text-text-primary">Diagnostics</h3>
          <p className="text-xs text-text-secondary">Write a redacted local crash log or confirm the renderer fallback path.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary text-xs" onClick={onWriteDiagnosticCrashLog}>
              Write Crash Log
            </button>
            <button type="button" className="btn btn-ghost text-xs" onClick={onTriggerRendererCrash}>
              Trigger Renderer Fallback
            </button>
          </div>
        </div>
      </div>
      {statusMessage && (
        <p className="text-xs text-text-tertiary font-mono-data">{statusMessage}</p>
      )}
    </section>
  );
}

function App(): React.ReactElement {
  const [settings, setSettings] = React.useState<DesktopSettings>(defaultSettings);
  const [isLoading, setIsLoading] = React.useState(true);
  const latestSettingsRef = React.useRef(settings);
  const layoutSaveTimeoutRef = React.useRef<number | null>(null);
  const saveQueueRef = React.useRef(Promise.resolve<DesktopSettings>(defaultSettings));

  React.useEffect(() => {
    latestSettingsRef.current = settings;
  }, [settings]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { settings: loadedSettings } = await window.srgnt.getDesktopSettings();
        if (!cancelled) {
          setSettings(loadedSettings);
        }
      } catch (error) {
        console.error('[renderer] failed to load initial settings', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    return () => {
      if (layoutSaveTimeoutRef.current !== null) {
        window.clearTimeout(layoutSaveTimeoutRef.current);
      }
    };
  }, []);

  const persistSettings = React.useCallback(async (nextSettings: DesktopSettings) => {
    latestSettingsRef.current = nextSettings;
    setSettings(nextSettings);

    const savePromise = saveQueueRef.current.then(async () => {
      const response = await window.srgnt.saveDesktopSettings(nextSettings);
      latestSettingsRef.current = response.settings;
      setSettings(response.settings);
      return response.settings;
    });

    saveQueueRef.current = savePromise.catch(() => latestSettingsRef.current);
    return savePromise;
  }, []);

  const handleLayoutChange = React.useCallback((prefs: { sidebarWidth: number; sidebarCollapsed: boolean }) => {
    if (layoutSaveTimeoutRef.current !== null) {
      window.clearTimeout(layoutSaveTimeoutRef.current);
    }

    layoutSaveTimeoutRef.current = window.setTimeout(() => {
      const currentSettings = latestSettingsRef.current;

      void persistSettings({
        ...currentSettings,
        layout: {
          ...currentSettings.layout,
          ...prefs,
        },
      });
    }, 300);
  }, [persistSettings]);

  if (isLoading) {
    return (
      <LayoutProvider defaultPanel="today" initialPanels={defaultPanels}>
        <div className="min-h-screen bg-surface-secondary grain flex items-center justify-center p-6">
          <div className="card p-8 text-center space-y-3 animate-scale-in">
            <p className="text-sm font-mono-data text-text-tertiary">Bootstrapping desktop state...</p>
          </div>
        </div>
      </LayoutProvider>
    );
  }

  return (
    <LayoutProvider
      defaultPanel="today"
      initialPanels={defaultPanels}
      initialWidth={settings.layout?.sidebarWidth ?? 240}
      initialCollapsed={settings.layout?.sidebarCollapsed ?? false}
      onLayoutChange={handleLayoutChange}
    >
      <AppContent initialSettings={settings} persistSettings={persistSettings} />
    </LayoutProvider>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary onReset={() => window.location.reload()}>
      <App />
    </ErrorBoundary>,
  );
}
