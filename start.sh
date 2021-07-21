#!/bin/bash
# Simple script that helps to build local version to test easily
set -e
set -u

function emulate_in_cluster() {
  export KUBERNETES_SERVICE_PORT=6443                       
  API=$(oc whoami --show-server)
  API=${API##*://}
  API=${API%%:*}
  export KUBERNETES_SERVICE_HOST=${API}
}

cd packages/dashboard-backend && yarn build && cd -

export CHE_HOST=http://localhost:3000
export KEYCLOAK_URL=$(oc get checluster -n eclipse-che eclipse-che -o=json | jq -r '.status.keycloakURL')
export IN_CLUSTER=false
emulate_in_cluster

node packages/dashboard-backend/lib/server.js
