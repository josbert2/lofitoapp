#!/bin/bash
# Release de una nueva versión del desktop con auto-update.
# Uso:  bash scripts/release-desktop.sh 0.1.1
# Requiere: docker (para el .exe via wine) y scp al server.
set -e

VERSION="$1"
[ -z "$VERSION" ] && { echo "Uso: bash scripts/release-desktop.sh <version>  (ej: 0.1.1)"; exit 1; }

API_URL="https://lofi-api.josbert.dev"
ASSETS_URL="https://pub-0f8ed9369cd240529d7b35eac377f1f9.r2.dev"
SERVER="root@2.25.136.176"
REMOTE_DIR="/var/www/lofito-updates"

echo "==> 1) bump versión a $VERSION en package.json"
npm version "$VERSION" --no-git-tag-version

echo "==> 2) build del front (API prod + assets R2)"
REACT_APP_API_URL="$API_URL" REACT_APP_ASSETS_URL="$ASSETS_URL" npm run build

echo "==> 3) package Windows (.exe + latest.yml) en el container wine"
docker run --rm -v "$PWD":/project -w /project electronuserland/builder:wine \
  /bin/bash -lc "npx electron-builder --win nsis --publish never"

echo "==> 4) subir latest.yml + exe + blockmap al server"
scp "dist-desktop/latest.yml" \
    "dist-desktop/Lofito Setup ${VERSION}.exe" \
    "dist-desktop/Lofito Setup ${VERSION}.exe.blockmap" \
    "${SERVER}:${REMOTE_DIR}/"

echo "==> LISTO. Las apps instaladas van a detectar la $VERSION al abrir."
echo "    Verificá: curl https://lofito.josbert.dev/updates/latest.yml"
