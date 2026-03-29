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

for size in 16 24 32 48 64 128 256 512 1024; do
  magick "${ICON_SOURCE}" -background none -resize "${size}x${size}" "${ICONSET_DIR}/${size}x${size}.png"
done

cp "${ICONSET_DIR}/512x512.png" "${BUILD_DIR}/icon.png"
