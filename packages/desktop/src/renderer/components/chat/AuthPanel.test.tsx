/**
 * @vitest-environment jsdom
 */
import type { AuthMethod, ChatAuthRequired } from '@srgnt/contracts';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthPanel } from './AuthPanel.js';

afterEach(cleanup);

const external: AuthMethod = {
  id: 'pi_terminal_login',
  name: 'Launch pi in the terminal',
  description: 'Start pi in an interactive terminal to configure API keys or login',
  kind: 'external-command',
  command: { command: 'pi', args: ['--terminal-login'], env: {} },
};

const docsOnly: AuthMethod = {
  id: 'opencode-login',
  name: 'Login with opencode',
  description: 'Run `opencode auth login` in the terminal',
  kind: 'docs-only',
};

const rpc: AuthMethod = { id: 'oauth', name: 'Sign in', kind: 'rpc-authenticate' };

const auth = (methods: readonly AuthMethod[]): ChatAuthRequired => ({
  authRequired: true,
  harnessId: 'some-harness',
  harnessName: 'Some Harness',
  docsUrl: 'https://example.test/docs',
  authMethods: methods,
  detail: 'ACP request session/new failed: Authentication required',
});

let clipboard: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clipboard = vi.fn();
  (globalThis as { window: { srgnt: unknown; navigator: unknown } }).window.srgnt = {
    openExternal: vi.fn(async () => {}),
  };
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: { writeText: clipboard },
    configurable: true,
  });
});

const renderPanel = (
  methods: readonly AuthMethod[],
  overrides: Partial<React.ComponentProps<typeof AuthPanel>> = {},
) =>
  render(
    <AuthPanel
      auth={auth(methods)}
      onRetry={vi.fn()}
      onAuthenticate={vi.fn()}
      onDismiss={vi.fn()}
      {...overrides}
    />,
  );

const method = (kind: string): HTMLElement =>
  screen.getAllByTestId('auth-method').find((element) => element.getAttribute('data-kind') === kind)!;

describe('AuthPanel', () => {
  it('renders the copyable command for an external-command method, built from its data', () => {
    renderPanel([external]);
    expect(screen.getByTestId('auth-command')).toHaveTextContent('pi --terminal-login');
    fireEvent.click(screen.getByTestId('auth-copy'));
    expect(clipboard).toHaveBeenCalledWith('pi --terminal-login');
    // No RPC affordance: this method is run by the user, not by srgnt.
    expect(method('external-command').querySelector('[data-testid="auth-authenticate"]')).toBeNull();
  });

  it('renders instructions and docs for a docs-only method, and never invents a command', () => {
    renderPanel([docsOnly]);
    // opencode's login line exists only inside its own description; srgnt shows
    // the description rather than reconstructing `opencode auth login`.
    expect(screen.getByTestId('auth-docs-only')).toBeInTheDocument();
    expect(method('docs-only')).toHaveTextContent('Run `opencode auth login` in the terminal');
    expect(screen.queryByTestId('auth-command')).toBeNull();
    expect(screen.queryByTestId('auth-authenticate')).toBeNull();
  });

  it('calls authenticate(methodId) for an rpc-authenticate method, and shows no command', () => {
    const onAuthenticate = vi.fn();
    renderPanel([rpc], { onAuthenticate });
    fireEvent.click(screen.getByTestId('auth-authenticate'));
    expect(onAuthenticate).toHaveBeenCalledWith('oauth');
    expect(screen.queryByTestId('auth-command')).toBeNull();
  });

  it('chooses the affordance by kind alone, with several methods on one panel', () => {
    renderPanel([external, docsOnly, rpc]);
    expect(screen.getAllByTestId('auth-method').map((element) => element.getAttribute('data-kind'))).toEqual([
      'external-command',
      'docs-only',
      'rpc-authenticate',
    ]);
    expect(screen.getAllByTestId('auth-command')).toHaveLength(1);
    expect(screen.getAllByTestId('auth-authenticate')).toHaveLength(1);
  });

  it('degrades to generic guidance when the agent advertised no method at all', () => {
    renderPanel([]);
    expect(screen.getByTestId('auth-no-methods')).toBeInTheDocument();
    // Retry and the docs link are still the way out.
    expect(screen.getByTestId('auth-retry')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('auth-docs'));
    expect(window.srgnt.openExternal).toHaveBeenCalledWith('https://example.test/docs');
  });

  it('retries and dismisses', () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    renderPanel([docsOnly], { onRetry, onDismiss });
    fireEvent.click(screen.getByTestId('auth-retry'));
    expect(onRetry).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('keeps the agent’s own error text', () => {
    renderPanel([docsOnly]);
    expect(screen.getByTestId('auth-detail')).toHaveTextContent('Authentication required');
  });

  it('never offers a credential field', () => {
    // Constraint check: harness auth belongs to the harness. srgnt links,
    // instructs and retries — it must never collect a token or a password.
    const { container } = renderPanel([external, docsOnly, rpc]);
    expect(container.querySelectorAll('input, textarea, form')).toHaveLength(0);
  });

  it('disables the RPC affordance when this build cannot authenticate', () => {
    renderPanel([rpc], { onAuthenticate: undefined });
    expect(screen.getByTestId('auth-authenticate')).toBeDisabled();
  });
});
