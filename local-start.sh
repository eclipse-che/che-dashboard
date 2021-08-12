#!/bin/bash

# Simple script that helps to build local version to test easily
set -e
set -u

# TODO execute frontend build if lib does not exist
cd packages/dashboard-backend && yarn build && cd -

# Init Che Namespace with the default value if it's not set
CHE_NAMESPACE="${CHE_NAMESPACE:-eclipse-che}"

export CHE_HOST=http://localhost:8080
CHE_URL=$(oc get checluster -n $CHE_NAMESPACE eclipse-che -o=json | jq -r '.status.cheURL')

# guide backend to use the current cluster from kubeconfig
export LOCAL_RUN="true"
export KUBECONFIG=$HOME/.kube/config

node packages/dashboard-backend/lib/server.js --publicFolder ../../dashboard-frontend/lib  --cheServerUpstream $CHE_URL
