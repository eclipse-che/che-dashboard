#!/usr/bin/env bash
#
# Copyright (c) 2018-2026 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Fetches Eclipse Che Dashboard plugins from GitHub Releases and unpacks them
# into the plugins/ directory.
#
# Usage:
#   bash scripts/fetch-plugins.sh
#   bash scripts/fetch-plugins.sh --ref v1.2.0   # specific release tag
#
# Environment Variables:
#   PLUGINS_REPO   - GitHub repository (default: olexii4/che-dashboard-plugins)
#   PLUGINS_REF    - Release tag (default: latest)
#   PLUGINS_DIR    - Target directory (default: $PWD/plugins)
#   LOCAL_PLUGINS  - Path to a local che-dashboard-plugins clone; skips download
#                    when set (useful for active plugin development)
#

set -euo pipefail

PLUGINS_REPO="${PLUGINS_REPO:-olexii4/che-dashboard-plugins}"
PLUGINS_REF="${PLUGINS_REF:-latest}"
PLUGINS_DIR="${PLUGINS_DIR:-${PWD}/plugins}"
LOCAL_PLUGINS="${LOCAL_PLUGINS:-}"

# --ref flag overrides PLUGINS_REF
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref) PLUGINS_REF="$2"; shift 2 ;;
    *) echo "[ERROR] Unknown argument: $1"; exit 1 ;;
  esac
done

# ── Local mode: copy from a local clone ──────────────────────────────────────
if [[ -n "$LOCAL_PLUGINS" ]]; then
  echo "[INFO] LOCAL_PLUGINS set — copying from: $LOCAL_PLUGINS"
  if [[ ! -d "$LOCAL_PLUGINS" ]]; then
    echo "[ERROR] LOCAL_PLUGINS path not found: $LOCAL_PLUGINS"
    exit 1
  fi
  mkdir -p "$PLUGINS_DIR"
  for d in "$LOCAL_PLUGINS"/*/; do
    [ -f "${d}plugin.json" ] || continue
    name=$(basename "$d")
    echo "[INFO] Copying plugin: $name"
    rm -rf "${PLUGINS_DIR}/${name}"
    cp -r "$d" "${PLUGINS_DIR}/${name}"
  done
  echo "[INFO] Local plugin copy complete."
  exit 0
fi

# ── Remote mode: download ZIPs from GitHub Releases ──────────────────────────
BASE_URL="https://github.com/${PLUGINS_REPO}/releases/download/${PLUGINS_REF}"
PLUGINS=(ai-selector dashboard-ai-agent)

mkdir -p "$PLUGINS_DIR"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "[INFO] Fetching plugins from: ${BASE_URL}"
echo "[INFO] Target directory: ${PLUGINS_DIR}"

for plugin in "${PLUGINS[@]}"; do
  ZIP_URL="${BASE_URL}/${plugin}.zip"
  ZIP_FILE="${TMP_DIR}/${plugin}.zip"

  echo "[INFO] Downloading ${plugin}.zip ..."
  if ! curl -fsSL "$ZIP_URL" -o "$ZIP_FILE"; then
    echo "[ERROR] Failed to download ${ZIP_URL}"
    exit 1
  fi

  echo "[INFO] Unpacking ${plugin}.zip ..."
  rm -rf "${PLUGINS_DIR}/${plugin}"
  unzip -q "$ZIP_FILE" -d "$PLUGINS_DIR"
done

echo "[INFO] Plugin fetch complete."
echo "[INFO] Fetched plugins:"
for plugin in "${PLUGINS[@]}"; do
  version=$(python3 -c "import json; print(json.load(open('${PLUGINS_DIR}/${plugin}/plugin.json')).get('version','?'))" 2>/dev/null || echo "?")
  echo "       ${plugin} v${version}"
done
