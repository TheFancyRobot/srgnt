/**
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { ipcChannels } from '@srgnt/contracts';

const { readFileSync } = await import('node:fs');
const { resolve } = await import('node:path');
const normalizeEol = (raw: string): string => raw.replace(/\r\n/g, '\n');
const preloadSource = normalizeEol(readFileSync(resolve(__dirname, '../../preload/index.ts'), 'utf-8'));
const envSource = normalizeEol(readFileSync(resolve(__dirname, '../../renderer/env.d.ts'), 'utf-8'));
const mainSource = normalizeEol(readFileSync(resolve(__dirname, '../index.ts'), 'utf-8'));

describe('Semantic Search IPC handlers', () => {
  // -------------------------------------------------------------------------
  // Channel string verification (these should always pass since we import
  // from the canonical source)
  // -------------------------------------------------------------------------

  describe('channel strings match canonical definitions', () => {
    it('semanticSearchInit channel is correct', () => {
      expect(ipcChannels.semanticSearchInit).toBe('semantic-search:init');
    });

    it('semanticSearchEnableForWorkspace channel is correct', () => {
      expect(ipcChannels.semanticSearchEnableForWorkspace).toBe(
        'semantic-search:enable-for-workspace',
      );
    });

    it('semanticSearchIndexWorkspace channel is correct', () => {
      expect(ipcChannels.semanticSearchIndexWorkspace).toBe(
        'semantic-search:index-workspace',
      );
    });

    it('semanticSearchRebuildAll channel is correct', () => {
      expect(ipcChannels.semanticSearchRebuildAll).toBe('semantic-search:rebuild-all');
    });

    it('semanticSearchSearch channel is correct', () => {
      expect(ipcChannels.semanticSearchSearch).toBe('semantic-search:search');
    });

    it('semanticSearchStatus channel is correct', () => {
      expect(ipcChannels.semanticSearchStatus).toBe('semantic-search:status');
    });
  });

  // -------------------------------------------------------------------------
  // Preload channel sync verification
  // -------------------------------------------------------------------------

  describe('preload channels are in sync', () => {
    it('preload has semanticSearchInit inlined', () => {
      expect(preloadSource).toContain(
        "semanticSearchInit: 'semantic-search:init'",
      );
    });

    it('preload has semanticSearchEnableForWorkspace inlined', () => {
      expect(preloadSource).toContain(
        "semanticSearchEnableForWorkspace: 'semantic-search:enable-for-workspace'",
      );
    });

    it('preload has semanticSearchIndexWorkspace inlined', () => {
      expect(preloadSource).toContain(
        "semanticSearchIndexWorkspace: 'semantic-search:index-workspace'",
      );
    });

    it('preload has semanticSearchRebuildAll inlined', () => {
      expect(preloadSource).toContain(
        "semanticSearchRebuildAll: 'semantic-search:rebuild-all'",
      );
    });

    it('preload has semanticSearchSearch inlined', () => {
      expect(preloadSource).toContain(
        "semanticSearchSearch: 'semantic-search:search'",
      );
    });

    it('preload has semanticSearchStatus inlined', () => {
      expect(preloadSource).toContain(
        "semanticSearchStatus: 'semantic-search:status'",
      );
    });
  });

  // -------------------------------------------------------------------------
  // API method verification in preload
  // -------------------------------------------------------------------------

  describe('preload exposes semantic search API methods', () => {
    it('preload has semanticSearchInit API method', () => {
      expect(preloadSource).toContain('semanticSearchInit:');
    });

    it('preload has semanticSearchEnableForWorkspace API method', () => {
      expect(preloadSource).toContain('semanticSearchEnableForWorkspace:');
    });

    it('preload has semanticSearchIndexWorkspace API method', () => {
      expect(preloadSource).toContain('semanticSearchIndexWorkspace:');
    });

    it('preload has semanticSearchRebuildAll API method', () => {
      expect(preloadSource).toContain('semanticSearchRebuildAll:');
    });

    it('preload has semanticSearchSearch API method', () => {
      expect(preloadSource).toContain('semanticSearchSearch:');
    });

    it('preload has semanticSearchStatus API method', () => {
      expect(preloadSource).toContain('semanticSearchStatus:');
    });
  });

  // -------------------------------------------------------------------------
  // Type declarations verification
  // -------------------------------------------------------------------------

  describe('env.d.ts has semantic search type declarations', () => {
    it('env.d.ts has semanticSearchInit type declaration', () => {
      expect(envSource).toContain('semanticSearchInit(): Promise<');
    });

    it('env.d.ts has semanticSearchEnableForWorkspace type declaration', () => {
      expect(envSource).toContain('semanticSearchEnableForWorkspace(');
    });

    it('env.d.ts has semanticSearchIndexWorkspace type declaration', () => {
      expect(envSource).toContain('semanticSearchIndexWorkspace(');
    });

    it('env.d.ts has semanticSearchRebuildAll type declaration', () => {
      expect(envSource).toContain('semanticSearchRebuildAll(');
    });

    it('env.d.ts has semanticSearchSearch type declaration', () => {
      expect(envSource).toContain('semanticSearchSearch(');
    });

    it('env.d.ts has semanticSearchStatus type declaration', () => {
      expect(envSource).toContain('semanticSearchStatus(');
    });
  });

  describe('main handler implementation contracts', () => {
    it('semanticSearchInit parses the init request schema and delegates to host.initialize', () => {
      expect(mainSource).toContain('ipcMain.handle(ipcChannels.semanticSearchInit');
      expect(mainSource).toContain('parseSync(SSemanticSearchInitRequest, rawRequest ?? {})');
      expect(mainSource).toContain('await semanticSearchHost.initialize(workspaceRoot)');
    });

    it('semanticSearchEnableForWorkspace parses schema and delegates to host.enableForWorkspace', () => {
      expect(mainSource).toContain('parseSync(SSemanticSearchEnableForWorkspaceRequest, rawRequest ?? {})');
      expect(mainSource).toContain('await semanticSearchHost.enableForWorkspace(request.workspaceRoot)');
    });

    it('semanticSearchIndexWorkspace parses schema and delegates to host.indexWorkspace', () => {
      expect(mainSource).toContain('parseSync(SSemanticSearchIndexWorkspaceRequest, rawRequest ?? {})');
      expect(mainSource).toContain('semanticSearchHost.indexWorkspace(request.workspaceRoot');
    });

    it('semanticSearchRebuildAll parses schema and delegates to host.rebuildAll', () => {
      expect(mainSource).toContain('parseSync(SSemanticSearchRebuildAllRequest, rawRequest ?? {})');
      expect(mainSource).toContain('semanticSearchHost.rebuildAll(request.workspaceRoot)');
    });

    it('semanticSearchSearch parses schema and delegates to host.search', () => {
      expect(mainSource).toContain('parseSync(SSemanticSearchSearchRequest, rawRequest ?? {})');
      expect(mainSource).toContain('const results = await semanticSearchHost.search(');
      expect(mainSource).toContain('request.query,');
      expect(mainSource).toContain('request.workspaceRoot,');
      expect(mainSource).toContain('request.maxResults,');
      expect(mainSource).toContain('request.minScore,');
      expect(mainSource).toContain('return { results }');
    });

    it('semanticSearchStatus returns extended status data', () => {
      expect(mainSource).toContain('parseSync(SSemanticSearchStatusRequest, rawRequest ?? {})');
      expect(mainSource).toContain('semanticSearchStatus.indexedFileCount');
      expect(mainSource).toContain('semanticSearchStatus.totalChunkCount');
      expect(mainSource).toContain('semanticSearchStatus.progressPercent');
      expect(mainSource).toContain('semanticSearchStatus.lastIndexedAt');
    });
  });

  describe('renderer-facing shape stays aligned', () => {
    it('status request remains workspace-root-required in preload and env types', () => {
      expect(preloadSource).toContain('semanticSearchStatus: (workspaceRoot: string)');
      expect(envSource).toContain('semanticSearchStatus(workspaceRoot: string)');
    });

    it('index and search requests remain workspace-root-required in preload and env types', () => {
      expect(preloadSource).toContain('semanticSearchIndexWorkspace: (workspaceRoot: string, force?: boolean)');
      expect(preloadSource).toContain('semanticSearchSearch: (\n    workspaceRoot: string,');
      expect(envSource).toContain('semanticSearchIndexWorkspace(workspaceRoot: string, force?: boolean)');
      expect(envSource).toContain('semanticSearchSearch(');
      expect(envSource).toContain('workspaceRoot: string,');
    });
  });
});
