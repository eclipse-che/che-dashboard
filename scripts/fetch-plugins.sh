#!/usr/bin/env bash
#
# Copyright (c) 2018-2026 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Fetches Eclipse Che Dashboard plugins and unpacks them into plugins/.
#
# Resolution order:
#   1. LOCAL_PLUGINS set  → copy from local directory (dev mode)
#   2. PLUGINS_REF is a release tag and ZIPs exist → download from GitHub Releases
#   3. Fallback           → git clone the repo at PLUGINS_REF (or main)
#
# Usage:
#   bash scripts/fetch-plugins.sh
#   bash scripts/fetch-plugins.sh --ref v1.2.0
#
# Environment Variables:
#   PLUGINS_REPO   - GitHub repository (default: olexii4/che-dashboard-plugins)
#   PLUGINS_REF    - Release tag or git ref (default: latest → main branch)
#   PLUGINS_DIR    - Target directory (default: $PWD/plugins)
#   LOCAL_PLUGINS  - Path to a local clone; skips all network steps when set
#   PLUGINS_LIST   - JSON array of plugin names to install, e.g. '["ai-selector"]'
#                    When unset, all plugins from the release/clone are installed.
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

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
mkdir -p "$PLUGINS_DIR"

# ── Helper: copy all plugin dirs from a source path ──────────────────────────
copy_plugins_from_dir() {
  local src="$1"
  for d in "$src"/*/; do
    [ -f "${d}plugin.json" ] || continue
    local name
    name=$(basename "$d")
    echo "[INFO] Installing plugin: $name"
    rm -rf "${PLUGINS_DIR}/${name}"
    cp -r "$d" "${PLUGINS_DIR}/${name}"
  done
}

# ── Helper: print installed plugin versions ───────────────────────────────────
print_versions() {
  for d in "${PLUGINS_DIR}"/*/; do
    [ -f "${d}plugin.json" ] || continue
    local name version
    name=$(basename "$d")
    version=$(python3 -c "import json; print(json.load(open('${d}plugin.json')).get('version','?'))" 2>/dev/null || echo "?")
    echo "       ${name} v${version}"
  done
}

# ── Mode 1: local clone ───────────────────────────────────────────────────────
if [[ -n "$LOCAL_PLUGINS" ]]; then
  echo "[INFO] LOCAL_PLUGINS set — copying from: $LOCAL_PLUGINS"
  [[ -d "$LOCAL_PLUGINS" ]] || { echo "[ERROR] LOCAL_PLUGINS not found: $LOCAL_PLUGINS"; exit 1; }
  copy_plugins_from_dir "$LOCAL_PLUGINS"
  echo "[INFO] Done."; print_versions; exit 0
fi

# ── Mode 2: GitHub Releases ───────────────────────────────────────────────────
PLUGINS=()
if [[ -z "${PLUGINS_LIST:-}" ]]; then
  if [[ "$PLUGINS_REF" == "latest" ]]; then
    API_URL="https://api.github.com/repos/${PLUGINS_REPO}/releases/latest"
  else
    API_URL="https://api.github.com/repos/${PLUGINS_REPO}/releases/tags/${PLUGINS_REF}"
  fi
  echo "[INFO] Checking for GitHub Release: ${PLUGINS_REF}"
  while IFS= read -r line; do [[ -n "$line" ]] && PLUGINS+=("$line"); done \
    < <(curl -sSL "$API_URL" | jq -r '.assets[]?.name | select(endswith(".zip")) | sub("\\.zip$"; "")' 2>/dev/null || true)
else
  while IFS= read -r line; do [[ -n "$line" ]] && PLUGINS+=("$line"); done \
    < <(echo "$PLUGINS_LIST" | jq -r '.[]')
fi

if [[ ${#PLUGINS[@]} -gt 0 ]]; then
  BASE_URL="https://github.com/${PLUGINS_REPO}/releases/download/${PLUGINS_REF}"
  echo "[INFO] Downloading from release: ${BASE_URL}"
  for plugin in "${PLUGINS[@]}"; do
    ZIP_FILE="${TMP_DIR}/${plugin}.zip"
    echo "[INFO] Downloading ${plugin}.zip ..."
    if ! curl -fsSL "${BASE_URL}/${plugin}.zip" -o "$ZIP_FILE"; then
      echo "[ERROR] Failed to download ${BASE_URL}/${plugin}.zip"; exit 1
    fi
    echo "[INFO] Unpacking ${plugin}.zip ..."
    rm -rf "${PLUGINS_DIR}/${plugin}"
    unzip -q "$ZIP_FILE" -d "$PLUGINS_DIR"
  done
  echo "[INFO] Done."; print_versions; exit 0
fi

# ── Mode 3: git clone fallback ────────────────────────────────────────────────
GIT_REF="$PLUGINS_REF"
[[ "$GIT_REF" == "latest" ]] && GIT_REF="main"
echo "[INFO] No GitHub Release found — cloning ${PLUGINS_REPO}@${GIT_REF}"
git clone --depth 1 --branch "$GIT_REF" \
  "https://github.com/${PLUGINS_REPO}.git" "${TMP_DIR}/plugins-src"
copy_plugins_from_dir "${TMP_DIR}/plugins-src"
echo "[INFO] Done."; print_versions
