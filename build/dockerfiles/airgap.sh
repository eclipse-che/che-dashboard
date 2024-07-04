#!/bin/sh
#
# Copyright (c) 2021-2024 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

set -e

init() {
  unset INDEX_JSON_PATH
  unset OUTPUT_DIR

  while [ "$#" -gt 0 ]; do
    case $1 in
      '--index-json-path'|'-i') INDEX_JSON_PATH=$2; shift 1;;
      '--output-dir'|'-o') OUTPUT_DIR=$2; shift 1;;
    esac
    shift 1
  done
}

run() {
  mkdir -p "${OUTPUT_DIR}"
  samplesNum=$(jq -r '. | length' "${INDEX_JSON_PATH}")

  i=0
  while [ "${i}" -lt "${samplesNum}" ]; do
    repoURL=$(jq -r '.['${i}'].url' "${INDEX_JSON_PATH}")

    if [ "${repoURL}" != "null" ]; then
      archiveFileName="$(echo "${repoURL#https://}" | cut -d '/' -f 2-3 | tr '/' '_').zip"
      echo "[INFO] Downloading ${repoURL} into ${archiveFileName}"

      # TODO Add token via GitHub Secret
      #          -H "Authorization: Bearer YOUR-TOKEN" \
      curl -L \
          -H "Accept: application/vnd.github+json" \
          -H "X-GitHub-Api-Version: 2022-11-28" \
          "${repoURL}"/zipball \
          --output "${OUTPUT_DIR}/${archiveFileName}"
      echo "$(jq '(.['${i}'].url) = '\"http://dashboard.CHECLUSTER_CR_NAMESPACE.svc:8080/dashboard/api/sample/download?path=${archiveFileName}\" ${INDEX_JSON_PATH})" > "${INDEX_JSON_PATH}"
    fi

    i=$((i+1))
  done
}

init "$@"
run
