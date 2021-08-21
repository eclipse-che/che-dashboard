#!/bin/bash

# Simple script that helps to build local version to test easily
set -e
set -u

DASHBOARD_FRONTEND=packages/dashboard-frontend
DASHBOARD_BACKEND=packages/dashboard-backend

yarn --cwd $DASHBOARD_BACKEND

if [ ! -f $DASHBOARD_FRONTEND/lib ]; then
    yarn --cwd $DASHBOARD_FRONTEND build
fi

# Init Che Namespace with the default value if it's not set
CHE_NAMESPACE="${CHE_NAMESPACE:-eclipse-che}"

export CHE_HOST=http://localhost:8080
CHE_URL=$(oc get checluster -n $CHE_NAMESPACE eclipse-che -o=json | jq -r '.status.cheURL')

# guide backend to use the current cluster from kubeconfig
export LOCAL_RUN="true"
export KUBECONFIG=$HOME/.kube/config

yarn --cwd $DASHBOARD_BACKEND start:debug --publicFolder ../../dashboard-frontend/lib  --cheApiUpstream $CHE_URL
