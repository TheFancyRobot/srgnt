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
    this.entityIndex.set(entity.id, entity);
  }

  removeFromIndex(id: string): void {
    this.entityIndex.delete(id);
  }

  private executeDql<T>(query: string, start: number): Promise<QueryResult<T>> {
    const fromMatch = query.match(/FROM\s+["']?(\w+)["']?/i);
    const entityType = fromMatch ? fromMatch[1] : null;

    let results = Array.from(this.entityIndex.values()) as unknown as T[];

    if (entityType) {
      results = results.filter((e: unknown) => {
        const entity = e as Record<string, unknown>;
        return entity.canonicalType === entityType;
      });
    }

    const durationMs = Date.now() - start;
    return Promise.resolve({
      data: results,
      total: results.length,
      durationMs,
    });
  }

  private executeStructuredQuery<T>(query: DataviewQuery, start: number): Promise<QueryResult<T>> {
    let results = Array.from(this.entityIndex.values()) as unknown as T[];

    if (query.from) {
      const entityType = query.from;
      results = results.filter((e: unknown) => {
        const entity = e as Record<string, unknown>;
        return entity.canonicalType === entityType;
      });
    }

    if (query.sort) {
      results = this.applySort(results, query.sort);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    const durationMs = Date.now() - start;
    return Promise.resolve({
      data: results,
      total: results.length,
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
