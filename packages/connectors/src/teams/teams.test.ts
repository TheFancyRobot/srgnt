import { describe, it, expect } from 'vitest';
import {
  teamsFixtures,
  loadTeamsFixtures,
  mapTeamsMessageToMessage,
  mapTeamsMemberToPerson,
  teamsConnectorManifest,
} from './index.js';

describe('teamsFixtures', () => {
  it('has messages', () => {
    expect(teamsFixtures.messages.length).toBeGreaterThan(0);
  });

  it('has members', () => {
    expect(teamsFixtures.members.length).toBeGreaterThan(0);
  });
});

describe('loadTeamsFixtures', () => {
  it('loads messages and persons', () => {
    const { messages, persons } = loadTeamsFixtures();
    expect(messages).toHaveLength(3);
    expect(persons).toHaveLength(3);
  });

  it('maps messages correctly', () => {
    const { messages } = loadTeamsFixtures();
    const deploy = messages.find((m) => m.envelope.providerId === 'msg-001');
    expect(deploy?.subject).toBe('Deploy v2.1 today');
    expect(deploy?.sender).toBe('alice@example.com');
    expect(deploy?.isRead).toBe(true);
  });
});

describe('mapTeamsMessageToMessage', () => {
  it('maps subject correctly', () => {
    const msg = mapTeamsMessageToMessage(teamsFixtures.messages[0]);
    expect(msg.subject).toBe('Deploy v2.1 today');
  });

  it('omits empty subject', () => {
    const msg = mapTeamsMessageToMessage(teamsFixtures.messages[2]);
    expect(msg.subject).toBeUndefined();
  });

  it('maps threadId', () => {
    const msg = mapTeamsMessageToMessage(teamsFixtures.messages[0]);
    expect(msg.threadId).toBe('thread-deploy-v21');
  });

  it('preserves channel name in providerMetadata', () => {
    const msg = mapTeamsMessageToMessage(teamsFixtures.messages[0]);
    expect(msg.providerMetadata?.channelName).toBe('Engineering');
  });

  it('sets envelope provider to teams', () => {
    const msg = mapTeamsMessageToMessage(teamsFixtures.messages[0]);
    expect(msg.envelope.provider).toBe('teams');
    expect(msg.envelope.canonicalType).toBe('Message');
  });
});

describe('mapTeamsMemberToPerson', () => {
  it('maps member correctly', () => {
    const person = mapTeamsMemberToPerson(teamsFixtures.members[0]);
    expect(person.name).toBe('Alice Engineer');
    expect(person.email).toBe('alice@example.com');
    expect(person.envelope.provider).toBe('teams');
  });
});

describe('teamsConnectorManifest', () => {
  it('has correct id', () => {
    expect(teamsConnectorManifest.id).toBe('teams');
  });

  it('has read, write, and subscribe capabilities', () => {
    expect(teamsConnectorManifest.capabilities.length).toBe(3);
    const caps = teamsConnectorManifest.capabilities.map((c) => c.capability);
    expect(caps).toContain('read');
    expect(caps).toContain('write');
    expect(caps).toContain('subscribe');
  });

  it('has correct entity types', () => {
    expect(teamsConnectorManifest.entityTypes).toContain('Message');
    expect(teamsConnectorManifest.entityTypes).toContain('Person');
  });

  it('uses oauth2 auth', () => {
    expect(teamsConnectorManifest.authType).toBe('oauth2');
  });

  it('has shorter freshness threshold than Jira (real-time messaging)', () => {
    expect(teamsConnectorManifest.freshnessThresholdMs).toBeLessThan(300000);
  });
});
