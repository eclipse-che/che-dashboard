#!/bin/sh
#
# Copyright (c) 2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

# Verifies that every sample listed in index.json has a local manifest next to
# it and that the manifest is a parsable `kind: Sandbox` resource.
#
# Run it in CI after prepare-samples.sh, and before building the frontend
# bundle: the frontend fails at runtime, not at build time, on a broken index.

set -e

init() {
  unset SRC_INDEX_JSON_PATH

  while [ "$#" -gt 0 ]; do
    case $1 in
      '--src-index-json-path'|'-i') SRC_INDEX_JSON_PATH=$2; shift 1;;
      '--help'|'-h') usage; exit;;
    esac
    shift 1
  done

  if [ -z "${SRC_INDEX_JSON_PATH}" ]; then
    usage
    exit 1
  fi

  for tool in jq yq; do
    if ! command -v "${tool}" >/dev/null 2>&1; then
      echo "[ERROR] '${tool}' is required but was not found in PATH."
      exit 1
    fi
  done

  # See the same helper in prepare-samples.sh: `yq` is either the Go tool or the
  # Python jq wrapper, and their flags differ.
  if yq --version 2>&1 | grep -q 'mikefarah'; then
    YQ_FLAVOR='go'
  else
    YQ_FLAVOR='python'
  fi
}

yqRead() {
  if [ "${YQ_FLAVOR}" = 'go' ]; then
    yq "$1" "$2"
  else
    yq -r "$1" "$2"
  fi
}

usage() {
  cat <<EOF
  Usage: $0 [OPTIONS]

  Options:
    --src-index-json-path, -i   Path to the JSON file listing the Agent Sandbox samples
    --help, -h                  Show this help message
EOF
}

run() {
  baseDir=$(dirname "${SRC_INDEX_JSON_PATH}")
  samplesNum=$(jq -r '. | length' "${SRC_INDEX_JSON_PATH}")
  failures=0

  i=0
  while [ "${i}" -lt "${samplesNum}" ]; do
    sampleId=$(jq -r '.['"${i}"'].id' "${SRC_INDEX_JSON_PATH}")
    displayName=$(jq -r '.['"${i}"'].displayName // ""' "${SRC_INDEX_JSON_PATH}")
    # Same fallback the frontend applies, so an entry that omits the filename
    # is checked against the file prepare-samples.sh actually wrote.
    fileName=$(jq -r '.['"${i}"'].manifest.filename // (.['"${i}"'].id + ".yaml")' "${SRC_INDEX_JSON_PATH}")

    if [ -z "${displayName}" ]; then
      echo "[FAIL] ${sampleId}: displayName is missing."
      failures=$((failures+1))
    fi

    if [ ! -f "${baseDir}/${fileName}" ]; then
      echo "[FAIL] ${sampleId}: ${fileName} does not exist in ${baseDir}, run prepare-samples.sh first."
      failures=$((failures+1))
    else
      kind=$(yqRead '.kind' "${baseDir}/${fileName}" 2>/dev/null || echo "")
      if [ "${kind}" != "Sandbox" ]; then
        echo "[FAIL] ${sampleId}: ${fileName} has kind '${kind}', expected 'Sandbox'."
        failures=$((failures+1))
      else
        echo "[OK]   ${sampleId} -> ${fileName}"
      fi
    fi

    i=$((i+1))
  done

  if [ "${failures}" -gt 0 ]; then
    echo "[ERROR] ${failures} sample check(s) failed."
    exit 1
  fi

  echo "[INFO] All ${samplesNum} sample(s) are valid."
}

init "$@"
run
