import {
  STask,
  SEvent,
  SMessage,
  SPerson,
  SArtifact,
  parseSync,
  type Task,
  type Event,
  type Message,
  type Person,
  type Artifact,
} from '@srgnt/contracts';
import type { Schema } from '@effect/schema';

export type AnyEntity = Task | Event | Message | Person | Artifact;

export interface EntityLoadResult<T = AnyEntity> {
  success: boolean;
  entity?: T;
  error?: string;
}

export class EntityLoader {
  private parsers: Map<string, Schema.Schema<AnyEntity, unknown>>;

  constructor() {
    this.parsers = new Map<string, Schema.Schema<AnyEntity, unknown>>([
      ['Task', STask as unknown as Schema.Schema<AnyEntity, unknown>],
      ['Event', SEvent as unknown as Schema.Schema<AnyEntity, unknown>],
      ['Message', SMessage as unknown as Schema.Schema<AnyEntity, unknown>],
      ['Person', SPerson as unknown as Schema.Schema<AnyEntity, unknown>],
      ['Artifact', SArtifact as unknown as Schema.Schema<AnyEntity, unknown>],
    ]);
  }

  loadEntity(entity: unknown): EntityLoadResult<AnyEntity> {
    try {
      const validated = this.validateEntity(entity);
      return { success: true, entity: validated };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private validateEntity(entity: unknown): AnyEntity {
    if (typeof entity !== 'object' || entity === null) {
      throw new Error('Entity must be an object');
    }

    const obj = entity as Record<string, unknown>;
    const envelope = obj.envelope as Record<string, unknown> | undefined;

    if (!envelope || typeof envelope !== 'object') {
      throw new Error('Entity must have an envelope');
    }

    const canonicalType = envelope.canonicalType as string;
    const parser = this.parsers.get(canonicalType);

    if (!parser) {
      throw new Error(`Unknown entity type: ${canonicalType}`);
    }

    return parseSync(parser, entity) as AnyEntity;
  }

  registerParser(type: string, parser: Schema.Schema<AnyEntity, unknown>): void {
    this.parsers.set(type, parser);
  }
}

export function createEntityLoader(): EntityLoader {
  return new EntityLoader();
}
