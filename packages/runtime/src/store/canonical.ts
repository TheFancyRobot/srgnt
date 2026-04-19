import { Schema } from "@effect/schema";
import { parseSync } from '@srgnt/contracts';
import type { EntityEnvelope } from '@srgnt/contracts';

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface EntityStoreOptions {
  maxCapacity?: number;
}

export interface EntityStore {
  entities: Map<string, EntityEnvelope>;
  add(entity: EntityEnvelope): void;
  get(id: string): EntityEnvelope | undefined;
  remove(id: string): boolean;
  list(options?: PaginationOptions): EntityEnvelope[];
  findByType(canonicalType: string, options?: PaginationOptions): EntityEnvelope[];
  totalByType(canonicalType: string): number;
  clear(): void;
}

export function createEntityStore(options?: EntityStoreOptions): EntityStore {
  const entities = new Map<string, EntityEnvelope>();
  const typeIndex = new Map<string, Set<string>>();
  const maxCapacity = options?.maxCapacity;

  function touchEntity(id: string): void {
    if (!maxCapacity) return;
    const entity = entities.get(id);
    if (entity) {
      // Delete and re-insert to move to end of Map iteration order (most recent)
      entities.delete(id);
      entities.set(id, entity);
    }
  }

  function evictIfNeeded(): void {
    if (!maxCapacity) return;
    while (entities.size > maxCapacity) {
      // Map iterates in insertion order; first key is the least recently used
      const oldestKey = entities.keys().next().value;
      if (oldestKey === undefined) break;
      const entity = entities.get(oldestKey);
      if (entity) {
        const typeSet = typeIndex.get(entity.canonicalType);
        if (typeSet) {
          typeSet.delete(oldestKey);
          if (typeSet.size === 0) typeIndex.delete(entity.canonicalType);
        }
      }
      entities.delete(oldestKey);
    }
  }

  function paginate(items: EntityEnvelope[], options?: PaginationOptions): EntityEnvelope[] {
    if (!options) return items;
    const offset = options.offset ?? 0;
    const limit = options.limit;
    if (limit !== undefined) {
      return items.slice(offset, offset + limit);
    }
    return offset > 0 ? items.slice(offset) : items;
  }

  function addToTypeIndex(entity: EntityEnvelope): void {
    let typeSet = typeIndex.get(entity.canonicalType);
    if (!typeSet) {
      typeSet = new Set();
      typeIndex.set(entity.canonicalType, typeSet);
    }
    typeSet.add(entity.id);
  }

function removeFromTypeIndex(id: string, canonicalType: string): void {
  const typeSet = typeIndex.get(canonicalType);
  if (typeSet) {
    typeSet.delete(id);
    if (typeSet.size === 0) typeIndex.delete(canonicalType);
  }
}

  function collectIndexedEntities(ids: Iterable<string>, options?: PaginationOptions): EntityEnvelope[] {
    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    const end = limit === undefined ? Number.POSITIVE_INFINITY : offset + limit;
    const results: EntityEnvelope[] = [];
    let index = 0;

    for (const id of ids) {
      if (index >= end) {
        break;
      }

      if (index >= offset) {
        const entity = entities.get(id);
        if (entity) {
          results.push(entity);
        }
      }

      index += 1;
    }

    return results;
  }

  return {
    entities,

    add(entity: EntityEnvelope): void {
      const existing = entities.get(entity.id);
      if (existing) {
        removeFromTypeIndex(entity.id, existing.canonicalType);
      }
      entities.set(entity.id, entity);
      addToTypeIndex(entity);
      evictIfNeeded();
    },

    get(id: string): EntityEnvelope | undefined {
      const entity = entities.get(id);
      if (entity) touchEntity(id);
      return entity;
    },

    remove(id: string): boolean {
      const entity = entities.get(id);
      if (entity) {
        removeFromTypeIndex(id, entity.canonicalType);
      }
      return entities.delete(id);
    },

    list(options?: PaginationOptions): EntityEnvelope[] {
      return paginate(Array.from(entities.values()), options);
    },

    findByType(canonicalType: string, options?: PaginationOptions): EntityEnvelope[] {
      const typeSet = typeIndex.get(canonicalType);
      if (!typeSet || typeSet.size === 0) return [];
      return collectIndexedEntities(typeSet, options);
    },

    totalByType(canonicalType: string): number {
      return typeIndex.get(canonicalType)?.size ?? 0;
    },

    clear(): void {
      entities.clear();
      typeIndex.clear();
    },
  };
}

export class CanonicalStore {
  private store: EntityStore;
  private validator: Schema.Schema<any, any> | undefined;

  constructor(validator?: Schema.Schema<any, any>, options?: EntityStoreOptions) {
    this.store = createEntityStore(options);
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

  listEntities(options?: PaginationOptions): EntityEnvelope[] {
    return this.store.list(options);
  }

  findEntitiesByType(canonicalType: string, options?: PaginationOptions): EntityEnvelope[] {
    return this.store.findByType(canonicalType, options);
  }

  totalByType(canonicalType: string): number {
    return this.store.totalByType(canonicalType);
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
