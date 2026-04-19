// Export from @srgnt/contracts
export { SEntityEnvelope, SCanonicalEntity } from '@srgnt/contracts';

// Re-export schemas (types prefixed with S for Schema)
export * from './schemas/classification';
export * from './schemas/frontmatter';
export * from './schemas/sync-payload';
export * from './schemas/conflict';

// Note: Interfaces are exported via their own files for type safety
// Import interfaces directly from './interfaces/*' when needed
// to avoid naming conflicts with schema types

export const syncVersion = '0.0.0';
