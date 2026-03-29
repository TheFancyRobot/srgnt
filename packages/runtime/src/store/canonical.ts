import { Schema } from "@effect/schema";
import { parseSync } from '@srgnt/contracts';
import type { EntityEnvelope } from '@srgnt/contracts';

export interface EntityStore {
  entities: Map<string, EntityEnvelope>;
  add(entity: EntityEnvelope): void;
  get(id: string): EntityEnvelope | undefined;
  remove(id: string): boolean;
  list(): EntityEnvelope[];
  findByType(canonicalType: string): EntityEnvelope[];
  clear(): void;
}

export function createEntityStore(): EntityStore {
  const entities = new Map<string, EntityEnvelope>();

  return {
    entities,

    add(entity: EntityEnvelope): void {
      entities.set(entity.id, entity);
    },

    get(id: string): EntityEnvelope | undefined {
      return entities.get(id);
    },

    remove(id: string): boolean {
      return entities.delete(id);
    },

    list(): EntityEnvelope[] {
      return Array.from(entities.values());
    },

    findByType(canonicalType: string): EntityEnvelope[] {
      return Array.from(entities.values()).filter(
        (e) => e.canonicalType === canonicalType
      );
    },

    clear(): void {
      entities.clear();
    },
  };
}

export class CanonicalStore {
  private store: EntityStore;
  private validator: Schema.Schema<any, unknown> | undefined;

  constructor(validator?: Schema.Schema<any, unknown>) {
    this.store = createEntityStore();
    this.validator = validator;
  }

  addEntity(entity: unknown): void {
    if (this.validator) {
      const parsed = parseSync(this.validator, entity);
      this.store.add(parsed as EntityEnvelope);
    } else {
      this.store.add(entity as EntityEnvelope);
    }
  }

  getEntity(id: string): EntityEnvelope | undefined {
    return this.store.get(id);
  }

  listEntities(): EntityEnvelope[] {
    return this.store.list();
  }

  findEntitiesByType(canonicalType: string): EntityEnvelope[] {
    return this.store.findByType(canonicalType);
  }

  removeEntity(id: string): boolean {
    return this.store.remove(id);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.entities.size;
  }
}
