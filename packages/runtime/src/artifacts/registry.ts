import { Schema } from "@effect/schema";
import type { Artifact } from '@srgnt/contracts';

export const SArtifactMetadata = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  content: Schema.String,
  contentType: Schema.optionalWith(Schema.Literal("markdown", "text", "html", "json"), { default: () => "markdown" as const }),
  sourceSkill: Schema.optional(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.optional(Schema.String),
  tags: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  metadata: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), { default: () => ({}) }),
});

export type ArtifactMetadata = Schema.Schema.Type<typeof SArtifactMetadata>;

export interface ArtifactRegistry {
  register(artifact: Artifact): void;
  get(id: string): Artifact | undefined;
  list(): Artifact[];
  findBySkill(skillName: string): Artifact[];
  findByTag(tag: string): Artifact[];
  remove(id: string): boolean;
  clear(): void;
  readonly size: number;
}

export class InMemoryArtifactRegistry implements ArtifactRegistry {
  private artifacts: Map<string, Artifact>;

  constructor() {
    this.artifacts = new Map();
  }

  register(artifact: Artifact): void {
    this.artifacts.set(artifact.envelope.id, artifact);
  }

  get(id: string): Artifact | undefined {
    return this.artifacts.get(id);
  }

  list(): Artifact[] {
    return Array.from(this.artifacts.values());
  }

  findBySkill(skillName: string): Artifact[] {
    return Array.from(this.artifacts.values()).filter(
      (a) => a.sourceSkill === skillName
    );
  }

  findByTag(tag: string): Artifact[] {
    return Array.from(this.artifacts.values()).filter(
      (a) => a.tags?.includes(tag)
    );
  }

  remove(id: string): boolean {
    return this.artifacts.delete(id);
  }

  clear(): void {
    this.artifacts.clear();
  }

  get size(): number {
    return this.artifacts.size;
  }
}

export function createArtifactRegistry(): ArtifactRegistry {
  return new InMemoryArtifactRegistry();
}
