import { describe, it, expect } from 'vitest';
import { createAuthHandler, SimpleAuthSession, OAuth2Handler, ApiKeyHandler, NoAuthHandler } from './session.js';

describe('SimpleAuthSession', () => {
  it('creates a session', () => {
    const session = new SimpleAuthSession(
      'connector-1',
      { type: 'oauth2' as const },
      new Date()
    );
    expect(session.connectorId).toBe('connector-1');
    expect(session.credentials.type).toBe('oauth2');
  });

  it('is valid without expiry', () => {
    const session = new SimpleAuthSession('connector-1', { type: 'none' }, new Date());
    expect(session.isValid()).toBe(true);
  });

  it('is invalid when expired', () => {
    const past = new Date(Date.now() - 1000);
    const session = new SimpleAuthSession('connector-1', { type: 'none' }, past, past);
    expect(session.isValid()).toBe(false);
  });

  it('is valid when not expired', () => {
    const future = new Date(Date.now() + 10000);
    const session = new SimpleAuthSession('connector-1', { type: 'none' }, new Date(), future);
    expect(session.isValid()).toBe(true);
  });
});

describe('createAuthHandler', () => {
  it('creates OAuth2 handler', () => {
    const handler = createAuthHandler('oauth2');
    expect(handler).toBeInstanceOf(OAuth2Handler);
  });

  it('creates API key handler', () => {
    const handler = createAuthHandler('api_key');
    expect(handler).toBeInstanceOf(ApiKeyHandler);
  });

  it('creates no-auth handler', () => {
    const handler = createAuthHandler('none');
    expect(handler).toBeInstanceOf(NoAuthHandler);
  });

  it('creates bearer handler', () => {
    const handler = createAuthHandler('bearer');
    expect(handler).toBeInstanceOf(ApiKeyHandler);
  });

  it('throws for unknown type', () => {
    expect(() => createAuthHandler('unknown' as any)).toThrow('Unknown auth type');
  });
});
