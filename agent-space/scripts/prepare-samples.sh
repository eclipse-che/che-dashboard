#!/bin/sh
#
# Copyright (c) 2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

# Downloads the Getting Started sample manifests referenced by index.json next
# to the index, so that the registry serves local copies.
#
# This mirrors scripts/airgap.sh of the dashboard, but agent-sandbox samples are
# plain Kubernetes manifests rather than devfile + project zip pairs, so each
# entry resolves to a single YAML file.
#
# index.json is the only list of samples there is: an entry that is not in it is
# not downloaded, and a manifest left over from an entry that was removed is
# deleted again. Only https://github.com is supported, and only `kind: Sandbox`
# manifests are accepted - the frontend creates exactly that resource.
#
# Two fields of an entry's `defaults` are applied on top of what was downloaded:
# `image`, the image this copy runs, and `command`, a command that keeps the
# first container alive when upstream gave it none.

set -e

init() {
  unset SRC_INDEX_JSON_PATH
  unset OUTPUT_DIR

  while [ "$#" -gt 0 ]; do
    case $1 in
      '--src-index-json-path'|'-i') SRC_INDEX_JSON_PATH=$2; shift 1;;
      '--output-dir'|'-o') OUTPUT_DIR=$2; shift 1;;
      '--help'|'-h') usage; exit;;
    esac
    shift 1
  done

  if [ -z "${SRC_INDEX_JSON_PATH}" ]; then
    usage
    exit 1
  fi

  if [ -z "${OUTPUT_DIR}" ]; then
    OUTPUT_DIR=$(dirname "${SRC_INDEX_JSON_PATH}")
  fi

  for tool in jq git yq; do
    if ! command -v "${tool}" >/dev/null 2>&1; then
      echo "[ERROR] '${tool}' is required but was not found in PATH."
      exit 1
    fi
  done

  detectYqFlavor
}

# Two incompatible tools are both called `yq`: the Go one (mikefarah) and the
# Python jq wrapper (kislyuk). CI uses the Python one, Homebrew installs the Go
# one, so detect which is present instead of forcing contributors to swap it.
detectYqFlavor() {
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

yqEditInPlace() {
  if [ "${YQ_FLAVOR}" = 'go' ]; then
    yq -i "$1" "$2"
  else
    yq -riY "$1" "$2"
  fi
}

usage() {
  cat <<EOF
  Usage: $0 [OPTIONS]

  Options:
    --src-index-json-path, -i   Path to the JSON file listing the Agent Sandbox samples
    --output-dir, -o            Directory where the manifests are stored (defaults to the index.json directory)
    --help, -h                  Show this help message
EOF
}

run() {
  mkdir -p "${OUTPUT_DIR}"
  if [ ! "${SRC_INDEX_JSON_PATH}" = "${OUTPUT_DIR}/index.json" ]; then
    cp "${SRC_INDEX_JSON_PATH}" "${OUTPUT_DIR}/index.json"
  fi

  samplesNum=$(jq -r '. | length' "${SRC_INDEX_JSON_PATH}")
  if [ "${samplesNum}" -eq 0 ]; then
    echo "[WARN] ${SRC_INDEX_JSON_PATH} lists no samples, nothing to do."
    return
  fi

  workDir=$(mktemp -d)
  # shellcheck disable=SC2064
  trap "rm -rf '${workDir}'" EXIT

  expectedFiles=''
  i=0
  while [ "${i}" -lt "${samplesNum}" ]; do
    sampleId=$(jq -r '.['"${i}"'].id' "${SRC_INDEX_JSON_PATH}")
    url=$(jq -r '.['"${i}"'].source.url' "${SRC_INDEX_JSON_PATH}")
    ref=$(jq -r '.['"${i}"'].source.ref // "main"' "${SRC_INDEX_JSON_PATH}")
    path=$(jq -r '.['"${i}"'].source.path' "${SRC_INDEX_JSON_PATH}")
    image=$(jq -r '.['"${i}"'].defaults.image // ""' "${SRC_INDEX_JSON_PATH}")
    defaultCommand=$(jq -c '.['"${i}"'].defaults.command // empty' "${SRC_INDEX_JSON_PATH}")

    if [ "${url}" = "null" ] || [ "${path}" = "null" ]; then
      echo "[WARN] Sample '${sampleId}' has no source.url/source.path, skipping."
      i=$((i+1))
      continue
    fi

    # The index decides what gets cloned, so the single supported host has to be
    # checked here and not only documented at the top of the file.
    case "${url}" in
      https://github.com/*) ;;
      *)
        echo "[ERROR] Sample '${sampleId}' has source.url '${url}'; only https://github.com is supported."
        exit 1
        ;;
    esac

    # The manifest is written as `<id>.yaml`, which is also what the frontend
    # falls back to when the entry declares no filename. An entry that declares
    # a different one is a mistake in the index, not something to paper over by
    # rewriting the index - it is a tracked file and an input to this script.
    declaredFileName=$(jq -r '.['"${i}"'].manifest.filename // ""' "${SRC_INDEX_JSON_PATH}")
    if [ -n "${declaredFileName}" ] && [ "${declaredFileName}" != "${sampleId}.yaml" ]; then
      echo "[ERROR] Sample '${sampleId}' declares manifest.filename '${declaredFileName}', expected '${sampleId}.yaml'."
      exit 1
    fi

    echo "[INFO] Processing ${sampleId} (${url}/tree/${ref}/${path})"
    processSample "${sampleId}" "${url}" "${ref}" "${path}" "${image}" "${workDir}" "${defaultCommand}"
    expectedFiles="${expectedFiles} ${sampleId}.yaml"

    i=$((i+1))
  done

  pruneStaleManifests "${expectedFiles}"

  echo "[INFO] Wrote ${samplesNum} sample(s) to ${OUTPUT_DIR}"
}

