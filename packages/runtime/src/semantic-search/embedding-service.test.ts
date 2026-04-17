import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  validateModelDirectory,
  createEmbeddingPipeline,
  embedText,
  embedBatch,
  EXPECTED_EMBEDDING_DIMENSION,
  DEFAULT_MODEL_ID,
} from './embedding-service.js';
import { ModelAssetError } from './errors.js';

describe('embedding-service constants', () => {
  it('has correct default model ID', () => {
    expect(DEFAULT_MODEL_ID).toBe('Xenova/paraphrase-multilingual-MiniLM-L12-v2');
  });

  it('has correct expected dimension for MiniLM', () => {
    expect(EXPECTED_EMBEDDING_DIMENSION).toBe(384);
  });
});

describe('validateModelDirectory', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'model-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('throws ModelAssetError for non-existent directory', async () => {
    await expect(validateModelDirectory('/nonexistent/path')).rejects.toThrow(ModelAssetError);
    await expect(validateModelDirectory('/nonexistent/path')).rejects.toMatchObject({
      message: expect.stringContaining('does not exist'),
    });
  });

  it('throws ModelAssetError when path is a file not a directory', async () => {
    const filePath = path.join(tmpDir, 'not-a-dir.txt');
    await fs.writeFile(filePath, 'data');

    await expect(validateModelDirectory(filePath)).rejects.toThrow(ModelAssetError);
    await expect(validateModelDirectory(filePath)).rejects.toMatchObject({
      message: expect.stringContaining('not a directory'),
    });
  });

  it('throws ModelAssetError when config.json is missing', async () => {
    await expect(validateModelDirectory(tmpDir)).rejects.toThrow(ModelAssetError);
    await expect(validateModelDirectory(tmpDir)).rejects.toMatchObject({
      message: expect.stringContaining('missing config.json'),
    });
  });

  it('throws ModelAssetError when model weights are missing', async () => {
    await fs.writeFile(path.join(tmpDir, 'config.json'), '{}');

    await expect(validateModelDirectory(tmpDir)).rejects.toThrow(ModelAssetError);
    await expect(validateModelDirectory(tmpDir)).rejects.toMatchObject({
      message: expect.stringContaining('missing model weights'),
    });
  });

  it('passes validation with onnx model weights', async () => {
    await fs.writeFile(path.join(tmpDir, 'config.json'), '{}');
    await fs.mkdir(path.join(tmpDir, 'onnx'), { recursive: true });
    // Create a dummy file inside onnx/
    await fs.writeFile(path.join(tmpDir, 'onnx', 'model.onnx'), 'dummy');

    await expect(validateModelDirectory(tmpDir)).resolves.toBeUndefined();
  });

  it('passes validation with safetensors model weights', async () => {
    await fs.writeFile(path.join(tmpDir, 'config.json'), '{}');
    await fs.writeFile(path.join(tmpDir, 'model.safetensors'), 'dummy');

    await expect(validateModelDirectory(tmpDir)).resolves.toBeUndefined();
  });
});

describe('createEmbeddingPipeline', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pipeline-test-'));
    await fs.writeFile(path.join(tmpDir, 'config.json'), '{}');
    await fs.mkdir(path.join(tmpDir, 'onnx'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, 'onnx', 'model.onnx'), 'dummy');
  });

  afterEach(async () => {
    vi.resetModules();
    vi.unmock('@huggingface/transformers');
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('enforces local-only loading and passes the packaged model path to transformers', async () => {
    const pipelineMock = vi.fn(async () => ({ data: new Float32Array(EXPECTED_EMBEDDING_DIMENSION) }));
    const transformersMock = {
      env: { allowRemoteModels: true },
      pipeline: vi.fn(async (_task: string, model: string, options: Record<string, unknown>) => {
        expect(model).toBe(path.resolve(tmpDir));
        expect(options.local_files_only).toBe(true);
        expect(options.device).toBe('cpu');
        return pipelineMock;
      }),
    };

    vi.doMock('@huggingface/transformers', () => transformersMock);

    const { pipeline, modelId } = await createEmbeddingPipeline({
      modelAssetPath: tmpDir,
      modelId: DEFAULT_MODEL_ID,
    });

    expect(transformersMock.env.allowRemoteModels).toBe(false);
    expect(transformersMock.pipeline).toHaveBeenCalledOnce();
    expect(pipeline).toBe(pipelineMock);
    expect(modelId).toBe(DEFAULT_MODEL_ID);
  });

  it('wraps missing transformers dependency as ModelAssetError', async () => {
    vi.doMock('@huggingface/transformers', () => {
      throw new Error('module not found');
    });

    await expect(createEmbeddingPipeline({ modelAssetPath: tmpDir })).rejects.toThrow(ModelAssetError);
    await expect(createEmbeddingPipeline({ modelAssetPath: tmpDir })).rejects.toMatchObject({
      message: expect.stringContaining('not installed'),
    });
  });
});

