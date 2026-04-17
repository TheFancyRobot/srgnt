import React from 'react';

export interface Setting {
  id: string;
  label: string;
  description?: string;
  type: 'string' | 'boolean' | 'select' | 'path';
  value: unknown;
  options?: { label: string; value: string }[];
  onChange?: (value: unknown) => void;
  onBrowse?: () => void | Promise<void>;
}

export interface SettingsSection {
  id: string;
  title: string;
  settings: Setting[];
}

/* ─── Panel ─── */

export function SettingsPanel({ sections, theme, onThemeChange }: { sections: SettingsSection[]; theme?: 'system' | 'light' | 'dark'; onThemeChange?: (theme: 'system' | 'light' | 'dark') => void }): React.ReactElement {
  const sectionsWithTheme = React.useMemo(() => {
    return sections.map((section) => {
      if (section.id === 'general') {
        return {
          ...section,
          settings: section.settings.map((setting) => {
            if (setting.id === 'theme') {
              return { ...setting, value: theme ?? 'system', onChange: (value: unknown) => onThemeChange?.(value as 'system' | 'light' | 'dark') };
            }
            return setting;
          }),
        };
      }
      return section;
    });
  }, [sections, theme, onThemeChange]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="animate-slide-up">
        <h1 className="text-2xl font-display font-semibold text-text-primary tracking-tight mb-1">
          Settings
        </h1>
        <p className="text-sm text-text-secondary">Configure your workspace and integrations.</p>
      </header>

      {/* All sections in one scrollable column */}
      <div className="space-y-8 animate-slide-up stagger-1">
        {sectionsWithTheme.map((section, sectionIndex) => (
          <section key={section.id} id={`settings-section-${section.id}`}>
            <h2 className="section-heading mb-4">{section.title}</h2>
            <div className="space-y-4">
              {section.settings.map((setting, settingIndex) => (
                <SettingRow key={setting.id} setting={setting} stagger={sectionIndex + settingIndex + 1} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ─── Setting row ─── */

function SettingRow({ setting, stagger }: { setting: Setting; stagger: number }): React.ReactElement {
  const inputId = `${setting.id}-input`;

  return (
    <div className={`card p-4 animate-slide-up stagger-${stagger}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
            {setting.label}
          </label>
          {setting.description && (
            <p className="text-xs text-text-tertiary mt-0.5">{setting.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 mt-0.5">
          <SettingInput setting={setting} />
        </div>
      </div>
    </div>
  );
}

/* ─── Setting inputs ─── */

function SettingInput({ setting }: { setting: Setting }): React.ReactElement {
  const inputId = `${setting.id}-input`;

  switch (setting.type) {
    case 'boolean':
      return (
        <label className="relative inline-flex items-center cursor-pointer gap-3">
          <input
            type="checkbox"
            id={inputId}
            checked={setting.value as boolean}
            onChange={(e) => setting.onChange?.(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-border-default peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-srgnt-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-xs peer-checked:bg-srgnt-500 transition-colors" />
          <span className="text-xs text-text-tertiary font-mono-data">
            {setting.value ? 'On' : 'Off'}
          </span>
        </label>
      );
    case 'select':
      return (
        <select
          id={inputId}
          value={setting.value as string}
          onChange={(e) => setting.onChange?.(e.target.value)}
          className="input w-36 text-sm"
        >
          {setting.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case 'path':
      return (
        <div className="flex gap-2">
          <input
            type="text"
            id={inputId}
            value={setting.value as string}
            onChange={(e) => setting.onChange?.(e.target.value)}
            className="input w-56 text-xs font-mono-data"
          />
          <button type="button" className="btn btn-secondary text-xs px-3" onClick={() => setting.onBrowse?.()}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
            </svg>
            Browse
          </button>
        </div>
      );
    default:
      return (
        <input
          type="text"
          id={inputId}
          value={setting.value as string}
          onChange={(e) => setting.onChange?.(e.target.value)}
          className="input w-64 text-sm"
        />
      );
  }
}

/* ─── Default data ─── */

export const defaultSettingsSections: SettingsSection[] = [
  {
    id: 'general',
    title: 'General',
    settings: [
      {
        id: 'workspace-path',
        label: 'Workspace Path',
        description: 'Root directory for your srgnt workspace',
        type: 'path',
        value: '',
      },
      {
        id: 'theme',
        label: 'Theme',
        description: 'Choose how srgnt looks',
        type: 'select',
        value: 'system',
        options: [
          { label: 'System', value: 'system' },
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ],
      },
      {
        id: 'update-channel',
        label: 'Update Channel',
        description: 'Which release track to follow',
        type: 'select',
        value: 'stable',
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta' },
          { label: 'Nightly', value: 'nightly' },
        ],
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    settings: [
      {
        id: 'telemetry-enabled',
        label: 'Send Usage Data',
        description: 'Help improve srgnt by sending anonymous usage statistics',
        type: 'boolean',
        value: false,
      },
      {
        id: 'crash-reports',
        label: 'Send Crash Reports',
        description: 'Automatically send crash logs when the app encounters an error',
        type: 'boolean',
        value: false,
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
        description: 'Enable verbose logging for troubleshooting',
        type: 'boolean',
        value: false,
      },
      {
        id: 'max-concurrent-runs',
        label: 'Max Concurrent Runs',
        description: 'Number of parallel data syncs',
        type: 'select',
        value: '3',
        options: [
          { label: '1', value: '1' },
          { label: '3', value: '3' },
          { label: '5', value: '5' },
        ],
      },
    ],
  },
];