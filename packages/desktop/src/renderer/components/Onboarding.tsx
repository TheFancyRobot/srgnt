import React from 'react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  note?: string;
  isComplete?: boolean;
  requiresAction?: boolean;
  icon?: React.ReactNode;
  action?: {
    label: string;
    action: () => void | Promise<void>;
  };
}

export interface OnboardingFlow {
  steps: OnboardingStep[];
  onComplete: () => void;
  onSkip: () => void;
}

const stepIcons: Record<string, React.ReactNode> = {
  workspace: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  connectors: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  ready: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
};

export function OnboardingWizard({ flow }: { flow: OnboardingFlow }): React.ReactElement {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isWorking, setIsWorking] = React.useState(false);
  const step = flow.steps[currentStep];
  const progress = ((currentStep + 1) / flow.steps.length) * 100;
  const isLast = currentStep === flow.steps.length - 1;
  const canContinue = !step.requiresAction || Boolean(step.isComplete);

  const handleNext = () => {
    if (!isLast) {
      setCurrentStep(currentStep + 1);
    } else {
      flow.onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = async () => {
    if (!step.action) {
      return;
    }

    setIsWorking(true);
    try {
      await step.action.action();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface-secondary grain flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-scale-in">
        {/* Card */}
        <div className="card p-0 overflow-hidden shadow-xl">
          {/* Progress bar */}
          <div className="h-1 bg-surface-tertiary">
            <div
              className="h-full bg-gradient-to-r from-srgnt-400 to-srgnt-500 transition-all duration-500 ease-out-expo"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <span className="titlebar-logo" style={{ paddingLeft: 0 }}>srgnt</span>
              <button
                type="button"
                onClick={flow.onSkip}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Skip setup
              </button>
            </div>

            {/* Step counter */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-mono-data text-text-tertiary">
                {currentStep + 1}/{flow.steps.length}
              </span>
              <div className="flex gap-1.5">
                {flow.steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === currentStep ? 'w-6 bg-srgnt-400' : i < currentStep ? 'w-3 bg-srgnt-300' : 'w-3 bg-border-default'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="text-center mb-8 animate-fade-in" key={step.id}>
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-surface-brand border border-border-brand flex items-center justify-center text-text-brand">
                {stepIcons[step.id] || stepIcons.workspace}
              </div>
              <h2 className="text-xl font-display font-semibold text-text-primary mb-2 tracking-tight">
                {step.title}
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
                {step.description}
              </p>
              {step.note && (
                <p className="mt-3 text-xs font-mono-data text-text-tertiary break-all max-w-sm mx-auto">
                  {step.note}
                </p>
              )}
            </div>

            {/* Step action */}
            {step.action && (
              <div className="flex justify-center mb-8">
                <button
                  type="button"
                  onClick={handleAction}
                  disabled={isWorking}
                  className="btn btn-secondary"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                  </svg>
                  {isWorking ? 'Working...' : step.action.label}
                </button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-5 border-t border-border-muted">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="btn btn-ghost text-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canContinue || isWorking}
                className="btn btn-primary text-xs"
              >
                {isLast ? 'Get Started' : 'Next'}
                {!isLast && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export const defaultOnboardingSteps: OnboardingStep[] = [
  {
    id: 'workspace',
    title: 'Set Up Your Workspace',
    description: 'Choose a folder for your srgnt workspace. This is where your configuration and cached data will live.',
    action: {
      label: 'Choose Folder',
      action: async () => {
        if (window.srgnt) {
          try {
            const root = await window.srgnt.getWorkspaceRoot();
            if (root) {
              console.log('[onboarding] Workspace already configured:', root);
            } else {
              console.log('[onboarding] No workspace set - user should select via settings');
            }
          } catch (err) {
            console.error('[onboarding] Failed to get workspace:', err);
          }
        }
      },
    },
  },
  {
    id: 'connectors',
    title: 'Connect Your Tools',
    description: 'Connect Microsoft Teams, Jira, and Outlook to start aggregating your tasks, calendar, and messages into one view.',
    action: {
      label: 'Add Connector',
      action: () => {
        console.log('[onboarding] Navigate to connectors panel');
      },
    },
  },
  {
    id: 'ready',
    title: 'You\'re All Set',
    description: 'Your daily command center is ready. srgnt will aggregate data from your connected tools each morning.',
  },
];
