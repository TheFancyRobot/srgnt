/**
 * Test fixture: offline reconnect scenario
 * 
 * User works offline on multiple devices, then reconnects.
 * Changes have accumulated on each device independently.
 */

export const deviceADisconnectedAt = '2026-03-25T18:00:00Z';
export const deviceBDisconnectedAt = '2026-03-25T18:30:00Z';
export const deviceAReconnectedAt = '2026-03-26T09:00:00Z';
export const deviceBReconnectedAt = '2026-03-26T10:15:00Z';

// Device A's offline edits (disconnected from 2026-03-25 18:00, reconnected 2026-03-26 09:00)
export const deviceAOlineEdits = [
  {
    entityId: 'note-001',
    lastModified: '2026-03-25T19:00:00Z',
    changes: {
      frontmatter: { updated: '2026-03-25T19:00:00Z', tags: ['edited-offline'] },
      body: 'Added new section to note.\n',
    },
  },
  {
    entityId: 'note-002',
    lastModified: '2026-03-25T20:00:00Z',
    changes: {
      frontmatter: { updated: '2026-03-25T20:00:00Z' },
      body: 'Another note edited while offline.\n',
    },
  },
];

// Device B's offline edits (disconnected from 2026-03-25 18:30, reconnected 2026-03-26 10:15)
export const deviceBOnlineEdits = [
  {
    entityId: 'note-001',
    lastModified: '2026-03-25T21:00:00Z', // After device A's edit
    changes: {
      frontmatter: { updated: '2026-03-25T21:00:00Z', tags: ['mobile-edit'] },
      body: 'Quick edit from mobile.\n',
    },
  },
  {
    entityId: 'note-003',
    lastModified: '2026-03-25T22:00:00Z',
    changes: {
      frontmatter: { title: 'New Note Created Offline', updated: '2026-03-25T22:00:00Z' },
      body: 'This note was created while offline.\n',
    },
  },
];

// Sync order matters - device B connected later, so its changes are "newer"
// Device A syncs first with server state (empty at disconnect point)
// Then device B syncs with server state (now includes A's changes)

// Expected sync sequence for note-001:
// 1. Device A pushes: local edit at 19:00
// 2. Server accepts, note-001 now has A's changes
// 3. Device B pushes: local edit at 21:00 (conflicts with A's 19:00 edit)
// 4. Conflict detected: field-level merge possible for frontmatter tags

export const expectedNote001MergedFrontmatter = {
  title: 'Note 001',
  tags: ['edited-offline', 'mobile-edit'], // union of both devices' tags
  updated: '2026-03-25T21:00:00Z', // latest wins
};

export const expectedNote001MergedBody = `<<<<<<< LOCAL (device-desktop-1, 2026-03-25T19:00:00Z)
Added new section to note.
=======
Quick edit from mobile.
>>>>>>> REMOTE (device-mobile-1, 2026-03-25T21:00:00Z)
`; // Body conflict surfaced for manual resolution with conflict markers

// note-002: only device A edited, should sync cleanly
export const expectedNote002 = {
  entityId: 'note-002',
  frontmatter: { updated: '2026-03-25T20:00:00Z' },
  body: 'Another note edited while offline.\n',
  syncStatus: 'clean', // no conflict
};

// note-003: created on device B while offline
// Server has no record, should sync as new file
export const expectedNote003 = {
  entityId: 'note-003',
  frontmatter: { title: 'New Note Created Offline', updated: '2026-03-25T22:00:00Z' },
  body: 'This note was created while offline.\n',
  syncStatus: 'new', // new file, no conflict
};
