import { SSkillManifest, parseSync, type SkillManifest } from '@srgnt/contracts';

export const dailyBriefingManifest: SkillManifest = parseSync(SSkillManifest, {
  name: 'daily-briefing',
  version: '0.1.0',
  description: 'Generate a daily briefing with tasks, calendar events, and messages',
  purpose: 'Prepare a summary of the day including tasks, meetings, and actionable items',
  inputs: [
    {
      name: 'date',
      description: 'The date for the briefing (ISO format)',
      type: 'date',
      required: false,
    },
    {
      name: 'includeTasks',
      description: 'Include tasks in the briefing',
      type: 'boolean',
      required: false,
      default: true,
    },
    {
      name: 'includeCalendar',
      description: 'Include calendar events in the briefing',
      type: 'boolean',
      required: false,
      default: true,
    },
    {
      name: 'includeMessages',
      description: 'Include recent messages in the briefing',
      type: 'boolean',
      required: false,
      default: true,
    },
  ],
  outputs: [
    {
      name: 'briefing',
      description: 'The generated daily briefing document',
      contentType: 'markdown',
    },
  ],
  requiredCapabilities: ['read:tasks', 'read:calendar', 'read:messages', 'write:artifacts'],
  approvalRequirements: [
    {
      capability: 'read:tasks',
      reason: 'Need to read tasks to include in briefing',
    },
    {
      capability: 'read:calendar',
      reason: 'Need to read calendar to include meetings',
    },
    {
      capability: 'read:messages',
      reason: 'Need to read messages for context',
    },
    {
      capability: 'write:artifacts',
      reason: 'Need to create the briefing artifact',
    },
  ],
  connectorDependencies: ['jira', 'outlook'],
  promptTemplate: `Generate a daily briefing for {{date}}.

Include:
- Tasks: {{includeTasks}}
- Calendar: {{includeCalendar}}
- Messages: {{includeMessages}}

Format as a markdown document with sections for each category.`,
  metadata: {
    author: 'srgnt',
    tags: ['daily', 'briefing', 'automation'],
    example: true,
  },
});

export type DailyBriefingManifest = typeof dailyBriefingManifest;
