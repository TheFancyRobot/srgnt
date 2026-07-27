import type { Page } from '@playwright/test';
import { completeOnboarding, expect, test } from './fixtures';

/**
 * Chat surface E2E (PHASE-23, STEP-23-05).
 *
 * Every test drives the *real* stack — Electron main spawns the bundled mock
 * agent as a child process through Supervisor + `AcpAgentConnection`, so a spec
 * covers spawn → ACP → IPC → renderer. The only thing scripted is the agent's
 * side of the conversation, injected per test as a scenario file
 * (`test.use({ mockScenario })` → `SRGNT_MOCK_SCENARIO`). No network, no LLM, no
 * `pi` binary; real-Pi checks stay manual this phase.
 *
 * Where the scenario can assert on what the *agent* received (`expect_prompt`,
 * `expect_cancel`, `expectOutcome`/`expectOptionId`) the test reads those
 * failures back through the `agentAssertions` fixture: a renderer that draws the
 * right prompt but answers with the wrong option looks identical from the DOM.
 */

/** Navigate to Chat and open a session against the mock agent. */
async function startChatSession(page: Page): Promise<void> {
  await completeOnboarding(page);
  // No `disableAnimations` here: the renderer's CSP rejects injected inline
  // styles, and every wait below polls a locator rather than a screenshot.
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByTestId('chat-view')).toBeVisible();
  // `mock` is the default target, so no selection is needed.
  await page.getByTestId('chat-new-session').click();
  await expect(page.getByTestId('chat-session-badge')).toBeVisible();
  await expect(page.getByTestId('chat-input')).toBeEnabled();
}

/** Type a prompt and send it. Does not wait for the turn to finish. */
async function sendPrompt(page: Page, text: string): Promise<void> {
  await page.getByTestId('chat-input').fill(text);
  await page.getByTestId('chat-send').click();
}

/** Send returns to enabled only once the whole turn has settled. */
async function waitForTurnEnd(page: Page): Promise<void> {
  await expect(page.getByTestId('chat-send')).toHaveText('Send');
}

test.describe('streaming render', () => {
  test.use({
    mockScenario: {
      name: 'e2e-streaming',
      directives: [
        { type: 'expect_prompt', contains: 'summarize the file' },
        { type: 'emit_chunks', channel: 'thought', chunks: ['Reading it. ', 'Two lines.'], delayMs: 5 },
        {
          type: 'emit_chunks',
          channel: 'agent',
          chunks: ['## Summary\n\n', 'It is **short**.'],
          delayMs: 5,
        },
      ],
    },
  });

  test('renders the user turn, streamed thought, and markdown reply', async ({
    window: page,
    agentAssertions,
  }) => {
    await startChatSession(page);
    await sendPrompt(page, 'summarize the file');

    await expect(page.getByTestId('chat-message-user')).toHaveText(/summarize the file/);

    // A finished thought auto-collapses, so expand it rather than racing the
    // stream for the window where it is open.
    const thought = page.getByTestId('chat-thought');
    await expect(thought).toHaveAttribute('data-streaming', 'false');
    await thought.getByRole('button').click();
    await expect(thought).toContainText('Reading it. Two lines.');

    const reply = page.getByTestId('chat-message-agent');
    // Markdown, not raw text: the heading and the emphasis must be real elements.
    await expect(reply.getByRole('heading', { name: 'Summary' })).toBeVisible();
    await expect(reply.locator('strong')).toHaveText('short');

    await waitForTurnEnd(page);
    // Streaming is finished, not merely rendered.
    await expect(reply).toHaveAttribute('data-streaming', 'false');
    expect(await agentAssertions()).toEqual([]);
  });
});

test.describe('tool call lifecycle', () => {
  test.use({
    mockScenario: {
      name: 'e2e-tool-calls',
      directives: [
        { type: 'tool_call', toolCallId: 't1', title: 'Edit answer.ts', kind: 'edit', status: 'pending' },
        // A scripted window, not a timing gamble: `pending` has to be observable
        // for "lifecycle" to mean anything.
        { type: 'sleep', ms: 400 },
        {
          type: 'tool_call_update',
          toolCallId: 't1',
          status: 'completed',
          content: [
            {
              type: 'diff',
              path: 'answer.ts',
              oldText: 'export const answer = 41;\n',
              newText: 'export const answer = 42;\n',
            },
          ],
        },
        { type: 'tool_call', toolCallId: 't2', title: 'Run checks', kind: 'execute', status: 'in_progress' },
        { type: 'sleep', ms: 100 },
        { type: 'tool_call_update', toolCallId: 't2', status: 'failed' },
      ],
    },
  });

  test('advances a card to completed with a diff, and shows a failed card', async ({
    window: page,
  }) => {
    await startChatSession(page);
    await sendPrompt(page, 'edit the file and run checks');

    const edit = page.locator('[data-testid="chat-tool-call"][data-tool-call-id="t1"]');
    await expect(edit).toHaveAttribute('data-status', 'pending');
    await expect(edit).toHaveAttribute('data-status', 'completed');
    await expect(edit).toHaveAttribute('data-kind', 'edit');

    // Diff content is behind the card's disclosure, like every other body block.
    await edit.getByTestId('chat-tool-call-toggle').click();
    const diff = edit.getByTestId('chat-diff');
    await expect(diff).toHaveAttribute('data-path', 'answer.ts');
    await expect(diff).toContainText('42');

    const checks = page.locator('[data-testid="chat-tool-call"][data-tool-call-id="t2"]');
    await expect(checks).toHaveAttribute('data-status', 'failed');
    await expect(checks.getByTestId('chat-tool-call-status')).toHaveText(/failed/i);

    await waitForTurnEnd(page);
  });
});

