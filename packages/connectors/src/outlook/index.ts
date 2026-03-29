import type { Event, Person } from '@srgnt/contracts';
import type { ConnectorManifest } from '@srgnt/contracts';

export interface OutlookEvent {
  id: string;
  subject: string;
  body: string;
  start: string;
  end: string;
  location: string;
  organizer: string;
  attendees: string[];
  isRecurring: boolean;
  created: string;
  updated: string;
}

export interface OutlookContact {
  id: string;
  displayName: string;
  emailAddress: string;
}

export interface OutlookFixture {
  events: OutlookEvent[];
  contacts: OutlookContact[];
}

export const outlookFixtures: OutlookFixture = {
  events: [
    {
      id: 'evt-001',
      subject: 'Sprint Planning',
      body: 'Plan work for next sprint iteration',
      start: '2024-03-25T09:00:00Z',
      end: '2024-03-25T10:00:00Z',
      location: 'Conference Room A',
      organizer: 'alice@example.com',
      attendees: ['bob@example.com', 'carol@example.com'],
      isRecurring: true,
      created: '2024-03-01T08:00:00Z',
      updated: '2024-03-20T08:00:00Z',
    },
    {
      id: 'evt-002',
      subject: '1:1 with Manager',
      body: 'Weekly sync',
      start: '2024-03-26T14:00:00Z',
      end: '2024-03-26T14:30:00Z',
      location: '',
      organizer: 'dave@example.com',
      attendees: ['alice@example.com'],
      isRecurring: true,
      created: '2024-02-15T10:00:00Z',
      updated: '2024-03-22T10:00:00Z',
    },
    {
      id: 'evt-003',
      subject: 'Product Demo',
      body: 'Demo new features to stakeholders',
      start: '2024-03-27T15:00:00Z',
      end: '2024-03-27T16:00:00Z',
      location: 'Main Hall',
      organizer: 'alice@example.com',
      attendees: ['bob@example.com', 'carol@example.com', 'dave@example.com'],
      isRecurring: false,
      created: '2024-03-18T12:00:00Z',
      updated: '2024-03-24T12:00:00Z',
    },
  ],
  contacts: [
    { id: 'contact-001', displayName: 'Alice Engineer', emailAddress: 'alice@example.com' },
    { id: 'contact-002', displayName: 'Bob Designer', emailAddress: 'bob@example.com' },
    { id: 'contact-003', displayName: 'Carol PM', emailAddress: 'carol@example.com' },
    { id: 'contact-004', displayName: 'Dave Manager', emailAddress: 'dave@example.com' },
  ],
};

function mapOutlookEventToEvent(evt: OutlookEvent): Event {
  return {
    envelope: {
      id: `outlook-${evt.id}`,
      canonicalType: 'Event',
      provider: 'outlook',
      providerId: evt.id,
      createdAt: evt.created,
      updatedAt: evt.updated,
    },
    title: evt.subject,
    description: evt.body,
    startTime: evt.start,
    endTime: evt.end,
    location: evt.location || undefined,
    organizer: evt.organizer,
    attendees: evt.attendees,
    recurrence: evt.isRecurring ? 'weekly' : undefined,
    providerMetadata: {
      isRecurring: evt.isRecurring,
    },
  };
}

function mapOutlookContactToPerson(contact: OutlookContact): Person {
  return {
    envelope: {
      id: `outlook-person-${contact.id}`,
      canonicalType: 'Person',
      provider: 'outlook',
      providerId: contact.id,
    },
    name: contact.displayName,
    email: contact.emailAddress,
  };
}

export function loadOutlookFixtures(): { events: Event[]; persons: Person[] } {
  return {
    events: outlookFixtures.events.map(mapOutlookEventToEvent),
    persons: outlookFixtures.contacts.map(mapOutlookContactToPerson),
  };
}

export const outlookConnectorManifest: ConnectorManifest = {
  id: 'outlook',
  name: 'Outlook Calendar',
  version: '0.1.0',
  description: 'Microsoft Outlook Calendar connector for events and contacts',
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
      supportedOperations: ['getEvent', 'listEvents', 'getContacts'],
      entityMappings: [
        { canonicalType: 'Event', providerType: 'CalendarEvent' },
        { canonicalType: 'Person', providerType: 'Contact' },
      ],
    },
    {
      capability: 'write',
      supportedOperations: ['createEvent', 'updateEvent', 'respondToEvent'],
      entityMappings: [
        { canonicalType: 'Event', providerType: 'CalendarEvent' },
      ],
    },
  ],
  entityTypes: ['Event', 'Person'],
  freshnessThresholdMs: 300000,
  metadata: {},
};

export { mapOutlookEventToEvent, mapOutlookContactToPerson };
