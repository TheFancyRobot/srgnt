#!/usr/bin/env bash
set -euo pipefail

# Download the default embedding model for offline use.
# Model: Xenova/paraphrase-multilingual-MiniLM-L12-v2
# Output: assets/model/ in the repo root
#
# Usage:
#   ./scripts/download-default-model.sh [--force]
#
# The --force flag re-downloads even if the directory already exists.

MODEL_ID="Xenova/paraphrase-multilingual-MiniLM-L12-v2"
OUTPUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/model"

FORCE=false
if [[ "${1:-}" == "--force" ]]; then
  FORCE=true
fi

if [[ -d "$OUTPUT_DIR" ]] && [[ "$FORCE" == "false" ]]; then
  echo "Model directory already exists: $OUTPUT_DIR"
  echo "Use --force to re-download."
  exit 0
fi

echo "Downloading model: $MODEL_ID"
echo "Output directory: $OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

# Use a pinned transformers.js CLI version so downloads are reproducible.
# This script requires npx and network access.
TRANSFORMERS_VERSION="3.4.1"
npx --yes "@huggingface/transformers@${TRANSFORMERS_VERSION}" download "$MODEL_ID" --local-dir "$OUTPUT_DIR"

# Write a manifest file for version tracking
cat > "$OUTPUT_DIR/manifest.json" << EOF
{
  "modelId": "${MODEL_ID}",
  "modelVersion": "${TRANSFORMERS_VERSION}",
  "downloadedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "embeddingDimension": 384
}
EOF

echo "Model downloaded successfully to: $OUTPUT_DIR"
echo "Manifest written to: $OUTPUT_DIR/manifest.json"
