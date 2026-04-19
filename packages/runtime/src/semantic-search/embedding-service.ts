/**
 * Offline embedding service for semantic search.
 *
 * Uses @huggingface/transformers to load a local model and generate
 * embeddings via the feature-extraction pipeline. Remote model loading
 * is explicitly disabled (env.allowRemoteModels = false).
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ModelAssetError } from './errors.js';

/** Expected embedding dimension for the default MiniLM model */
export const EXPECTED_EMBEDDING_DIMENSION = 384;

/** Default model ID (must match the bundled model in assets/) */
export const DEFAULT_MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

export interface EmbeddingServiceConfig {
  /** Absolute path to the model directory on disk */
  modelAssetPath: string;
  /** Model ID for manifest tracking (default: DEFAULT_MODEL_ID) */
  modelId?: string;
}

export interface EmbeddingResult {
  /** The model ID that generated this embedding */
  modelId: string;
  /** Embedding vector (float32 array) */
  embedding: number[];
  /** Dimension of the embedding vector */
  dimension: number;
}

/**
 * Validate that a model directory exists and contains required files.
 * Throws ModelAssetError if validation fails.
 */
export async function validateModelDirectory(modelPath: string): Promise<void> {
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(modelPath);
  } catch {
    throw new ModelAssetError({
      message: `Model directory does not exist: ${modelPath}`,
      assetPath: modelPath,
    });
  }

  if (!stat.isDirectory()) {
    throw new ModelAssetError({
      message: `Model path is not a directory: ${modelPath}`,
      assetPath: modelPath,
    });
  }

  // Check for model metadata (required by transformers.js)
  const configPath = path.join(modelPath, 'config.json');
  try {
    await fs.access(configPath);
  } catch {
    throw new ModelAssetError({
      message: `Model directory missing config.json: ${modelPath}`,
      assetPath: modelPath,
    });
  }

  // Check for model weights (onnx or safetensors)
  const onnxPath = path.join(modelPath, 'onnx');
  const safetensorsPath = path.join(modelPath, 'model.safetensors');
  const hasOnnx = await fs.access(onnxPath).then(() => true).catch(() => false);
  const hasSafetensors = await fs.access(safetensorsPath).then(() => true).catch(() => false);

  if (!hasOnnx && !hasSafetensors) {
    throw new ModelAssetError({
      message: `Model directory missing model weights (expected onnx/ or model.safetensors): ${modelPath}`,
      assetPath: modelPath,
    });
  }
}

/**
 * Create a configured embedding pipeline that only loads from local files.
 *
 * This function dynamically imports @huggingface/transformers so the
 * dependency is only required when semantic search is actually used.
 */
export async function createEmbeddingPipeline(config: EmbeddingServiceConfig) {
  await validateModelDirectory(config.modelAssetPath);

  const modelId = config.modelId ?? DEFAULT_MODEL_ID;
  const modelPath = path.resolve(config.modelAssetPath);

  // Dynamic import — @huggingface/transformers is optional at runtime
  let transformers: typeof import('@huggingface/transformers');
  try {
    transformers = await import('@huggingface/transformers');
  } catch {
    throw new ModelAssetError({
      message: '@huggingface/transformers is not installed. Add it to your dependencies.',
      assetPath: config.modelAssetPath,
    });
  }

  // Enforce local-only model loading
  transformers.env.allowRemoteModels = false;

  const pipeline = await transformers.pipeline(
    'feature-extraction',
    modelPath,
    {
      local_files_only: true,
      device: 'cpu',
    }
  );

  return { pipeline, modelId };
}

/**
 * Generate an embedding for a single text input.
 */
export async function embedText(
  text: string,
  pipeline: ReturnType<Awaited<ReturnType<typeof createEmbeddingPipeline>>['pipeline']>,
  modelId: string
): Promise<EmbeddingResult> {
  // @ts-expect-error — transformers.js pipeline output overloads are complex
  const output = await pipeline(text, { pooling: 'mean', normalize: true });
  const embedding: number[] = Array.from((output as any).data ?? (output as any));

  if (embedding.length !== EXPECTED_EMBEDDING_DIMENSION) {
    throw new ModelAssetError({
      message: `Model produced unexpected embedding dimension: ${embedding.length} (expected ${EXPECTED_EMBEDDING_DIMENSION})`,
      assetPath: modelId,
    });
  }

  return {
    modelId,
    embedding,
    dimension: embedding.length,
  };
}

/**
 * Generate embeddings for multiple texts in batch.
 */
export async function embedBatch(
  texts: string[],
  pipeline: ReturnType<Awaited<ReturnType<typeof createEmbeddingPipeline>>['pipeline']>,
  modelId: string
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const text of texts) {
    const result = await embedText(text, pipeline, modelId);
    results.push(result);
  }

  return results;
}
