/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel, defaultSettingsSections } from './Settings.js';

/* ─── Helpers ─── */

function makeSections(overrides: Record<string, unknown> = {}): defaultSettingsSections[number][] {
  return [
    {
      id: 'general',
      title: 'General',
      settings: [
        {
          id: 'workspace-path',
          label: 'Workspace Path',
          description: 'Root directory for your workspace',
          type: 'path' as const,
          value: '',
          onChange: overrides['workspace-path']?.onChange,
          onBrowse: overrides['workspace-path']?.onBrowse,
        },
        {
          id: 'theme',
          label: 'Theme',
          description: 'Choose how it looks',
          type: 'select' as const,
          value: 'system',
          options: [
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ],
          onChange: overrides['theme']?.onChange,
        },
        {
          id: 'update-channel',
          label: 'Update Channel',
          description: 'Release track',
          type: 'select' as const,
          value: 'stable',
          options: [
            { label: 'Stable', value: 'stable' },
            { label: 'Beta', value: 'beta' },
          ],
          onChange: overrides['update-channel']?.onChange,
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
          description: 'Anonymous usage statistics',
          type: 'boolean' as const,
          value: true,
          onChange: overrides['telemetry-enabled']?.onChange,
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
          description: 'Sync tasks',
          type: 'boolean' as const,
          value: false,
          onChange: overrides['jira-enabled']?.onChange,
        },
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced',
      settings: [
        {
          id: 'max-concurrent-runs',
          label: 'Max Concurrent Runs',
          description: 'Parallel syncs',
          type: 'select' as const,
          value: '3',
          options: [
            { label: '1', value: '1' },
            { label: '3', value: '3' },
            { label: '5', value: '5' },
          ],
          onChange: overrides['max-concurrent-runs']?.onChange,
        },
      ],
    },
  ];
}

/* ─── SettingsPanel ─── */

describe('SettingsPanel', () => {
  it('renders "Settings" heading', () => {
    render(<SettingsPanel sections={makeSections()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
  });

  it('renders section titles (General, Privacy, Connectors, Advanced)', () => {
    render(<SettingsPanel sections={makeSections()} />);
    for (const title of ['General', 'Privacy', 'Connectors', 'Advanced']) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    }
  });

  it('applies theme override to "general" section when theme prop provided', () => {
    const onThemeChange = vi.fn();
    render(<SettingsPanel sections={makeSections()} theme="dark" onThemeChange={onThemeChange} />);

    const themeSelect = screen.getByLabelText('Theme') as HTMLSelectElement;
    expect(themeSelect.value).toBe('dark');

    fireEvent.change(themeSelect, { target: { value: 'light' } });
    expect(onThemeChange).toHaveBeenCalledWith('light');
  });
});

/* ─── SettingRow ─── */

describe('SettingRow', () => {
  it('renders setting label', () => {
    render(<SettingsPanel sections={makeSections()} />);
    expect(screen.getByText('Workspace Path')).toBeInTheDocument();
    expect(screen.getByText('Jira Integration')).toBeInTheDocument();
  });

  it('renders setting description when provided', () => {
    render(<SettingsPanel sections={makeSections()} />);
    expect(screen.getByText('Root directory for your workspace')).toBeInTheDocument();
    expect(screen.getByText('Sync tasks')).toBeInTheDocument();
  });
});

/* ─── SettingInput (tested through SettingsPanel) ─── */

describe('SettingInput', () => {
  it('renders boolean setting as toggle (shows "On" or "Off")', () => {
    const sections = makeSections();
    // telemetry-enabled is true -> "On"
    // jira-enabled is false -> "Off"
    render(<SettingsPanel sections={sections} />);

    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('renders select with options', () => {
    render(<SettingsPanel sections={makeSections()} />);

    const select = screen.getByLabelText('Theme') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(['system', 'light', 'dark']);
  });

  it('renders path input with Browse button', () => {
    render(<SettingsPanel sections={makeSections()} />);

    const pathInput = screen.getByLabelText('Workspace Path') as HTMLInputElement;
    expect(pathInput).toBeInTheDocument();
    expect(pathInput.type).toBe('text');

    expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument();
  });

  it('renders text input for string type by default', () => {
    const sections = makeSections();
    // Add a plain string setting to the advanced section
    sections[3].settings.unshift({
      id: 'custom-string',
      label: 'Custom Field',
      description: 'A plain text field',
      type: 'string' as const,
      value: 'hello',
      onChange: vi.fn(),
    });

    render(<SettingsPanel sections={sections} />);

    const input = screen.getByLabelText('Custom Field') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('text');
    expect(input.value).toBe('hello');
  });

  it('calls onChange when input value changes', () => {
    const onChange = vi.fn();
    const sections = makeSections({
      'workspace-path': { onChange },
    });

    render(<SettingsPanel sections={sections} />);

    const input = screen.getByLabelText('Workspace Path') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '/home/user/project' } });
    expect(onChange).toHaveBeenCalledWith('/home/user/project');
  });
});

/* ─── defaultSettingsSections ─── */

describe('defaultSettingsSections', () => {
  it('contains 4 sections: general, privacy, connectors, advanced', () => {
    expect(defaultSettingsSections).toHaveLength(4);
    expect(defaultSettingsSections.map((s) => s.id)).toEqual([
      'general',
      'privacy',
      'connectors',
      'advanced',
    ]);
  });

  it('general section contains workspace-path, theme, update-channel', () => {
    const general = defaultSettingsSections.find((s) => s.id === 'general');
    expect(general).toBeDefined();
    expect(general!.settings.map((s) => s.id)).toEqual([
      'workspace-path',
      'theme',
      'update-channel',
    ]);
  });
});
