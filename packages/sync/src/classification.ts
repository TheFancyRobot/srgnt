import { Schema } from '@effect/schema';

export const SDataClassification = Schema.Literal('public', 'internal', 'confidential', 'restricted');
export type DataClassification = Schema.Schema.Type<typeof SDataClassification>;

export const SSyncSafeEntity = Schema.Struct({
  id: Schema.String,
  classification: SDataClassification,
  canSync: Schema.Boolean,
  encryption: Schema.optionalWith(Schema.Literal('none', 'at-rest', 'in-transit', 'both'), {
    default: () => 'none' as const,
  }),
  conflictStrategy: Schema.optionalWith(Schema.Literal('last-write-wins', 'manual-merge', 'server-wins'), {
    default: () => 'last-write-wins' as const,
  }),
});

export type SyncSafeEntity = Schema.Schema.Type<typeof SSyncSafeEntity>;

export const dataClassificationMap: Record<string, SyncSafeEntity> = {
  'Task': {
    id: 'Task',
    classification: 'internal',
    canSync: true,
    encryption: 'at-rest',
    conflictStrategy: 'last-write-wins',
  },
  'Event': {
    id: 'Event',
    classification: 'internal',
    canSync: true,
    encryption: 'at-rest',
    conflictStrategy: 'last-write-wins',
  },
  'Message': {
    id: 'Message',
    classification: 'confidential',
    canSync: true,
    encryption: 'both',
    conflictStrategy: 'server-wins',
  },
  'Person': {
    id: 'Person',
    classification: 'confidential',
    canSync: true,
    encryption: 'both',
    conflictStrategy: 'manual-merge',
  },
  'Artifact': {
    id: 'Artifact',
    classification: 'internal',
    canSync: true,
    encryption: 'at-rest',
    conflictStrategy: 'last-write-wins',
  },
};

export function getClassification(entityType: string): SyncSafeEntity {
  return dataClassificationMap[entityType] || {
    id: entityType,
    classification: 'internal',
    canSync: false,
    encryption: 'none',
    conflictStrategy: 'server-wins',
  };
}

export function isSyncSafe(entityType: string): boolean {
  return getClassification(entityType).canSync;
}

export function requiresEncryption(entityType: string): boolean {
  const classification = getClassification(entityType);
  return classification.encryption !== 'none';
}
