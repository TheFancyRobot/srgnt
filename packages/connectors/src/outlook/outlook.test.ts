import { describe, it, expect } from 'vitest';
import {
  outlookFixtures,
  loadOutlookFixtures,
  mapOutlookEventToEvent,
  mapOutlookContactToPerson,
  outlookConnectorManifest,
} from './index.js';

describe('outlookFixtures', () => {
  it('has events', () => {
    expect(outlookFixtures.events.length).toBeGreaterThan(0);
  });

  it('has contacts', () => {
    expect(outlookFixtures.contacts.length).toBeGreaterThan(0);
  });
});

describe('loadOutlookFixtures', () => {
  it('loads events and persons', () => {
    const { events, persons } = loadOutlookFixtures();
    expect(events).toHaveLength(3);
    expect(persons).toHaveLength(4);
  });

  it('maps events correctly', () => {
    const { events } = loadOutlookFixtures();
    const sprint = events.find((e) => e.envelope.providerId === 'evt-001');
    expect(sprint?.title).toBe('Sprint Planning');
    expect(sprint?.startTime).toBe('2024-03-25T09:00:00Z');
    expect(sprint?.location).toBe('Conference Room A');
    expect(sprint?.organizer).toBe('alice@example.com');
  });
});

describe('mapOutlookEventToEvent', () => {
  it('maps recurring events', () => {
    const recurring = outlookFixtures.events[0];
    const event = mapOutlookEventToEvent(recurring);
    expect(event.recurrence).toBe('weekly');
    expect(event.providerMetadata?.isRecurring).toBe(true);
  });

  it('maps non-recurring events', () => {
    const nonRecurring = outlookFixtures.events[2];
    const event = mapOutlookEventToEvent(nonRecurring);
    expect(event.recurrence).toBeUndefined();
    expect(event.providerMetadata?.isRecurring).toBe(false);
  });

  it('maps attendees', () => {
    const event = mapOutlookEventToEvent(outlookFixtures.events[0]);
    expect(event.attendees).toContain('bob@example.com');
    expect(event.attendees).toContain('carol@example.com');
  });

  it('sets envelope provider to outlook', () => {
    const event = mapOutlookEventToEvent(outlookFixtures.events[0]);
    expect(event.envelope.provider).toBe('outlook');
    expect(event.envelope.canonicalType).toBe('Event');
  });
});

describe('mapOutlookContactToPerson', () => {
  it('maps contact correctly', () => {
    const person = mapOutlookContactToPerson(outlookFixtures.contacts[0]);
    expect(person.name).toBe('Alice Engineer');
    expect(person.email).toBe('alice@example.com');
    expect(person.envelope.provider).toBe('outlook');
  });
});

describe('outlookConnectorManifest', () => {
  it('has correct id', () => {
    expect(outlookConnectorManifest.id).toBe('outlook');
  });

  it('has read and write capabilities', () => {
    expect(outlookConnectorManifest.capabilities.length).toBe(2);
    expect(outlookConnectorManifest.capabilities.map((c) => c.capability)).toContain('read');
    expect(outlookConnectorManifest.capabilities.map((c) => c.capability)).toContain('write');
  });

  it('has correct entity types', () => {
    expect(outlookConnectorManifest.entityTypes).toContain('Event');
    expect(outlookConnectorManifest.entityTypes).toContain('Person');
  });

  it('uses oauth2 auth', () => {
    expect(outlookConnectorManifest.authType).toBe('oauth2');
  });
});
