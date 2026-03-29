#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${PACKAGE_DIR}/../.." && pwd)"

VERSION="$(node -p "require('${PACKAGE_DIR}/package.json').version")"
NAME="srgnt"
ARCH="x86_64"
RELEASE="1"
RPM_BASENAME="${NAME}-${VERSION}-fedora-${ARCH}.rpm"
OUTPUT_RPM="${PACKAGE_DIR}/release/${RPM_BASENAME}"

BUILD_ROOT="$(mktemp -d)"
STAGING_ROOT="${BUILD_ROOT}/staging/${NAME}-${VERSION}"
APP_ROOT="${STAGING_ROOT}/opt/${NAME}"
APPLICATIONS_ROOT="${STAGING_ROOT}/usr/share/applications"
ICONS_ROOT="${STAGING_ROOT}/usr/share/icons/hicolor"
SOURCES_ROOT="${BUILD_ROOT}/SOURCES"
SPECS_ROOT="${BUILD_ROOT}/SPECS"
RPMS_ROOT="${BUILD_ROOT}/RPMS"
CUSTOM_ICON_ROOT="${PACKAGE_DIR}/build/icons"

if [[ ! -d "${CUSTOM_ICON_ROOT}" ]]; then
  printf 'Missing generated icons in %s. Run pnpm --filter @srgnt/desktop build:icons first.\n' "${CUSTOM_ICON_ROOT}" >&2
  exit 1
fi

cleanup() {
  rm -rf "${BUILD_ROOT}"
}
trap cleanup EXIT

mkdir -p "${PACKAGE_DIR}/release"

pushd "${PACKAGE_DIR}" >/dev/null
pnpm run build:icons
pnpm run pack
popd >/dev/null

mkdir -p "${APP_ROOT}" "${APPLICATIONS_ROOT}" "${SOURCES_ROOT}" "${SPECS_ROOT}" "${RPMS_ROOT}"
cp -a "${PACKAGE_DIR}/release/linux-unpacked/." "${APP_ROOT}/"

cat > "${APPLICATIONS_ROOT}/${NAME}.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=srgnt
Comment=Electron desktop shell for srgnt
Exec=/opt/srgnt/srgnt
Icon=srgnt
Terminal=false
Categories=Utility;
StartupWMClass=srgnt
EOF

for size in 16 32 48 64 128 256; do
  mkdir -p "${ICONS_ROOT}/${size}x${size}/apps"
  cp "${CUSTOM_ICON_ROOT}/${size}x${size}.png" "${ICONS_ROOT}/${size}x${size}/apps/${NAME}.png"
done

tar -C "${BUILD_ROOT}/staging" -czf "${SOURCES_ROOT}/${NAME}-${VERSION}.tar.gz" "${NAME}-${VERSION}"

cat > "${SPECS_ROOT}/${NAME}.spec" <<EOF
%global debug_package %{nil}
%global __strip /bin/true
%global _build_id_links none

Name: ${NAME}
Version: ${VERSION}
Release: ${RELEASE}%{?dist}
Summary: Electron desktop shell for srgnt
License: UNLICENSED
URL: https://srgnt.app
Source0: %{name}-%{version}.tar.gz
BuildArch: ${ARCH}
AutoReqProv: no
Requires: at-spi2-core
Requires: gtk3
Requires: libnotify
Requires: libuuid
Requires: libXScrnSaver
Requires: libXtst
Requires: nss
Requires: xdg-utils

%description
Electron desktop shell for srgnt.

%prep
%setup -q

%build

%install
mkdir -p %{buildroot}
cp -a opt %{buildroot}/
cp -a usr %{buildroot}/

%files
/opt/srgnt
/usr/share/applications/srgnt.desktop
/usr/share/icons/hicolor/16x16/apps/srgnt.png
/usr/share/icons/hicolor/32x32/apps/srgnt.png
/usr/share/icons/hicolor/48x48/apps/srgnt.png
/usr/share/icons/hicolor/64x64/apps/srgnt.png
/usr/share/icons/hicolor/128x128/apps/srgnt.png
/usr/share/icons/hicolor/256x256/apps/srgnt.png

%changelog
* Sat Mar 28 2026 srgnt <hello@srgnt.app> - ${VERSION}-${RELEASE}
- Fedora local RPM build
EOF

rpmbuild -bb \
  --define "_topdir ${BUILD_ROOT}" \
  --define "_sourcedir ${SOURCES_ROOT}" \
  --define "_specdir ${SPECS_ROOT}" \
  --define "_rpmdir ${RPMS_ROOT}" \
  --define "_build_id_links none" \
  "${SPECS_ROOT}/${NAME}.spec"

BUILT_RPM="$(readlink -f "$(find "${RPMS_ROOT}" -name '*.rpm' -print -quit)")"
cp "${BUILT_RPM}" "${OUTPUT_RPM}"
printf 'Built Fedora RPM: %s\n' "${OUTPUT_RPM}"
