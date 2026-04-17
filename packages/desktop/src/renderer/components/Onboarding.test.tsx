/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { OnboardingWizard, defaultOnboardingSteps } from './Onboarding.js';
import type { OnboardingFlow } from './Onboarding.js';

function makeFlow(overrides?: Partial<OnboardingFlow>): OnboardingFlow {
  return {
    steps: defaultOnboardingSteps,
    onComplete: vi.fn(),
    onSkip: vi.fn(),
    ...overrides,
  };
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(window, 'srgnt', {
      value: { getWorkspaceRoot: vi.fn().mockResolvedValue('/test') },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders step title and description', () => {
    const flow = makeFlow();
    render(React.createElement(OnboardingWizard, { flow }));
    expect(screen.getByText('Set Up Your Workspace')).toBeTruthy();
    expect(
      screen.getByText(/Choose a folder for your srgnt workspace/),
    ).toBeTruthy();
  });

  it('shows "Skip setup" button', () => {
    const flow = makeFlow();
    render(React.createElement(OnboardingWizard, { flow }));
    expect(screen.getByText('Skip setup')).toBeTruthy();
  });

  it('shows step counter (1/3)', () => {
    const flow = makeFlow();
    render(React.createElement(OnboardingWizard, { flow }));
    expect(screen.getByText('1/3')).toBeTruthy();
  });

  it('shows progress bar', () => {
    const flow = makeFlow();
    const { container } = render(
      React.createElement(OnboardingWizard, { flow }),
    );
    const bar = container.querySelector(
      '.bg-gradient-to-r.from-srgnt-400',
    ) as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.width).toBe('33.33333333333333%');
  });

  it('calls onComplete when "Get Started" clicked on last step', () => {
    const onComplete = vi.fn();
    const flow = makeFlow({
      steps: [{ id: 'ready', title: 'Done', description: 'All set' }],
      onComplete,
    });
    render(React.createElement(OnboardingWizard, { flow }));
    fireEvent.click(screen.getByText('Get Started'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when "Skip setup" clicked', () => {
    const onSkip = vi.fn();
    const flow = makeFlow({ onSkip });
    render(React.createElement(OnboardingWizard, { flow }));
    fireEvent.click(screen.getByText('Skip setup'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('navigates to next step when "Next" clicked', () => {
    const flow = makeFlow();
    render(React.createElement(OnboardingWizard, { flow }));
    expect(screen.getByText('Set Up Your Workspace')).toBeTruthy();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Connect Your Tools')).toBeTruthy();
    expect(screen.getByText('2/3')).toBeTruthy();
  });

  it('navigates back when "Back" clicked', () => {
    const flow = makeFlow();
    render(React.createElement(OnboardingWizard, { flow }));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Connect Your Tools')).toBeTruthy();
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Set Up Your Workspace')).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();
  });

  it('navigates through all steps and clicks "Get Started" on last', () => {
    const onComplete = vi.fn();
    const flow = makeFlow({ onComplete });
    render(React.createElement(OnboardingWizard, { flow }));
    // Step 1 -> Step 2
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Connect Your Tools')).toBeTruthy();
    // Step 2 -> Step 3
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText("You're All Set")).toBeTruthy();
    // Step 3: click Get Started
    fireEvent.click(screen.getByText('Get Started'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows "Working..." while async action is running', async () => {
    let resolveAction!: () => void;
    const actionPromise = new Promise<void>((r) => { resolveAction = r; });
    const flow = makeFlow({
      steps: [
        {
          id: 'workspace',
          title: 'Test Step',
          description: 'Testing async action',
          action: { label: 'Do Thing', action: () => actionPromise },
        },
      ],
    });
    render(React.createElement(OnboardingWizard, { flow }));
    await act(async () => {
      fireEvent.click(screen.getByText('Do Thing'));
    });
    expect(screen.getByText('Working...')).toBeTruthy();
    await act(async () => {
      resolveAction();
      await actionPromise;
    });
    await vi.waitFor(() => {
      expect(screen.queryByText('Working...')).toBeNull();
    });
  });

  it('disables Next when step requires action and is not complete', () => {
    const flow = makeFlow({
      steps: [
        {
          id: 'workspace',
          title: 'Test',
          description: 'Test',
          requiresAction: true,
          isComplete: false,
        },
      ],
    });
    render(React.createElement(OnboardingWizard, { flow }));
    expect(screen.getByText('Get Started')).toBeDisabled();
  });

  it('enables Next when step requires action and is complete', () => {
    const flow = makeFlow({
      steps: [
        {
          id: 'workspace',
          title: 'Test',
          description: 'Test',
          requiresAction: true,
          isComplete: true,
        },
      ],
    });
    render(React.createElement(OnboardingWizard, { flow }));
    expect(screen.getByText('Get Started')).not.toBeDisabled();
  });

  it('resets isWorking state even when action throws', async () => {
    const flow = makeFlow({
      steps: [
        {
          id: 'workspace',
          title: 'Test Step',
          description: 'Testing error in action',
          action: {
            label: 'Fail Thing',
            action: () => Promise.reject(new Error('action failed')),
          },
        },
      ],
    });
    render(React.createElement(OnboardingWizard, { flow }));
    await act(async () => {
      fireEvent.click(screen.getByText('Fail Thing'));
      await Promise.resolve();
    });
    expect(screen.queryByText('Working...')).toBeNull();
    expect(screen.getByText('Fail Thing')).not.toBeDisabled();
  });

  it('resets isWorking state when window.srgnt.getWorkspaceRoot() rejects', async () => {
    // The source catch block swallows getWorkspaceRoot() errors without crashing the UI
    Object.defineProperty(window, 'srgnt', {
      value: { getWorkspaceRoot: vi.fn().mockRejectedValue(new Error('workspace unavailable')) },
      writable: true,
      configurable: true,
    });
    const flow = makeFlow();
    render(React.createElement(OnboardingWizard, { flow }));
    // Click the workspace action button — getWorkspaceRoot() rejects, catch block swallows it
    await act(async () => {
      fireEvent.click(screen.getByText('Choose Folder'));
      await Promise.resolve();
    });
    expect(screen.queryByText('Working...')).toBeNull();
  });

  it('shows step note when provided', () => {
    const flow = makeFlow({
      steps: [
        {
          id: 'workspace',
          title: 'Test',
          description: 'Test desc',
          note: '/path/to/workspace',
        },
      ],
    });
    render(React.createElement(OnboardingWizard, { flow }));
    expect(screen.getByText('/path/to/workspace')).toBeTruthy();
  });
});
