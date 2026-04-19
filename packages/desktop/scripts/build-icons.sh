#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BUILD_DIR="${PACKAGE_DIR}/build"
ICON_SOURCE="${BUILD_DIR}/icon.svg"
ICONSET_DIR="${BUILD_DIR}/icons"

mkdir -p "${ICONSET_DIR}"

pnpm exec icon-gen \
  -i "${ICON_SOURCE}" \
  -o "${BUILD_DIR}" \
  --ico \
  --ico-name icon \
  --icns \
  --icns-name icon \
  -r

# Use ImageMagick if available (prefer magick, fall back to convert on Ubuntu)
if command -v magick > /dev/null 2>&1; then
  MAGICK_CMD="magick"
elif command -v convert > /dev/null 2>&1; then
  MAGICK_CMD="convert"
else
  echo "ImageMagick not found — skipping PNG generation (CI uses pre-generated assets)"
  MAGICK_CMD=""
fi

for size in 16 24 32 48 64 128 256 512 1024; do
  if [ -n "${MAGICK_CMD}" ]; then
    ${MAGICK_CMD} "${ICON_SOURCE}" -background none -resize "${size}x${size}" "${ICONSET_DIR}/${size}x${size}.png"
  fi
done

cp "${ICONSET_DIR}/512x512.png" "${BUILD_DIR}/icon.png"
