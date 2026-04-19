/**
 * Test fixture: deleted vs modified conflict
 * 
 * One device deleted a file while another device modified it.
 * This is a common offline sync scenario.
 */

export const deletedVersionInfo = {
  entityId: 'task-file-042',
  conflictType: 'fileDeleted' as const,
  // The "local" version represents what the deleting device had
  localVersion: {
    id: 'deleted-v1',
    lastModified: '2026-03-20T08:00:00Z', // when it was deleted
    deviceId: 'device-desktop-1',
    contentHash: 'hash-deleted', // hash of empty/deleted state
    // No frontmatter or body - file was deleted
  },
  // The "remote" version represents what the other device had before sync
  remoteVersion: {
    id: 'modified-v1',
    lastModified: '2026-03-20T09:30:00Z', // modified AFTER deletion on other device
    deviceId: 'device-mobile-1',
    contentHash: 'hash-modified-content',
    frontmatter: {
      title: 'Q1 Planning',
      tags: ['planning', 'q1'],
      status: 'completed',
      updated: '2026-03-20T09:30:00Z',
    },
    body: `# Q1 Planning

Completed the quarterly planning session.
All tasks have been assigned to team members.
`,
  },
};

// Expected resolution: since the other device made meaningful modifications
// AFTER the delete was initiated, the content should be preserved
// with a warning/restoration marker
export const expectedRestoredContent = {
  frontmatter: {
    title: 'Q1 Planning',
    tags: ['planning', 'q1'],
    status: 'completed',
    updated: '2026-03-20T09:30:00Z',
    _restoredFromTrash: '2026-03-20T09:30:00Z',
    _originalDeleteDate: '2026-03-20T08:00:00Z',
  },
  body: `# Q1 Planning

Completed the quarterly planning session.
All tasks have been assigned to team members.

---
[Note: This file was deleted on device-desktop-1 at 2026-03-20T08:00:00Z
but modified on device-mobile-1 at 2026-03-20T09:30:00Z.
Content was restored from the newer version.]
`,
};

// Alternative resolution (last-write-wins): file stays deleted
// This fixture represents the NEEDS-WORK scenario where
// the architecture doesn't yet define the right behavior
