import type { Message, Person } from '@srgnt/contracts';
import type { ConnectorManifest } from '@srgnt/contracts';

export interface TeamsMessage {
  id: string;
  subject: string;
  body: string;
  from: string;
  recipients: string[];
  sentAt: string;
  threadId: string;
  channelName: string;
  isRead: boolean;
}

export interface TeamsMember {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

export interface TeamsFixture {
  messages: TeamsMessage[];
  members: TeamsMember[];
}

export const teamsFixtures: TeamsFixture = {
  messages: [
    {
      id: 'msg-001',
      subject: 'Deploy v2.1 today',
      body: 'Team, we are deploying v2.1 to production at 3pm EST. Please hold off on merges to main.',
      from: 'alice@example.com',
      recipients: ['engineering-team@example.com'],
      sentAt: '2024-03-25T10:00:00Z',
      threadId: 'thread-deploy-v21',
      channelName: 'Engineering',
      isRead: true,
    },
    {
      id: 'msg-002',
      subject: 'Design review feedback',
      body: 'Attached are comments on the new dashboard design. Please address before next sprint.',
      from: 'bob@example.com',
      recipients: ['alice@example.com', 'carol@example.com'],
      sentAt: '2024-03-24T15:30:00Z',
      threadId: 'thread-design-review',
      channelName: 'Design',
      isRead: false,
    },
    {
      id: 'msg-003',
      subject: '',
      body: 'Sounds good, I will review the PR this afternoon.',
      from: 'carol@example.com',
      recipients: ['alice@example.com'],
      sentAt: '2024-03-25T11:00:00Z',
      threadId: 'thread-deploy-v21',
      channelName: 'Engineering',
      isRead: true,
    },
  ],
  members: [
    { id: 'member-001', displayName: 'Alice Engineer', email: 'alice@example.com', role: 'owner' },
    { id: 'member-002', displayName: 'Bob Designer', email: 'bob@example.com', role: 'member' },
    { id: 'member-003', displayName: 'Carol PM', email: 'carol@example.com', role: 'member' },
  ],
};

function mapTeamsMessageToMessage(msg: TeamsMessage): Message {
  return {
    envelope: {
      id: `teams-${msg.id}`,
      canonicalType: 'Message',
      provider: 'teams',
      providerId: msg.id,
    },
    subject: msg.subject || undefined,
    body: msg.body,
    sender: msg.from,
    recipients: msg.recipients,
    sentAt: msg.sentAt,
    threadId: msg.threadId,
    isRead: msg.isRead,
    providerMetadata: {
      channelName: msg.channelName,
    },
  };
}

function mapTeamsMemberToPerson(member: TeamsMember): Person {
  return {
    envelope: {
      id: `teams-person-${member.id}`,
      canonicalType: 'Person',
      provider: 'teams',
      providerId: member.id,
    },
    name: member.displayName,
    email: member.email,
  };
}

export function loadTeamsFixtures(): { messages: Message[]; persons: Person[] } {
  return {
    messages: teamsFixtures.messages.map(mapTeamsMessageToMessage),
    persons: teamsFixtures.members.map(mapTeamsMemberToPerson),
  };
}

export const teamsConnectorManifest: ConnectorManifest = {
  id: 'teams',
  name: 'Microsoft Teams',
  version: '0.1.0',
  description: 'Microsoft Teams connector for messages and team members',
  provider: 'microsoft',
  authType: 'oauth2',
  config: {
    authType: 'oauth2',
    timeout: 30000,
    retryAttempts: 3,
  },
  capabilities: [
    {
      capability: 'read',
      supportedOperations: ['getMessage', 'listMessages', 'getMembers'],
      entityMappings: [
        { canonicalType: 'Message', providerType: 'ChatMessage' },
        { canonicalType: 'Person', providerType: 'TeamMember' },
      ],
    },
    {
      capability: 'write',
      supportedOperations: ['sendMessage', 'replyToMessage'],
      entityMappings: [
        { canonicalType: 'Message', providerType: 'ChatMessage' },
      ],
    },
    {
      capability: 'subscribe',
      supportedOperations: ['onNewMessage'],
      entityMappings: [
        { canonicalType: 'Message', providerType: 'ChatMessage' },
      ],
    },
  ],
  entityTypes: ['Message', 'Person'],
  freshnessThresholdMs: 60000,
  metadata: {},
};

export { mapTeamsMessageToMessage, mapTeamsMemberToPerson };
