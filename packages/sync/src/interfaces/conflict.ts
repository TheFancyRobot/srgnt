/**
 * Conflict resolution interface - defines the contract for handling sync conflicts.
 */

/**
 * Types of conflicts that can occur during sync.
 */
export enum ConflictType {
  // YAML frontmatter field conflict (e.g., different tags)
  FrontmatterField = 'frontmatterField',
  // Markdown body content conflict
  MarkdownBody = 'markdownBody',
  // File was deleted on one device, modified on another
  FileDeleted = 'fileDeleted',
  // File was created independently on multiple devices
  FileCreatedBoth = 'fileCreatedBoth',
}

/**
 * Merge strategies for conflict resolution.
 */
export enum MergeStrategy {
  // Last write wins based on timestamp
  LastWriteWins = 'lastWriteWins',
  // Field-level merge for non-overlapping changes
  FieldLevelMerge = 'fieldLevelMerge',
  // Manual resolution required
  ManualResolution = 'manualResolution',
}

/**
 * Conflict record tracking a single sync conflict.
 */
export interface ConflictRecord {
  // Unique identifier for the conflicted entity
  entityId: string;
  // Type of conflict
  conflictType: ConflictType;
  // Local version content or reference
  localVersion: VersionInfo;
  // Remote version content or reference
  remoteVersion: VersionInfo;
  // How the conflict was or should be resolved
  resolution?: 'pending' | 'local' | 'remote' | 'merged';
  // When the conflict was detected
  detectedAt: string;
  // When the conflict was resolved (if applicable)
  resolvedAt?: string;
  // Device that resolved the conflict (if applicable)
  resolvedBy?: string;
}

/**
 * Version information for conflict tracking.
 */
export interface VersionInfo {
  // Version identifier or hash
  id: string;
  // Last modified timestamp
  lastModified: string;
  // Device that created this version
  deviceId: string;
  // Content hash for verification
  contentHash: string;
  // For markdown files, the frontmatter and body separately
  frontmatter?: Record<string, unknown>;
  body?: string;
}

/**
 * Result of a merge operation.
 */
export interface MergeResult {
  success: boolean;
  mergedContent?: string;
  mergedFrontmatter?: Record<string, unknown>;
  error?: string;
  // Whether manual intervention is still required
  requiresManualResolution: boolean;
}

/**
 * IConflictResolver - Interface for detecting and resolving sync conflicts.
 * Dataview indexes are derived and never conflict-resolved; they are only rebuilt.
 */
export interface IConflictResolver {
  /**
   * Detect conflicts between local and remote versions.
   */
  detect(local: VersionInfo, remote: VersionInfo): ConflictType | null;

  /**
   * Attempt automatic resolution using the appropriate strategy.
   * Returns a merge result; may indicate manual resolution is required.
   */
  resolve(
    conflict: ConflictRecord,
    strategy: MergeStrategy
  ): Promise<MergeResult>;

  /**
   * Mark a conflict as resolved with the chosen resolution.
   */
  markResolved(
    entityId: string,
    resolution: 'local' | 'remote' | 'merged',
    resolvedContent?: string
  ): Promise<void>;

  /**
   * Get all pending conflicts.
   */
  getPendingConflicts(): ConflictRecord[];

  /**
   * Get all resolved conflicts.
   */
  getResolvedConflicts(): ConflictRecord[];
}
