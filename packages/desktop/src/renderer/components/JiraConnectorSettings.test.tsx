/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { JiraConnectorSettingsPanel } from './JiraConnectorSettings.js';

function setRendererPlatform(platform: string | undefined): void {
  Object.defineProperty(window, 'srgnt', {
    configurable: true,
    value: platform === undefined ? undefined : ({ platform } as unknown as Window['srgnt']),
  });
}

describe('JiraConnectorSettingsPanel', () => {
  afterEach(() => {
    // Clean up window.srgnt mock between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).srgnt;
  });
  it('shows Token Storage control with OS keychain enabled when available', () => {
    render(
      <JiraConnectorSettingsPanel
        settings={{ siteUrl: 'https://example.atlassian.net' }}
        tokenStatus={{ exists: false, backend: 'keychain', preferredBackend: 'keychain', keychainAvailable: true, encryptedLocalAvailable: true }}
        tokenDraft="jira-token"
        onSettingsChange={vi.fn()}
        onTokenChange={vi.fn()}
        onTokenSubmit={vi.fn()}
        onTokenDelete={vi.fn()}
        onSaveSettings={vi.fn()}
      />,
    );

    // Token Storage control exists
    expect(screen.getByLabelText('Token Storage')).toBeTruthy();

    // OS keychain option is present and enabled
    const select = screen.getByLabelText('Token Storage') as HTMLSelectElement;
    const keychainOption = Array.from(select.options).find((o) => o.value === 'keychain');
    expect(keychainOption).toBeTruthy();
    expect(keychainOption!.disabled).toBe(false);

    // Encrypted in-app storage option is present
    const encryptedOption = Array.from(select.options).find((o) => o.value === 'encrypted-local');
    expect(encryptedOption).toBeTruthy();

    // No modal present
    expect(screen.queryByTestId('keychain-unavailable-modal')).toBeNull();
  });

  it('disables OS keychain option and shows explanatory text when keychain unavailable', () => {
    render(
      <JiraConnectorSettingsPanel
        settings={{ siteUrl: 'https://example.atlassian.net' }}
        tokenStatus={{ exists: false, backend: 'encrypted-local', preferredBackend: 'encrypted-local', keychainAvailable: false, encryptedLocalAvailable: true }}
        tokenDraft="jira-token"
        onSettingsChange={vi.fn()}
        onTokenChange={vi.fn()}
        onTokenSubmit={vi.fn()}
        onTokenDelete={vi.fn()}
        onSaveSettings={vi.fn()}
      />,
    );

    // OS keychain option is disabled
    const select = screen.getByLabelText('Token Storage') as HTMLSelectElement;
    const keychainOption = Array.from(select.options).find((o) => o.value === 'keychain');
    expect(keychainOption!.disabled).toBe(true);

    // Explanatory text about keychain not available
    expect(screen.getByText(/OS keychain storage is not available on this machine/i)).toBeTruthy();

    // Encrypted in-app storage option present
    const encryptedOption = Array.from(select.options).find((o) => o.value === 'encrypted-local');
    expect(encryptedOption).toBeTruthy();

    // No modal present
    expect(screen.queryByTestId('keychain-unavailable-modal')).toBeNull();

    // API token input and Save Token remain enabled
    const tokenInput = screen.getByLabelText('API Token');
    expect(tokenInput).not.toBeDisabled();
    const saveButton = screen.getByRole('button', { name: 'Save Token' });
    expect(saveButton).not.toBeDisabled();
  });

  it('shows unavailable notice, More Info accordion with Linux guidance when both backends unavailable', () => {
    setRendererPlatform('linux');
    render(
      <JiraConnectorSettingsPanel
        settings={{ siteUrl: 'https://example.atlassian.net' }}
        tokenStatus={{ exists: false, backend: 'unavailable', preferredBackend: 'keychain', keychainAvailable: false, encryptedLocalAvailable: false }}
        tokenDraft="jira-token"
        onSettingsChange={vi.fn()}
        onTokenChange={vi.fn()}
        onTokenSubmit={vi.fn()}
        onTokenDelete={vi.fn()}
        onSaveSettings={vi.fn()}
      />,
    );

    // Unavailable notice is visible
    expect(screen.getByText(/Secure credential storage is unavailable on this system/i)).toBeTruthy();

    // More Info accordion is present
    expect(screen.getByText('More Info')).toBeTruthy();

    // Linux-specific guidance appears in the details content
    expect(screen.getByText(/On Linux, SRGNT uses the desktop Secret Service API/i)).toBeTruthy();

    // Storage selector is disabled
    const select = screen.getByLabelText('Token Storage') as HTMLSelectElement;
    expect(select).toBeDisabled();

    // Both options are disabled
    const keychainOption = Array.from(select.options).find((o) => o.value === 'keychain');
    const encryptedOption = Array.from(select.options).find((o) => o.value === 'encrypted-local');
    expect(keychainOption!.disabled).toBe(true);
    expect(encryptedOption!.disabled).toBe(true);

    // Save Token button is disabled despite non-empty draft
    const saveButton = screen.getByRole('button', { name: 'Save Token' });
    expect(saveButton).toBeDisabled();
  });

  it('calls onSettingsChange with credentialStoragePreference when preference changes', () => {
    const onSettingsChange = vi.fn();
    render(
      <JiraConnectorSettingsPanel
        settings={{ siteUrl: 'https://example.atlassian.net', credentialStoragePreference: 'keychain' }}
        tokenStatus={{ exists: false, backend: 'keychain', preferredBackend: 'keychain', keychainAvailable: true, encryptedLocalAvailable: true }}
        tokenDraft=""
        onSettingsChange={onSettingsChange}
        onTokenChange={vi.fn()}
        onTokenSubmit={vi.fn()}
        onTokenDelete={vi.fn()}
        onSaveSettings={vi.fn()}
      />,
    );

    // Change select to encrypted-local
    const select = screen.getByLabelText('Token Storage') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'encrypted-local' } });

    // onSettingsChange called with credentialStoragePreference: 'encrypted-local'
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ credentialStoragePreference: 'encrypted-local' }),
    );
    // Preserves existing settings
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ siteUrl: 'https://example.atlassian.net' }),
    );
  });

  it('disables token saving only when the token draft is empty', () => {
    render(
      <JiraConnectorSettingsPanel
        settings={{ siteUrl: 'https://example.atlassian.net' }}
        tokenStatus={{ exists: false, backend: 'keychain', preferredBackend: 'keychain', keychainAvailable: true, encryptedLocalAvailable: true }}
        tokenDraft="   "
        onSettingsChange={vi.fn()}
        onTokenChange={vi.fn()}
        onTokenSubmit={vi.fn()}
        onTokenDelete={vi.fn()}
        onSaveSettings={vi.fn()}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save Token' });
    expect(saveButton).toBeDisabled();
  });

  it('shows Remove Token card only when token exists', () => {
    // No token — Remove Token should not be present
    const { unmount } = render(
      <JiraConnectorSettingsPanel
        settings={{ siteUrl: 'https://example.atlassian.net' }}
        tokenStatus={{ exists: false, backend: 'keychain', preferredBackend: 'keychain', keychainAvailable: true, encryptedLocalAvailable: true }}
        tokenDraft=""
        onSettingsChange={vi.fn()}
        onTokenChange={vi.fn()}
        onTokenSubmit={vi.fn()}
        onTokenDelete={vi.fn()}
        onSaveSettings={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Remove Token' })).toBeNull();

    unmount();

    // Token exists — Remove Token should be present
    const onTokenDelete = vi.fn();
    render(
      <JiraConnectorSettingsPanel
        settings={{ siteUrl: 'https://example.atlassian.net' }}
        tokenStatus={{ exists: true, backend: 'keychain', preferredBackend: 'keychain', keychainAvailable: true, encryptedLocalAvailable: true }}
        tokenDraft=""
        onSettingsChange={vi.fn()}
        onTokenChange={vi.fn()}
        onTokenSubmit={vi.fn()}
        onTokenDelete={onTokenDelete}
        onSaveSettings={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Remove Token' })).toBeTruthy();

    // Clicking Remove Token calls onTokenDelete
    fireEvent.click(screen.getByRole('button', { name: 'Remove Token' }));
    expect(onTokenDelete).toHaveBeenCalledTimes(1);
  });

  it('shows macOS Keychain guidance in More Info when unavailable on darwin', () => {
    setRendererPlatform('darwin');
    render(
      <JiraConnectorSettingsPanel
        settings={{ siteUrl: 'https://example.atlassian.net' }}
        tokenStatus={{ exists: false, backend: 'unavailable', preferredBackend: 'keychain', keychainAvailable: false, encryptedLocalAvailable: false }}
        tokenDraft=""
        onSettingsChange={vi.fn()}
        onTokenChange={vi.fn()}
        onTokenSubmit={vi.fn()}
        onTokenDelete={vi.fn()}
        onSaveSettings={vi.fn()}
      />,
    );

    // More Info accordion present
    expect(screen.getByText('More Info')).toBeTruthy();

    // macOS-specific Keychain guidance
    expect(screen.getByText(/On macOS, SRGNT uses Keychain by default/i)).toBeTruthy();
  });

  it('shows Windows Credential Manager guidance in More Info when unavailable on win32', () => {
    setRendererPlatform('win32');
    render(
      <JiraConnectorSettingsPanel
        settings={{ siteUrl: 'https://example.atlassian.net' }}
        tokenStatus={{ exists: false, backend: 'unavailable', preferredBackend: 'keychain', keychainAvailable: false, encryptedLocalAvailable: false }}
        tokenDraft=""
        onSettingsChange={vi.fn()}
        onTokenChange={vi.fn()}
        onTokenSubmit={vi.fn()}
        onTokenDelete={vi.fn()}
        onSaveSettings={vi.fn()}
      />,
    );

    // More Info accordion present
    expect(screen.getByText('More Info')).toBeTruthy();

    // Windows-specific Credential Manager guidance
    expect(screen.getByText(/On Windows, SRGNT uses Windows Credential Manager by default/i)).toBeTruthy();
  });

  it('shows fallback guidance in More Info when platform is unknown', () => {
    setRendererPlatform('freebsd');
    render(
      <JiraConnectorSettingsPanel
        settings={{ siteUrl: 'https://example.atlassian.net' }}
        tokenStatus={{ exists: false, backend: 'unavailable', preferredBackend: 'keychain', keychainAvailable: false, encryptedLocalAvailable: false }}
        tokenDraft=""
        onSettingsChange={vi.fn()}
        onTokenChange={vi.fn()}
        onTokenSubmit={vi.fn()}
        onTokenDelete={vi.fn()}
        onSaveSettings={vi.fn()}
      />,
    );

    // More Info accordion present
    expect(screen.getByText('More Info')).toBeTruthy();

    // Generic fallback guidance
    expect(screen.getByText(/Enable a supported OS credential store for this desktop session/i)).toBeTruthy();
  });
});