describe('embedText', () => {
  it('returns embedding with correct dimension and modelId', async () => {
    const pipelineMock = vi.fn(async () => ({
      data: new Float32Array(EXPECTED_EMBEDDING_DIMENSION),
    }));
    const result = await embedText('test input', pipelineMock as never, DEFAULT_MODEL_ID);

    expect(result.embedding).toHaveLength(EXPECTED_EMBEDDING_DIMENSION);
    expect(result.modelId).toBe(DEFAULT_MODEL_ID);
    expect(result.dimension).toBe(EXPECTED_EMBEDDING_DIMENSION);
    expect(pipelineMock).toHaveBeenCalledWith('test input', { pooling: 'mean', normalize: true });
  });

  it('throws ModelAssetError when embedding dimension is wrong', async () => {
    const pipelineMock = vi.fn(async () => ({
      data: new Float32Array(128), // wrong dimension
    }));
    await expect(embedText('test input', pipelineMock as never, DEFAULT_MODEL_ID)).rejects.toThrow(
      ModelAssetError
    );
    await expect(embedText('test input', pipelineMock as never, DEFAULT_MODEL_ID)).rejects.toMatchObject({
      message: expect.stringContaining('unexpected embedding dimension'),
      assetPath: DEFAULT_MODEL_ID,
    });
  });

  it('passes the correct pooling and normalize options to the pipeline', async () => {
    const pipelineMock = vi.fn(async () => ({ data: new Float32Array(EXPECTED_EMBEDDING_DIMENSION) }));
    await embedText('query text', pipelineMock as never, DEFAULT_MODEL_ID);
    expect(pipelineMock).toHaveBeenCalledWith('query text', {
      pooling: 'mean',
      normalize: true,
    });
  });
});

describe('embedBatch', () => {
  it('returns embeddings for multiple texts', async () => {
    const pipelineMock = vi.fn(async () => ({
      data: new Float32Array(EXPECTED_EMBEDDING_DIMENSION),
    }));
    const results = await embedBatch(
      ['input one', 'input two', 'input three'],
      pipelineMock as never,
      DEFAULT_MODEL_ID
    );

    expect(results).toHaveLength(3);
    expect(pipelineMock).toHaveBeenCalledTimes(3);
    expect(results.every((r) => r.modelId === DEFAULT_MODEL_ID)).toBe(true);
  });

  it('produces deterministic results for identical inputs', async () => {
    const pipelineMock = vi.fn(async () => ({
      data: new Float32Array(EXPECTED_EMBEDDING_DIMENSION),
    }));
    const [first, second] = await embedBatch(['same', 'same'], pipelineMock as never, DEFAULT_MODEL_ID);

    expect(first.embedding).toEqual(second.embedding);
  });
});

describe('embedText', () => {
  it('returns embedding with correct dimension and modelId', async () => {
    const pipelineMock = vi.fn(async () => ({
      data: new Float32Array(EXPECTED_EMBEDDING_DIMENSION),
    }));
    const result = await embedText('test input', pipelineMock as never, DEFAULT_MODEL_ID);

    expect(result.embedding).toHaveLength(EXPECTED_EMBEDDING_DIMENSION);
    expect(result.modelId).toBe(DEFAULT_MODEL_ID);
    expect(result.dimension).toBe(EXPECTED_EMBEDDING_DIMENSION);
    expect(pipelineMock).toHaveBeenCalledWith('test input', { pooling: 'mean', normalize: true });
  });


  it('throws ModelAssetError when embedding dimension is wrong', async () => {
    const pipelineMock = vi.fn(async () => ({
      data: new Float32Array(128),
    }));
    await expect(embedText('test input', pipelineMock as never, DEFAULT_MODEL_ID)).rejects.toThrow(
      ModelAssetError
    );
    await expect(embedText('test input', pipelineMock as never, DEFAULT_MODEL_ID)).rejects.toMatchObject({
      message: expect.stringContaining('unexpected embedding dimension'),
      assetPath: DEFAULT_MODEL_ID,
    });
  });


  it('passes pooling and normalize options to the pipeline', async () => {
    const pipelineMock = vi.fn(async () => ({
      data: new Float32Array(EXPECTED_EMBEDDING_DIMENSION),
    }));
    await embedText('query text', pipelineMock as never, DEFAULT_MODEL_ID);
    expect(pipelineMock).toHaveBeenCalledWith('query text', {
      pooling: 'mean',
      normalize: true,
    });
  });
});


describe('embedBatch', () => {
  it('returns embeddings for multiple texts', async () => {
    const pipelineMock = vi.fn(async () => ({
      data: new Float32Array(EXPECTED_EMBEDDING_DIMENSION),
    }));
    const results = await embedBatch(
      ['input one', 'input two', 'input three'],
      pipelineMock as never,
      DEFAULT_MODEL_ID
    );

    expect(results).toHaveLength(3);
    expect(pipelineMock).toHaveBeenCalledTimes(3);
    expect(results.every((r) => r.modelId === DEFAULT_MODEL_ID)).toBe(true);
  });

  it('produces deterministic results for identical inputs', async () => {
    const pipelineMock = vi.fn(async () => ({
      data: new Float32Array(EXPECTED_EMBEDDING_DIMENSION),
    }));
    const [first, second] = await embedBatch(['same', 'same'], pipelineMock as never, DEFAULT_MODEL_ID);

    expect(first.embedding).toEqual(second.embedding);
  });
});

describe('ModelAssetError', () => {
  it('is a TaggedError with _tag ModelAssetError', () => {
    const err = new ModelAssetError({
      message: 'test error',
      assetPath: '/path/to/model',
    });
    expect(err._tag).toBe('ModelAssetError');
    expect(err.assetPath).toBe('/path/to/model');
  });
});