test.describe('permission allow', () => {
  test.use({
    mockScenario: {
      name: 'e2e-permission-allow',
      directives: [
        {
          type: 'request_permission',
          toolCallId: 'p1',
          title: 'Edit answer.ts',
          // `kind` + `locations` are what make this a *path-scoped* request
          // rather than the title-scoped `other` fallback (STEP-23-05).
          kind: 'edit',
          locations: [{ path: '/workspace/answer.ts' }],
          options: [
            { optionId: 'allow-once', name: 'Allow once', kind: 'allow_once' },
            { optionId: 'reject-once', name: 'Refuse', kind: 'reject_once' },
          ],
          expectOutcome: 'selected',
          expectOptionId: 'allow-once',
        },
        { type: 'emit_chunks', channel: 'agent', chunks: ['Edit applied.'] },
      ],
    },
  });

  test('blocks the turn until the user allows, then continues', async ({
    window: page,
    agentAssertions,
  }) => {
    await startChatSession(page);
    await sendPrompt(page, 'edit answer.ts');

    const prompt = page.getByTestId('chat-permission-prompt');
    await expect(prompt).toBeVisible();
    await expect(prompt.getByTestId('chat-permission-kind')).toHaveText('edit');
    await expect(prompt.getByTestId('chat-permission-detail')).toHaveText('/workspace/answer.ts');
    // The agent is genuinely blocked: nothing after the request has streamed.
    await expect(page.getByTestId('chat-message-agent')).toHaveCount(0);

    await prompt.getByTestId('chat-permission-option-allow-once').click();

    await expect(prompt).toHaveCount(0);
    await expect(page.getByTestId('chat-message-agent')).toContainText('Edit applied.');
    await waitForTurnEnd(page);
    // Proves the *answer* was right, not just the prompt: the agent asserted it
    // received `selected`/`allow-once`.
    expect(await agentAssertions()).toEqual([]);
  });
});

test.describe('permission deny', () => {
  test.use({
    mockScenario: {
      name: 'e2e-permission-deny',
      directives: [
        {
          type: 'request_permission',
          toolCallId: 'p1',
          title: 'Run a destructive command',
          // The command-scoped shape: `rawInput.command` is what the client reads
          // for an `execute` request that has no file locations.
          kind: 'execute',
          rawInput: { command: 'rm -rf /workspace/build' },
          options: [
            { optionId: 'allow-once', name: 'Allow once', kind: 'allow_once' },
            { optionId: 'reject-once', name: 'Refuse', kind: 'reject_once' },
          ],
          expectOutcome: 'selected',
          expectOptionId: 'reject-once',
        },
        { type: 'emit_chunks', channel: 'agent', chunks: ['Understood, I will not run it.'] },
      ],
    },
  });

  test('sends the rejection to the agent and the turn continues', async ({
    window: page,
    agentAssertions,
  }) => {
    await startChatSession(page);
    await sendPrompt(page, 'clean the build directory');

    const prompt = page.getByTestId('chat-permission-prompt');
    await expect(prompt).toBeVisible();
    await expect(prompt.getByTestId('chat-permission-kind')).toHaveText('execute');
    await expect(prompt.getByTestId('chat-permission-detail')).toHaveText('rm -rf /workspace/build');

    await prompt.getByTestId('chat-permission-option-reject-once').click();

    await expect(prompt).toHaveCount(0);
    await expect(page.getByTestId('chat-message-agent')).toContainText('Understood');
    await waitForTurnEnd(page);
    expect(await agentAssertions()).toEqual([]);
  });
});

