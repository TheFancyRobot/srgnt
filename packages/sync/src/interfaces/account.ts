/**
 * Account provider interface - defines the contract for account and subscription management.
 */

/**
 * Subscription tiers available.
 */
export enum SubscriptionTier {
  Free = 'free',
  Premium = 'premium',
}

/**
 * Account information for the current user.
 */
export interface AccountInfo {
  userId: string;
  email: string;
  displayName: string;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
  lastSyncAt?: string;
}

/**
 * Device information for sync participants.
 */
export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  isCurrent: boolean;
  lastSeenAt: string;
  encryptionPublicKey: string;
}

/**
 * IAccountProvider - Account and device management interface.
 * Responsible for authentication, subscription state, and device registration.
 */
export interface IAccountProvider {
  /**
   * Authenticate user and obtain session credentials.
   */
  authenticate(email: string, password: string): Promise<AuthenticationResult>;

  /**
   * Get current account information.
   */
  getAccount(): Promise<AccountInfo | null>;

  /**
   * Get current subscription tier.
   */
  getSubscription(): Promise<SubscriptionTier>;

  /**
   * Get the current device ID.
   */
  getDeviceId(): Promise<string>;

  /**
   * Get all registered devices for this account.
   */
  getDevices(): Promise<DeviceInfo[]>;

  /**
   * Register a new device for sync.
   */
  registerDevice(device: Omit<DeviceInfo, 'deviceId'>): Promise<DeviceInfo>;

  /**
   * Revoke a device's sync access.
   * The device will no longer receive updates but existing local data is preserved.
   */
  revokeDevice(deviceId: string): Promise<void>;

  /**
   * Get encryption public key for a device (used for key exchange).
   */
  getDevicePublicKey(deviceId: string): Promise<string>;

  /**
   * Sign out and clear local session.
   */
  signOut(): Promise<void>;
}

/**
 * Result of an authentication attempt.
 */
export interface AuthenticationResult {
  success: boolean;
  account?: AccountInfo;
  error?: string;
}

/**
 * Account recovery result with pass/fail verdict.
 */
export interface RecoveryResult {
  success: boolean;
  recoveredAt?: string;
  error?: string;
  // For failed recovery, indicates what information was lost
  dataLoss?: {
    pendingConflicts: number;
    unsycedChanges: number;
  };
}
