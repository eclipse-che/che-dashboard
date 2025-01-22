#!/bin/sh
#
# Copyright (c) 2021-2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

# The script is used to download resources (projects and devfiles)
# Only https://github.com is supported for now.

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
    exit
  fi

  if [ -z "${OUTPUT_DIR}" ]; then
    OUTPUT_DIR=$(dirname "${SRC_INDEX_JSON_PATH}")
  fi
}

usage() {
  cat <<EOF
  Usage: $0 [OPTIONS]

  Options:
    --src-index-json-path, -i   Path to the JSON file containing the list of samples
    --output-dir, -o            Directory where the downloaded resources will be stored
    --help, -h                  Show this help message
EOF
}

run() {
  mkdir -p "${OUTPUT_DIR}"
  if [ ! "${SRC_INDEX_JSON_PATH}" = "${OUTPUT_DIR}/index.json" ]; then
    cp "${SRC_INDEX_JSON_PATH}" "${OUTPUT_DIR}/index.json"
  fi

  samplesNum=$(jq -r '. | length' "${SRC_INDEX_JSON_PATH}")

  i=0
  while [ "${i}" -lt "${samplesNum}" ]; do
    url=$(jq -r '.['${i}'].url' "${SRC_INDEX_JSON_PATH}")
    sampleId=$(jq -r '.['${i}'].id' "${SRC_INDEX_JSON_PATH}")

    if [ "${url}" != "null" ]; then
      strippedURL="${url#https://github.com/}"
      organization="$(echo "${strippedURL}" | cut -d '/' -f 1)"
      repository="$(echo "${strippedURL}" | cut -d '/' -f 2)"
      branch="$(echo "${strippedURL}" | cut -d '/' -f 4)"

      if [ -n "${branch}" ]; then
        archiveFileName="${organization}-${repository}-${branch}.zip"
        devfileFileName="${organization}-${repository}-${branch}-devfile.yaml"
      else
        archiveFileName="${organization}-${repository}.zip"
        devfileFileName="${organization}-${repository}-devfile.yaml"
      fi

      echo "[INFO] Processing ${url}"
      processSample \
        "${archiveFileName}" \
        "${devfileFileName}" \
        "${url}" \
        "${branch}" \
        "${sampleId}" \
        "${repository}"
    fi

    i=$((i+1))
  done
}

processSample() {
  archiveFileName=$1
  devfileFileName=$2
  repoURL=$3
  branch=$4
  sampleId=$5
  repository=$6

  # Remove '/tree/<branch>' from the URL if present
  cleanRepoURL=$(echo "${repoURL}" | sed -E 's/\/tree\/[^/]+$//')

  tempDir="${OUTPUT_DIR}/${repository}-clone"

  echo "[INFO] Cloning ${cleanRepoURL} branch ${branch} into ${tempDir}"
  if [ -n "${branch}" ]; then
    git clone --branch "${branch}" --depth 1 "${cleanRepoURL}.git" "${tempDir}"
  else
    git clone --depth 1 "${cleanRepoURL}.git" "${tempDir}"
  fi

  # Archive the repository
  echo "[INFO] Zipping cloned repository into ${archiveFileName}"
  # Remove the .git and .github folders
  rm -rf "${tempDir}/.git" "${tempDir}/.github"
  (cd "${tempDir}" && zip -rq "${OUTPUT_DIR}/${archiveFileName}" .)

  # Copy devfile.yaml if it exists
  if [ -f "${tempDir}/devfile.yaml" ]; then
    echo "[INFO] Found devfile.yaml. Copying to ${devfileFileName}"
    cp "${tempDir}/devfile.yaml" "${OUTPUT_DIR}/${devfileFileName}"
  else
    echo "[WARN] devfile.yaml not found in ${tempDir}"
  fi

  # Cleanup
  rm -rf "${tempDir}"

  # Update the index.json
  devfileLink="CHE_DASHBOARD_INTERNAL_URL/dashboard/api/airgap-sample/devfile/download?id=${sampleId}"
  projectLink="CHE_DASHBOARD_INTERNAL_URL/dashboard/api/airgap-sample/project/download?id=${sampleId}"

  # shellcheck disable=SC2005
  echo "$(cat "${OUTPUT_DIR}/index.json" | \
    jq '(.['${i}'].url) = '\"${devfileLink}\" | \
    jq '(.['${i}'].project.zip.filename) = '\"${archiveFileName}\" | \
    jq '(.['${i}'].devfile.filename) = '\"${devfileFileName}\")" > "${OUTPUT_DIR}/index.json"

  # Update the devfile with the project link
  yq -riY '.projects=[{name: "'${repository}'", zip: {location: "'${projectLink}'"}}]' "${OUTPUT_DIR}/${devfileFileName}"
}

init "$@"
run