# Dropping an entry from index.json has to drop its manifest too. The files are
# gitignored, so a stale one survives every checkout and keeps being served by
# the registry even though nothing links to it any more.
pruneStaleManifests() {
  expectedFiles=$1

  for existing in "${OUTPUT_DIR}"/*.yaml; do
    [ -f "${existing}" ] || continue

    fileName=$(basename "${existing}")
    case " ${expectedFiles} " in
      *" ${fileName} "*) ;;
      *)
        echo "[INFO] Removing ${fileName}, no longer listed in index.json"
        rm -f "${existing}"
        ;;
    esac
  done
}

# Clones a repository at most once per (url, ref) pair; the examples all live in
# the same upstream repository, so re-cloning per sample would be wasteful.
ensureClone() {
  repoURL=$1
  ref=$2
  workDir=$3

  cloneKey=$(echo "${repoURL}#${ref}" | tr -c 'a-zA-Z0-9' '-')
  CLONE_DIR="${workDir}/${cloneKey}"

  if [ ! -d "${CLONE_DIR}" ]; then
    echo "[INFO] Cloning ${repoURL} at ${ref}"
    git clone --branch "${ref}" --depth 1 "${repoURL}.git" "${CLONE_DIR}" >/dev/null 2>&1
  fi
}

processSample() {
  sampleId=$1
  repoURL=$2
  ref=$3
  path=$4
  image=$5
  workDir=$6
  defaultCommand=$7

  ensureClone "${repoURL}" "${ref}" "${workDir}"

  srcFile="${CLONE_DIR}/${path}"
  if [ ! -f "${srcFile}" ]; then
    echo "[ERROR] ${path} not found in ${repoURL} at ${ref}"
    exit 1
  fi

  manifestFileName="${sampleId}.yaml"
  destFile="${OUTPUT_DIR}/${manifestFileName}"
  cp "${srcFile}" "${destFile}"

  # Upstream examples are written for their own test scripts, which either
  # substitute a `${IMAGE}` placeholder or build an image locally and refer to
  # it by a tag that exists nowhere else. `defaults.image` in index.json is the
  # image this copy runs, so apply it to both shapes and leave the manifest
  # applyable as-is.
  if grep -q '\${IMAGE}' "${destFile}"; then
    if [ -z "${image}" ]; then
      echo "[ERROR] ${manifestFileName} contains \${IMAGE} but index.json has no defaults.image for '${sampleId}'."
      exit 1
    fi
    sed -e "s|\${IMAGE}|${image}|g" "${destFile}" > "${destFile}.tmp"
    mv "${destFile}.tmp" "${destFile}"
  elif [ -n "${image}" ]; then
    yqEditInPlace '.spec.podTemplate.spec.containers[].image = "'"${image}"'"' "${destFile}"
  fi

  # A sandbox pod runs with `restartPolicy: Never`, so the sandbox reaches
  # Completed - not Running - as soon as its container returns. Some upstream
  # examples run no command at all and rely on an image whose entrypoint exits
  # at once without a TTY, which makes for a sample that is created and then
  # immediately over. `defaults.command` in index.json keeps such a container
  # alive. It is only applied to the first container, the one the sandbox is
  # named after, and only when upstream left it without a command and without
  # args: an example that says what to run keeps saying it.
  if [ -n "${defaultCommand}" ]; then
    existing=$(yqRead '.spec.podTemplate.spec.containers[0] | (.command // .args) // ""' "${destFile}")
    if [ -z "${existing}" ] || [ "${existing}" = "null" ]; then
      yqEditInPlace '.spec.podTemplate.spec.containers[0].command = '"${defaultCommand}" "${destFile}"
    else
      echo "[INFO] ${manifestFileName} already runs a command upstream, keeping it."
    fi
  fi

  kind=$(yqRead '.kind' "${destFile}")
  if [ "${kind}" != "Sandbox" ]; then
    echo "[ERROR] ${manifestFileName} has kind '${kind}', expected 'Sandbox'."
    exit 1
  fi

  # The namespace is chosen by the user in the UI; keeping an upstream one here
  # would silently create the sandbox somewhere else.
  yqEditInPlace 'del(.metadata.namespace)' "${destFile}"
}

init "$@"
run
