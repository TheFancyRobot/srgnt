import { completeOnboarding, expect, test } from './fixtures';

/**
 * The auth wall, end to end (PHASE-25, STEP-25-03).
 *
 * Real stack: Electron main spawns the bundled mock agent, which answers
 * `session/new` with ACP's `-32000` until `authenticate` lands. What this proves
 * over the component tests is the whole path — a JSON-RPC error code, raised by
 * a real child process, arriving in the renderer as guidance rather than as a
 * raw error toast, and a retry that genuinely opens a session.
 */

const methods = [
  // Prose only, like opencode's: srgnt cannot build a command for it.
  { id: 'prose-login', name: 'Log in with the CLI', description: 'Run `agent auth login` in your terminal' },
  // Declares a mechanism srgnt can drive over the protocol.
  { id: 'oauth', name: 'Sign in with srgnt', type: 'oauth' },
];

test.describe('auth-required session creation', () => {
  test.use({ mockScenario: { name: 'e2e-auth-required', directives: [], authRequired: { methods } } });

  test('renders guidance instead of a raw error, and retries into a session', async ({ window }) => {
    await completeOnboarding(window);
    await window.getByRole('button', { name: 'Chat', exact: true }).click();
    await expect(window.getByTestId('chat-view')).toBeVisible();

    await window.getByTestId('chat-new-session').click();

    // The wall, as guidance. No error toast, and no session was opened.
    await expect(window.getByTestId('chat-auth-panel')).toBeVisible();
    await expect(window.getByTestId('chat-error')).toBeHidden();
    await expect(window.getByTestId('chat-session-badge')).toBeHidden();

    // Affordances are chosen by the normalized `kind`, not by the harness or the
    // method name: prose gets instructions, the declared mechanism gets a call.
    await expect(window.locator('[data-testid="auth-method"][data-kind="docs-only"]')).toContainText(
      'Run `agent auth login` in your terminal',
    );
    await expect(window.getByTestId('auth-docs-only')).toBeVisible();
    await expect(window.getByTestId('auth-command')).toBeHidden();
    // srgnt never asks for the credential itself.
    await expect(window.locator('[data-testid="chat-auth-panel"] input')).toHaveCount(0);

    await window.getByTestId('auth-authenticate').click();

    await expect(window.getByTestId('chat-session-badge')).toBeVisible();
    await expect(window.getByTestId('chat-auth-panel')).toBeHidden();
    await expect(window.getByTestId('chat-input')).toBeEnabled();
  });
});
