import { describe, it, expect } from 'vitest';
import type {
  AppConfigService,
  EmbeddingService,
  MarkdownChunkerService,
  IndexStateStoreService,
  VectraStoreService,
  WorkspaceIndexerService,
  SemanticSearchService,
  DomainError,
} from './types.js';
import type { Effect } from 'effect';

describe('Service Interface Types', () => {
  describe('AppConfigService', () => {
    it('has getConfig method returning Effect', () => {
      const svc: AppConfigService = {
        getConfig: () => null as unknown as Effect.Effect<never, never, never>,
        getCorpusPolicyConfig: () => null as unknown as Effect.Effect<never, never, never>,
      };
      expect(typeof svc.getConfig).toBe('function');
    });

    it('has getCorpusPolicyConfig method', () => {
      const svc: AppConfigService = {
        getConfig: () => null as unknown as Effect.Effect<never, never, never>,
        getCorpusPolicyConfig: () => null as unknown as Effect.Effect<never, never, never>,
      };
      expect(typeof svc.getCorpusPolicyConfig).toBe('function');
    });
  });

  describe('EmbeddingService', () => {
    it('has initialize, embedText, embedBatch, and dispose methods', () => {
      const svc: EmbeddingService = {
        initialize: () => null as unknown as Effect.Effect<never, never, never>,
        embedText: () => null as unknown as Effect.Effect<never, never, never>,
        embedBatch: () => null as unknown as Effect.Effect<never, never, never>,
        dispose: () => null as unknown as Effect.Effect<never, never, never>,
      };
      expect(typeof svc.initialize).toBe('function');
      expect(typeof svc.embedText).toBe('function');
      expect(typeof svc.embedBatch).toBe('function');
      expect(typeof svc.dispose).toBe('function');
    });
  });

  describe('MarkdownChunkerService', () => {
    it('has chunkFile and chunkFiles methods', () => {
      const svc: MarkdownChunkerService = {
        chunkFile: () => null as unknown as Effect.Effect<never, never, never>,
        chunkFiles: () => null as unknown as Effect.Effect<never, never, never>,
      };
      expect(typeof svc.chunkFile).toBe('function');
      expect(typeof svc.chunkFiles).toBe('function');
    });
  });

  describe('IndexStateStoreService', () => {
    it('has manifest management methods', () => {
      const svc: IndexStateStoreService = {
        loadManifest: () => null as unknown as Effect.Effect<never, never, never>,
        saveManifest: () => null as unknown as Effect.Effect<never, never, never>,
        getFileStatus: () => null as unknown as Effect.Effect<never, never, never>,
        removeFile: () => null as unknown as Effect.Effect<never, never, never>,
        clearManifest: () => null as unknown as Effect.Effect<never, never, never>,
      };
      expect(typeof svc.loadManifest).toBe('function');
      expect(typeof svc.saveManifest).toBe('function');
      expect(typeof svc.getFileStatus).toBe('function');
      expect(typeof svc.removeFile).toBe('function');
      expect(typeof svc.clearManifest).toBe('function');
    });
  });

  describe('VectraStoreService', () => {
    it('has vector store CRUD methods', () => {
      const svc: VectraStoreService = {
        openIndex: () => null as unknown as Effect.Effect<never, never, never>,
        addItems: () => null as unknown as Effect.Effect<never, never, never>,
        query: () => null as unknown as Effect.Effect<never, never, never>,
        removeByPath: () => null as unknown as Effect.Effect<never, never, never>,
        dispose: () => null as unknown as Effect.Effect<never, never, never>,
      };
      expect(typeof svc.openIndex).toBe('function');
      expect(typeof svc.addItems).toBe('function');
      expect(typeof svc.query).toBe('function');
      expect(typeof svc.removeByPath).toBe('function');
      expect(typeof svc.dispose).toBe('function');
    });
  });

  describe('WorkspaceIndexerService', () => {
    it('has indexing lifecycle methods', () => {
      const svc: WorkspaceIndexerService = {
        indexWorkspace: () => null as unknown as Effect.Effect<never, never, never>,
        reindexFile: () => null as unknown as Effect.Effect<never, never, never>,
        removeFile: () => null as unknown as Effect.Effect<never, never, never>,
        rebuildAll: () => null as unknown as Effect.Effect<never, never, never>,
      };
      expect(typeof svc.indexWorkspace).toBe('function');
      expect(typeof svc.reindexFile).toBe('function');
      expect(typeof svc.removeFile).toBe('function');
      expect(typeof svc.rebuildAll).toBe('function');
    });
  });

  describe('SemanticSearchService', () => {
    it('has the full public API surface', () => {
      const svc: SemanticSearchService = {
        init: () => null as unknown as Effect.Effect<never, never, never>,
        indexWorkspace: () => null as unknown as Effect.Effect<never, never, never>,
        reindexFile: () => null as unknown as Effect.Effect<never, never, never>,
        removeFile: () => null as unknown as Effect.Effect<never, never, never>,
        rebuildAll: () => null as unknown as Effect.Effect<never, never, never>,
        search: () => null as unknown as Effect.Effect<never, never, never>,
        getFeatureState: () => null as unknown as Effect.Effect<never, never, never>,
      };
      expect(typeof svc.init).toBe('function');
      expect(typeof svc.indexWorkspace).toBe('function');
      expect(typeof svc.reindexFile).toBe('function');
      expect(typeof svc.removeFile).toBe('function');
      expect(typeof svc.rebuildAll).toBe('function');
      expect(typeof svc.search).toBe('function');
      expect(typeof svc.getFeatureState).toBe('function');
    });
  });

  describe('DomainError type', () => {
    it('is a union type (type-level check via assignment)', () => {
      // This is a compile-time check. If DomainError is not a valid union,
      // this file won't compile. At runtime we verify the type exists.
      type _test = DomainError extends { readonly _tag: string } ? true : false;
      const _check: _test = true;
      expect(_check).toBe(true);
    });
  });
});
