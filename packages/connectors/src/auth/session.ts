import type { ConnectorAuthType } from '@srgnt/contracts';

export interface AuthCredentials {
  type: ConnectorAuthType;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface AuthSession {
  connectorId: string;
  credentials: AuthCredentials;
  authenticatedAt: Date;
  expiresAt?: Date;
  isValid(): boolean;
  refresh?(): Promise<AuthSession>;
}

export class SimpleAuthSession implements AuthSession {
  constructor(
    public connectorId: string,
    public credentials: AuthCredentials,
    public authenticatedAt: Date,
    public expiresAt?: Date
  ) {}

  isValid(): boolean {
    if (!this.expiresAt) return true;
    return new Date() < this.expiresAt;
  }

  async refresh(): Promise<AuthSession> {
    if (!this.credentials.refreshToken) {
      throw new Error('No refresh token available');
    }
    throw new Error('Not implemented');
  }
}

export interface AuthHandler {
  authenticate(credentials: AuthCredentials): Promise<AuthSession>;
  deauthenticate(session: AuthSession): Promise<void>;
  refresh(session: AuthSession): Promise<AuthSession>;
}

export class OAuth2Handler implements AuthHandler {
  async authenticate(credentials: AuthCredentials): Promise<AuthSession> {
    if (credentials.type !== 'oauth2') {
      throw new Error('Invalid auth type for OAuth2Handler');
    }
    return new SimpleAuthSession(
      'connector-id',
      credentials,
      new Date(),
      credentials.expiresAt
    );
  }

  async deauthenticate(session: AuthSession): Promise<void> {
    if (session.credentials.refreshToken) {
    }
  }

  async refresh(session: AuthSession): Promise<AuthSession> {
    return session.refresh!();
  }
}

export class ApiKeyHandler implements AuthHandler {
  async authenticate(credentials: AuthCredentials): Promise<AuthSession> {
    if (credentials.type !== 'api_key') {
      throw new Error('Invalid auth type for ApiKeyHandler');
    }
    return new SimpleAuthSession('connector-id', credentials, new Date());
  }

  async deauthenticate(_session: AuthSession): Promise<void> {
  }

  async refresh(session: AuthSession): Promise<AuthSession> {
    return session.refresh!();
  }
}

export class NoAuthHandler implements AuthHandler {
  async authenticate(credentials: AuthCredentials): Promise<AuthSession> {
    if (credentials.type !== 'none') {
      throw new Error('Invalid auth type for NoAuthHandler');
    }
    return new SimpleAuthSession('connector-id', credentials, new Date());
  }

  async deauthenticate(_session: AuthSession): Promise<void> {
  }

  async refresh(session: AuthSession): Promise<AuthSession> {
    return session.refresh!();
  }
}

export function createAuthHandler(type: ConnectorAuthType): AuthHandler {
  switch (type) {
    case 'oauth2':
      return new OAuth2Handler();
    case 'api_key':
      return new ApiKeyHandler();
    case 'basic':
    case 'bearer':
      return new ApiKeyHandler();
    case 'none':
      return new NoAuthHandler();
    default:
      throw new Error(`Unknown auth type: ${type}`);
  }
}
