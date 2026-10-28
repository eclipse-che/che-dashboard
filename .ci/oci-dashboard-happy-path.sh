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
export ARTIFACT_DIR=${ARTIFACT_DIR:-"/tmp/devworkspace-smoke-test-artifacts"}
export DEVWORKSPACE_HAPPY_PATH="https://raw.githubusercontent.com/eclipse-che/che/main/tests/devworkspace-happy-path"

runTests() {
  # Deploy Eclipse Che with a custom dashboard image.
  # Note: do not create ${ARTIFACT_DIR}/e2e here — the remote test script
  # creates it and does not tolerate it existing beforehand.
  cat > /tmp/che-cr-patch.yaml <<EOF
apiVersion: org.eclipse.che/v2
spec:
  components:
    dashboard:
      deployment:
        containers:
          - image: '${CI_CHE_DASHBOARD_IMAGE}'
            imagePullPolicy: Always
EOF
  mkdir -p ${ARTIFACT_DIR}
  cp /tmp/che-cr-patch.yaml ${ARTIFACT_DIR}/che-cr-patch.yaml
  chectl server:deploy \
    --platform openshift \
    --che-operator-cr-patch-yaml /tmp/che-cr-patch.yaml \
    --batch \
    --telemetry=off

  # Run the centralized happy-path test from the che repository:
  # it provisions the OAuth user (works on standalone and HyperShift
  # hosted clusters), runs the SmokeTest user story against the deployed
  # Che instance and collects logs and test reports into the artifacts.
  export HAPPY_PATH_USERSTORY=SmokeTest
  export HAPPY_PATH_SUITE=test
  bash <(curl -s ${DEVWORKSPACE_HAPPY_PATH}/remote-launch.sh)
}

runTests

END=$(date +%s.%N)
echo "[INFO] Dashboard happy-path execution took $(echo "$END - $START" | bc) seconds."
