import { describe, expect, it } from 'vitest';
import { SSkillManifest, parseSync } from '@srgnt/contracts';
import { dailyBriefingManifest } from './manifest.js';

describe('dailyBriefingManifest', () => {
  it('matches the shared skill contract', () => {
    expect(parseSync(SSkillManifest, dailyBriefingManifest)).toEqual(dailyBriefingManifest);
  });

  it('declares the expected connector and artifact capabilities', () => {
    expect(dailyBriefingManifest.connectorDependencies).toEqual(['jira', 'outlook']);
    expect(dailyBriefingManifest.requiredCapabilities).toContain('write:artifacts');
  });
});