test.describe('cancel mid-stream', () => {
  test.use({
    mockScenario: {
      name: 'e2e-cancel',
      directives: [
        { type: 'emit_chunks', channel: 'agent', chunks: ['Working on it…'] },
        // Blocks the turn until `session/cancel` actually arrives, so the
        // in-flight window comes from the agent, never from timing luck.
        { type: 'expect_cancel', timeoutMs: 5000 },
      ],
    },
  });

  test('stops the turn and accepts a follow-up prompt', async ({ window: page, agentAssertions }) => {
    await startChatSession(page);
    await sendPrompt(page, 'do something slow');

    await expect(page.getByTestId('chat-message-agent')).toContainText('Working on it…');
    const stop = page.getByTestId('chat-cancel');
    await expect(stop).toBeEnabled();
    await stop.click();

    await expect(page.getByTestId('chat-stop-notice')).toHaveAttribute('data-reason', 'cancelled');
    await waitForTurnEnd(page);
    // `expect_cancel` records a failure if no cancel reached the agent in 5s.
    expect(await agentAssertions()).toEqual([]);

    // The session survived the cancel: a second turn round-trips on it.
    await sendPrompt(page, 'try again please');
    await expect(page.getByTestId('chat-message-user')).toHaveCount(2);
    await expect(page.getByTestId('chat-message-agent')).toHaveCount(2);
    await page.getByTestId('chat-cancel').click();
    await waitForTurnEnd(page);
    expect(await agentAssertions()).toEqual([]);
  });
});

test.describe('agent crash recovery', () => {
  test.use({
    mockScenario: {
      name: 'e2e-crash',
      directives: [
        { type: 'emit_chunks', channel: 'agent', chunks: ['Starting the job.'] },
        { type: 'sleep', ms: 100 },
        { type: 'crash', exitCode: 9 },
      ],
    },
  });

  test('surfaces a recoverable banner and reopens a working session', async ({ window: page }) => {
    await startChatSession(page);
    await sendPrompt(page, 'run the job');

    const banner = page.getByTestId('chat-agent-down');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/Agent process/);
    // No white screen: the chat surface is still mounted and readable.
    await expect(page.getByTestId('chat-view')).toBeVisible();
    await expect(page.getByTestId('chat-message-agent')).toContainText('Starting the job.');

    await page.getByTestId('chat-recover').click();
    await expect(banner).toHaveCount(0);
    await expect(page.getByTestId('chat-session-badge')).toBeVisible();

    // Usable, not merely open: a fresh prompt streams on the new session.
    await sendPrompt(page, 'run it again');
    await expect(page.getByTestId('chat-message-agent')).toContainText('Starting the job.');
  });
});

test.describe('slash command menu', () => {
  test.use({
    mockScenario: {
      name: 'e2e-slash',
      directives: [
        {
          type: 'advertise_commands',
          commands: [
            { name: 'review', description: 'Review the working tree' },
            { name: 'test', description: 'Run the test suite' },
            { name: 'explain', description: 'Explain the current file' },
          ],
        },
        { type: 'emit_chunks', channel: 'agent', chunks: ['Commands are available.'] },
      ],
    },
  });

  test('lists agent-advertised commands, filters, and inserts one', async ({ window: page }) => {
    await startChatSession(page);
    // The menu is populated by a `session/update`, never hardcoded — so it is
    // empty until a turn has advertised something.
    await sendPrompt(page, 'what can you do');
    await waitForTurnEnd(page);

    const input = page.getByTestId('chat-input');
    await input.fill('/');
    await expect(page.getByTestId('chat-slash-menu')).toBeVisible();
    await expect(page.getByTestId('chat-slash-menu').getByRole('option')).toHaveCount(3);

    await input.fill('/re');
    await expect(page.getByTestId('chat-slash-menu').getByRole('option')).toHaveCount(1);
    await expect(page.getByTestId('chat-slash-item-review')).toContainText('Review the working tree');

    await input.press('Enter');
    await expect(page.getByTestId('chat-slash-menu')).toHaveCount(0);
    await expect(input).toHaveValue('/review ');
  });
});

test.describe('session modes', () => {
  test.use({
    mockScenario: {
      name: 'e2e-modes',
      initialize: { modes: ['off', 'low', 'high'] },
      directives: [
        { type: 'set_mode', modeId: 'high' },
        { type: 'emit_chunks', channel: 'agent', chunks: ['Switched myself to high.'] },
      ],
    },
  });

  test('reflects both a user switch and an agent-driven mode update', async ({ window: page }) => {
    await startChatSession(page);

    const select = page.getByTestId('chat-mode-select');
    // First advertised mode is the session's current one.
    await expect(select).toHaveValue('off');

    // User-driven: round-trips through `session/set_mode` and the agent's echoed
    // `current_mode_update`.
    await select.selectOption('low');
    await expect(select).toHaveValue('low');

    // Agent-driven: the scenario moves the session itself mid-turn.
    await sendPrompt(page, 'think harder');
    await expect(page.getByTestId('chat-message-agent')).toContainText('Switched myself to high.');
    await waitForTurnEnd(page);
    await expect(select).toHaveValue('high');
  });
});
