#!/bin/bash
#
# Copyright (c) 2019-2026 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
#

# Deploys Eclipse Che with the dashboard image built from this PR and runs
# the DevWorkspace happy-path test suite against it.
#
# The test itself (OAuth user provisioning, happy-path pod, log collection)
# is centralized in the eclipse-che/che repository and is fetched from there
# at runtime, so there is no vendored copy of it here anymore. The remote
# script supports both standalone OpenShift and HyperShift hosted clusters.

set -e
set -o pipefail
set -u
set -x

START=$(date +%s.%N)

export CHE_NAMESPACE=${CHE_NAMESPACE:-"eclipse-che"}
# Directory for the wrapper's own files (the CR patch, the downloaded
# launcher). Deliberately NOT exported and not named WORKDIR: the remote
# happy-path scripts reuse an exported WORKDIR and wipe it on startup
# (provision-openshift-oauth-user.sh and start-happypath-tests.sh both
# 'rm -rf' it), which would delete the patch and the launcher.
DEPLOY_DIR=${DEPLOY_DIR:-"/tmp/che-dashboard-happy-path"}
export ARTIFACT_DIR=${ARTIFACT_DIR:-"/tmp/devworkspace-smoke-test-artifacts"}
export DEVWORKSPACE_HAPPY_PATH="https://raw.githubusercontent.com/eclipse-che/che/main/tests/devworkspace-happy-path"

# Copy the CR patch into the artifacts once the test is over: the remote
# test scripts wipe and recreate ARTIFACT_DIR when they start, so the copy
# cannot be made before launching them. The trap fires on both success and
# failure paths.
trap 'mkdir -p ${ARTIFACT_DIR} && cp ${DEPLOY_DIR}/che-cr-patch.yaml ${ARTIFACT_DIR}/che-cr-patch.yaml' EXIT

runTests() {
  # Deploy Eclipse Che with a custom dashboard image.
  # Note: the CR patch is kept in DEPLOY_DIR: the remote test scripts wipe
  # and recreate both ARTIFACT_DIR and their own WORKDIR on startup, which
  # would delete any file the wrapper puts there beforehand. The copy in
  # the artifacts is made by the EXIT trap above, once the test is over.
  mkdir -p ${DEPLOY_DIR}
  cat > ${DEPLOY_DIR}/che-cr-patch.yaml <<EOF
apiVersion: org.eclipse.che/v2
spec:
  components:
    dashboard:
      deployment:
        containers:
          - image: '${CI_CHE_DASHBOARD_IMAGE}'
            imagePullPolicy: Always
EOF
  chectl server:deploy \
    --platform openshift \
    --che-operator-cr-patch-yaml ${DEPLOY_DIR}/che-cr-patch.yaml \
    --batch \
    --telemetry=off

  # Run the centralized happy-path test from the che repository:
  # it provisions the OAuth user (works on standalone and HyperShift
  # hosted clusters), runs the SmokeTest user story against the deployed
  # Che instance and collects logs and test reports into the artifacts.
  # Download the launcher to a file first: 'bash <(curl ...)' would hide
  # a fetch failure (set -e does not check process substitution exit
  # codes) and could execute an HTTP error body as a script.
  export HAPPY_PATH_USERSTORY=SmokeTest
  export HAPPY_PATH_SUITE=test
  curl -fsSL ${DEVWORKSPACE_HAPPY_PATH}/remote-launch.sh -o ${DEPLOY_DIR}/remote-launch.sh
  bash ${DEPLOY_DIR}/remote-launch.sh
}

runTests

END=$(date +%s.%N)
echo "[INFO] Dashboard happy-path execution took $(echo "$END - $START" | bc) seconds."
