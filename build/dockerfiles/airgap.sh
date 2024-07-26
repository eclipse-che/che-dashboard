#!/bin/sh
#
# Copyright (c) 2021-2024 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

# Script is used to download repositories specified in a JSON file
# and save them as zip files in a specified output directory.
# It also updates the URLs in the JSON file to point to the local zip files.
# This is typically used in an air-gapped environment where internet access is not available.

set -e

init() {
  unset SAMPLES_JSON_PATH
  unset OUTPUT_DIR

  while [ "$#" -gt 0 ]; do
    case $1 in
      '--samples-json-path'|'-s') SAMPLES_JSON_PATH=$2; shift 1;;
      '--output-dir'|'-o') OUTPUT_DIR=$2; shift 1;;
    esac
    shift 1
  done
}

run() {
  mkdir -p "${OUTPUT_DIR}"
  samplesNum=$(jq -r '. | length' "${SAMPLES_JSON_PATH}")

  i=0
  while [ "${i}" -lt "${samplesNum}" ]; do
    repoURL=$(jq -r '.['${i}'].url' "${SAMPLES_JSON_PATH}")

    if [ "${repoURL}" != "null" ]; then
      strippedURL="${repoURL#https://github.com/}"
      organization="$(echo "${strippedURL}" | cut -d '/' -f 1)"
      repository="$(echo "${strippedURL}" | cut -d '/' -f 2)"
      ref="$(echo "${strippedURL}" | cut -d '/' -f 4)"

      if [ -n "${ref}" ]; then
        archiveFileName="${organization}-${repository}-${ref}.zip"
        apiRequestLink="https://api.github.com/repos/${organization}/${repository}/zipball/${ref}"
      else
        archiveFileName="${organization}-${repository}.zip"
        apiRequestLink="https://api.github.com/repos/${organization}/${repository}/zipball"
      fi

      echo "[INFO] Downloading ${repoURL} into ${archiveFileName}"

      curl -L \
          -H "Accept: application/vnd.github+json" \
          -H "X-GitHub-Api-Version: 2022-11-28" \
          "${apiRequestLink}" \
          -o "${OUTPUT_DIR}/${archiveFileName}"

      # DASHBOARD_SERVICE_URL is a placeholder that will be replaced
      # by the actual URL in entrypoint.sh
      echo "$(jq '(.['${i}'].url) = '\"DASHBOARD_SERVICE_URL/dashboard/api/airgap-sample/download?filename=${archiveFileName}\" ${SAMPLES_JSON_PATH})" > "${SAMPLES_JSON_PATH}"
    fi

    i=$((i+1))
  done
}

init "$@"
run
