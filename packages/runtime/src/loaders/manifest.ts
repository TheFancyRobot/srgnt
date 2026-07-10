import {
  SSkillManifest,
  parseSync,
  type SkillManifest,
} from '@srgnt/contracts';

export interface ManifestLoadResult<T> {
  success: boolean;
  manifest?: T;
  error?: string;
}

export class ManifestLoader {
  loadSkillManifest(manifest: unknown): ManifestLoadResult<SkillManifest> {
    try {
      const validated = parseSync(SSkillManifest, manifest) as unknown as SkillManifest;
      return { success: true, manifest: validated };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

export function createManifestLoader(): ManifestLoader {
  return new ManifestLoader();
}
