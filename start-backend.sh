#!/bin/bash

# Simple script that helps to build local version to test easily
set -e
set -u

cd packages/dashboard-backend && yarn build && cd -

# Init Che Namespace with the default value if it's not set
CHE_NAMESPACE="${CHE_NAMESPACE:-eclipse-che}"

export CHE_HOST=http://localhost:3000
export KEYCLOAK_URL=$(oc get checluster -n $CHE_NAMESPACE eclipse-che -o=json | jq -r '.status.keycloakURL')

# Is still needed for DevWorkspace Client
# TODO Make DevWorkspace Client being able to work with KUBECONFIG env var as well
export KUBERNETES_SERVICE_PORT=6443
API=$(oc whoami --show-server)
API=${API##*://}
API=${API%%:*}
export KUBERNETES_SERVICE_HOST=${API}
export IN_CLUSTER=false

# guide backend to use the current cluster from kubeconfig
export LOCAL_RUN="true"
export KUBECONFIG=$HOME/.kube/config

node packages/dashboard-backend/lib/server.js
