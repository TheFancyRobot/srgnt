import type { LaunchContext, LaunchTemplate } from '@srgnt/contracts';

export { type LaunchContext, type LaunchTemplate };

export const LAUNCH_TEMPLATES: LaunchTemplate[] = [
  {
    id: 'terminal-readonly',
    name: 'Open Terminal',
    description: 'Open a terminal in the workspace directory (read-only)',
    command: process.platform === 'win32' ? 'powershell.exe' : 'bash',
    args: process.platform === 'win32' ? ['-NoLogo'] : ['--login'],
    intent: 'readOnly',
    requiredCapabilities: [],
  },
  {
    id: 'git-status',
    name: 'Git Status',
    description: 'Check git status in the current workspace',
    command: 'git',
    args: ['status'],
    intent: 'readOnly',
    requiredCapabilities: [],
  },
  {
    id: 'git-log',
    name: 'Git Log',
    description: 'View recent git commits',
    command: 'git',
    args: ['log', '--oneline', '-20'],
    intent: 'readOnly',
    requiredCapabilities: [],
  },
];

export function getTemplateById(id: string): LaunchTemplate | undefined {
  return LAUNCH_TEMPLATES.find((t) => t.id === id);
}

export function requiresApproval(template: LaunchTemplate): boolean {
  return template.intent === 'artifactAffecting';
}

export function createLaunchContext(params: {
  sourceWorkflow: string;
  sourceArtifactId?: string;
  sourceRunId?: string;
  workingDirectory: string;
  template: LaunchTemplate;
  command?: string;
  env?: Record<string, string>;
  labels?: string[];
}): LaunchContext {
  return {
    launchId: `launch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sourceWorkflow: params.sourceWorkflow,
    sourceArtifactId: params.sourceArtifactId,
    sourceRunId: params.sourceRunId,
    workingDirectory: params.workingDirectory,
    command: params.command || params.template.command,
    env: params.env,
    labels: params.labels,
    intent: params.template.intent,
    createdAt: new Date().toISOString(),
  };
}