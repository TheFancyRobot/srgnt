/**
 * Test fixture: conflicting markdown body content
 * 
 * Two devices have edited the same markdown file's body independently.
 * The body content has diverged and requires manual resolution.
 */

export const localVersionFrontmatter = {
  title: 'Architecture Decision',
  tags: ['adr', 'architecture'],
  created: '2026-02-01T09:00:00Z',
  updated: '2026-03-10T11:00:00Z',
};

export const remoteVersionFrontmatter = {
  title: 'Architecture Decision',
  tags: ['adr', 'architecture'],
  created: '2026-02-01T09:00:00Z',
  updated: '2026-03-12T16:45:00Z',
};

export const localVersionBody = `# Architecture Decision

## Context
We need to choose a sync strategy for the desktop app.

## Decision
We will use an encrypted payload approach where:
- Local workspace remains authoritative
- Changes are packaged as encrypted payloads
- Remote service stores encrypted replicas only

## Consequences
- Requires key management infrastructure
- Device registration needed
- Key rotation support essential
`;

export const remoteVersionBody = `# Architecture Decision

## Context
We need to choose a sync strategy for the desktop app.

## Decision
We will use Convex as the sync backend with:
- Client-side encryption for sensitive content
- Local-first with eventual consistency
- Convex handles metadata and coordination

## Consequences
- Convex becomes a dependency
- Need client-side encryption layer
- May expose metadata to Convex servers
`;

// Body conflicts require manual resolution - these versions are incompatible
// Expected result: conflict marker inserted, manual resolution needed
export const expectedMergedBody = `# Architecture Decision

## Context
We need to choose a sync strategy for the desktop app.

<<<<<<< LOCAL (device-desktop-1, 2026-03-10T11:00:00Z)
## Decision
We will use an encrypted payload approach where:
- Local workspace remains authoritative
- Changes are packaged as encrypted payloads
- Remote service stores encrypted replicas only

## Consequences
- Requires key management infrastructure
- Device registration needed
- Key rotation support essential
=======
## Decision
We will use Convex as the sync backend with:
- Client-side encryption for sensitive content
- Local-first with eventual consistency
- Convex handles metadata and coordination

## Consequences
- Convex becomes a dependency
- Need client-side encryption layer
- May expose metadata to Convex servers
>>>>>>> REMOTE (device-mobile-1, 2026-03-12T16:45:00Z)
`;

export const conflictInfo = {
  entityId: 'architecture-decision-001',
  conflictType: 'markdownBody' as const,
  localVersion: {
    id: 'v1-local',
    lastModified: '2026-03-10T11:00:00Z',
    deviceId: 'device-desktop-1',
    contentHash: 'hash-local-body',
    frontmatter: localVersionFrontmatter,
    body: localVersionBody,
  },
  remoteVersion: {
    id: 'v1-remote',
    lastModified: '2026-03-12T16:45:00Z',
    deviceId: 'device-mobile-1',
    contentHash: 'hash-remote-body',
    frontmatter: remoteVersionFrontmatter,
    body: remoteVersionBody,
  },
};
