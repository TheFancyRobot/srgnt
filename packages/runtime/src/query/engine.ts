import type { EntityEnvelope } from '@srgnt/contracts';

export interface QueryResult<T> {
  data: T[];
  total: number;
  durationMs: number;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: SortSpec[];
}

export interface SortSpec {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataviewQuery {
  from: string;
  where?: string;
  sort?: SortSpec[];
  limit?: number;
  offset?: number;
  select?: string[];
}

export interface QueryEngine {
  query<T>(query: string | DataviewQuery): Promise<QueryResult<T>>;
  index(force?: boolean): Promise<void>;
  getIndexedFields(): string[];
  addToIndex(entity: EntityEnvelope): void;
  removeFromIndex(id: string): void;
}

export class SimpleQueryEngine implements QueryEngine {
  private indexedFields: Set<string> = new Set();
  private entityIndex: Map<string, EntityEnvelope> = new Map();
  private typeIndex: Map<string, Set<string>> = new Map();

  async query<T>(query: string | DataviewQuery): Promise<QueryResult<T>> {
    const start = Date.now();

    if (typeof query === 'string') {
      return this.executeDql<T>(query, start);
    }

    return this.executeStructuredQuery<T>(query, start);
  }

  async index(_force?: boolean): Promise<void> {
    this.indexedFields = new Set([
      'id',
      'canonicalType',
      'provider',
      'providerId',
      'createdAt',
      'updatedAt',
      'name',
      'status',
      'priority',
      'sourceSkill',
      'tags',
    ]);
  }

  getIndexedFields(): string[] {
    return Array.from(this.indexedFields);
  }

  addToIndex(entity: EntityEnvelope): void {
    const existing = this.entityIndex.get(entity.id);
    if (existing && existing.canonicalType !== entity.canonicalType) {
      const previousTypeSet = this.typeIndex.get(existing.canonicalType);
      if (previousTypeSet) {
        previousTypeSet.delete(entity.id);
        if (previousTypeSet.size === 0) this.typeIndex.delete(existing.canonicalType);
      }
    }

    this.entityIndex.set(entity.id, entity);
    let typeSet = this.typeIndex.get(entity.canonicalType);
    if (!typeSet) {
      typeSet = new Set();
      this.typeIndex.set(entity.canonicalType, typeSet);
    }
    typeSet.add(entity.id);
  }

  removeFromIndex(id: string): void {
    const entity = this.entityIndex.get(id);
    if (entity) {
      const typeSet = this.typeIndex.get(entity.canonicalType);
      if (typeSet) {
        typeSet.delete(id);
        if (typeSet.size === 0) this.typeIndex.delete(entity.canonicalType);
      }
    }
    this.entityIndex.delete(id);
  }

  private getEntitiesByType(entityType: string): EntityEnvelope[] {
    return this.collectEntitiesByType(entityType);
  }

  private collectEntitiesByType(entityType: string, offset = 0, limit?: number): EntityEnvelope[] {
    const typeSet = this.typeIndex.get(entityType);
    if (!typeSet) return [];

    const end = limit === undefined ? Number.POSITIVE_INFINITY : offset + limit;
    const results: EntityEnvelope[] = [];
    let index = 0;

    for (const id of typeSet) {
      if (index >= end) {
        break;
      }

      if (index >= offset) {
        const entity = this.entityIndex.get(id);
        if (entity) results.push(entity);
      }

      index += 1;
    }

    return results;
  }

  private executeDql<T>(query: string, start: number): Promise<QueryResult<T>> {
    const fromMatch = query.match(/FROM\s+["']?(\w+)["']?/i);
    const entityType = fromMatch ? fromMatch[1] : null;

    let results: EntityEnvelope[];
    if (entityType) {
      results = this.getEntitiesByType(entityType);
    } else {
      results = Array.from(this.entityIndex.values());
    }

    const durationMs = Date.now() - start;
    return Promise.resolve({
      data: results as unknown as T[],
      total: results.length,
      durationMs,
    });
  }

  private executeStructuredQuery<T>(query: DataviewQuery, start: number): Promise<QueryResult<T>> {
    const offset = query.offset ?? 0;
    const total = query.from
      ? this.typeIndex.get(query.from)?.size ?? 0
      : this.entityIndex.size;

    let results: EntityEnvelope[];
    if (query.from && !query.sort) {
      results = this.collectEntitiesByType(query.from, offset, query.limit);
    } else if (query.from) {
      results = this.getEntitiesByType(query.from);
    } else {
      results = Array.from(this.entityIndex.values());
    }

    if (query.sort) {
      results = this.applySort(results, query.sort);
      if (query.limit !== undefined) {
        results = results.slice(offset, offset + query.limit);
      } else if (offset > 0) {
        results = results.slice(offset);
      }
    } else if (!query.from) {
      if (query.limit !== undefined) {
        results = results.slice(offset, offset + query.limit);
      } else if (offset > 0) {
        results = results.slice(offset);
      }
    }

    const durationMs = Date.now() - start;
    return Promise.resolve({
      data: results as unknown as T[],
      total,
      durationMs,
    });
  }

  private applySort<T>(results: T[], sort: SortSpec[]): T[] {
    return [...results].sort((a, b) => {
      for (const spec of sort) {
        const aVal = (a as Record<string, unknown>)[spec.field];
        const bVal = (b as Record<string, unknown>)[spec.field];
        if (aVal === bVal) continue;
        if (aVal === undefined || bVal === undefined) continue;
        const cmp = String(aVal).localeCompare(String(bVal));
        return spec.direction === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
  }

  get size(): number {
    return this.entityIndex.size;
  }
}

export function createQueryEngine(): QueryEngine {
  return new SimpleQueryEngine();
}
