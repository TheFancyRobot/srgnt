/**
 * Test fixture: conflicting YAML frontmatter
 * 
 * Two devices have edited the same markdown file's frontmatter independently.
 * Tags and metadata fields have diverged.
 */

export const localVersionFrontmatter = {
  title: 'Meeting Notes',
  tags: ['meeting', 'project-a', 'q2'],
  created: '2026-03-01T10:00:00Z',
  updated: '2026-03-15T14:30:00Z',
  attendees: ['alice', 'bob'],
  status: 'in-progress',
};

export const remoteVersionFrontmatter = {
  title: 'Meeting Notes',
  tags: ['meeting', 'project-b', 'important'],
  created: '2026-03-01T10:00:00Z',
  updated: '2026-03-16T09:15:00Z',
  status: 'review',
  priority: 'high',
};

export const localVersionBody = `# Meeting Notes

Discussed project timeline and deliverables.
Action items assigned to team members.
`;

export const remoteVersionBody = `# Meeting Notes

Discussed project timeline and deliverables.
Action items assigned to team members.
`;

// Expected result after field-level merge
export const expectedMergedFrontmatter = {
  title: 'Meeting Notes',
  tags: ['meeting', 'project-a', 'project-b', 'q2', 'important'], // union of tags
  created: '2026-03-01T10:00:00Z', // unchanged (same both sides)
  updated: '2026-03-16T09:15:00Z', // latest timestamp wins
  attendees: ['alice', 'bob'], // only in local
  status: 'review', // remote wins (more recent)
  priority: 'high', // only in remote
};

export const conflictInfo = {
  entityId: 'meeting-notes-001',
  conflictType: 'frontmatterField' as const,
  localVersion: {
    id: 'v1-local',
    lastModified: '2026-03-15T14:30:00Z',
    deviceId: 'device-desktop-1',
    contentHash: 'hash-local-frontmatter',
    frontmatter: localVersionFrontmatter,
    body: localVersionBody,
  },
  remoteVersion: {
    id: 'v1-remote',
    lastModified: '2026-03-16T09:15:00Z',
    deviceId: 'device-mobile-1',
    contentHash: 'hash-remote-frontmatter',
    frontmatter: remoteVersionFrontmatter,
    body: remoteVersionBody,
  },
};
