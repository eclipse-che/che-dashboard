#!/bin/bash
#
# Copyright (c) 2019-2022 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

# Catch the finish of the job and write logs in artifacts.


export CI_CHE_DASHBOARD_IMAGE="quay.io/eclipse/che-dashboard:next"
export CHE_REPO_BRANCH="main"
export CHE_NAMESPACE="${CHE_NAMESPACE:-eclipse-che}"
export DEVWORKSPACE_HAPPY_PATH="https://raw.githubusercontent.com/eclipse/che/${CHE_REPO_BRANCH}/tests/devworkspace-happy-path"

source <(curl -s ${DEVWORKSPACE_HAPPY_PATH}/common.sh)

#trap 'collectLogs $?' EXIT SIGINT

setupCheDashboard(){
  # Deploy Eclipse Che with a custom dashboard image
  cat > /tmp/che-cr-patch.yaml <<EOF
spec:
  components:
    dashboard:
      deployment:
        containers:
          - image: ${CI_CHE_DASHBOARD_IMAGE}
EOF
  chectl server:deploy \
    --platform openshift \
    --che-operator-cr-patch-yaml /tmp/che-cr-patch.yaml \
    --batch \
    --telemetry=off
}

setUpTestPod(){
  echo '------------------------------------------'
  KUBE_ADMIN_PASSWORD="$(cat $KUBEADMIN_PASSWORD_FILE)"

  echo '................yq version...................'
  yq --version

  echo '................jq version...................'
  jq --version

  echo '................oc version...................'
  oc version

  echo '---------------------env.CHE_NAMESPACE---------------------'
  echo $CHE_NAMESPACE


  ECLIPSE_CHE_URL=http://$(oc get route -n "${CHE_NAMESPACE}" che -o jsonpath='{.status.ingress[0].host}')

  echo '---------------------env.ECLIPSE_CHE_URL---------------------'
  echo $ECLIPSE_CHE_URL

  echo '--------------- KUBE-PASSWORD -------------------'
  echo $KUBE_ADMIN_PASSWORD

  yq -iy  '(.spec.containers[].env[]? | select(.name=="BASE_URL")).value = env.ECLIPSE_CHE_URL' .ci/resources/dashboard-pod.yaml
  yq -iy  '(.spec.containers[].env[]? | select(.value=="crw4ever!")).value = env.KUBE_ADMIN_PASSWORD' .ci/resources/dashboard-pod.yaml

  sleep 1800

  echo '---------------pupetter-test-pod---------------:'
  cat .ci/resources/dashboard-pod.yaml
  echo '---------------end-of-pupetter-test-pod---------------'
  oc apply -f .ci/resources/dashboard-pod.yaml
 }


setupCheDashboard
setUpTestPod