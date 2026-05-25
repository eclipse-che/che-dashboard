#!/bin/bash

set -e
set -u

usage() {
  cat <<EOF
This script reverts changes made to enable local dashboard development flow against a remote Che Cluster.

EOF
}

parse_args() {
  while [[ "$#" -gt 0 ]]; do
    case $1 in
    '--help')
      usage
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown parameter is used: $1."
      usage
      exit 1
      ;;
    esac
    shift 1
  done
}

parse_args "$@"

DASHBOARD_FRONTEND=packages/dashboard-frontend

if [ -d $DASHBOARD_FRONTEND/lib/public/dashboard/devfile-registry ]; then
  echo "[INFO] Remove devfile registry"
  rm -r $DASHBOARD_FRONTEND/lib/public/dashboard/devfile-registry
fi

CHE_HOST=http://localhost:8080
CHE_NAMESPACE="${CHE_NAMESPACE:-eclipse-che}"
LOCALHOST_CALLBACK="$CHE_HOST/oauth/callback"

GATEWAY=$(kubectl get deployments.apps che-gateway -o=json --ignore-not-found -n $CHE_NAMESPACE)

if [[ -z "$GATEWAY" ||
  $(echo "$GATEWAY" | jq -e '.spec.template.spec.containers|any(.name == "oauth-proxy")') != "true" ]]; then
  echo 'Nothing needs to be patched.'
  echo 'Done.'
  exit 0
fi
echo 'Detected gateway with oauth-proxy...'

if [[ -n "$(oc whoami -t 2>/dev/null)" ]]; then
  # OpenShift native auth — remove localhost redirect URI from OAuthClient
  # Read client_id from the oauth-proxy ConfigMap (config is file-based, not CLI args)
  OAUTH_CLIENT=$(kubectl get configmap che-gateway-config-oauth-proxy -n "$CHE_NAMESPACE" \
    -o jsonpath='{.data.oauth-proxy\.cfg}' 2>/dev/null | \
    awk -F'"' '/client_id/{print $2}')

  if [[ -z "$OAUTH_CLIENT" ]]; then
    echo '[WARN] Could not find client_id in che-gateway-config-oauth-proxy ConfigMap. Nothing to revert.'
    exit 0
  fi

  IDX=$(oc get oauthclient "$OAUTH_CLIENT" -o json | \
    jq "[.redirectURIs[] | . == \"$LOCALHOST_CALLBACK\"] | index(true)")

  if [[ -n "$IDX" && "$IDX" != "null" ]]; then
    echo "Removing localhost redirect URI from OAuthClient '$OAUTH_CLIENT' at index $IDX..."
    oc patch oauthclient "$OAUTH_CLIENT" --type=json \
      -p="[{\"op\":\"remove\",\"path\":\"/redirectURIs/$IDX\"}]"
  else
    echo "localhost redirect URI not found in OAuthClient '$OAUTH_CLIENT'. Nothing to do."
  fi

  # Restore grantMethod to 'prompt'
  CURRENT_GRANT=$(oc get oauthclient "$OAUTH_CLIENT" -o jsonpath='{.grantMethod}' 2>/dev/null)
  if [[ "$CURRENT_GRANT" != "prompt" ]]; then
    echo "Restoring OAuthClient '$OAUTH_CLIENT': grantMethod → prompt"
    oc patch oauthclient "$OAUTH_CLIENT" --type=merge -p '{"grantMethod":"prompt"}'
  fi
  echo 'Done.'
  exit 0
fi

# Dex-based native auth (Minikube) — remove localhost redirect URI from dex configMap
if kubectl get configMaps/dex -o jsonpath="{.data['config\.yaml']}" -n dex | yq e ".staticClients[0].redirectURIs" - | grep $LOCALHOST_CALLBACK; then
  echo 'Removing localhost redirect URI from dex config map...'
  # Remove only the localhost entry that was added by prepare-local-run.sh.
  # All original cluster redirect URIs are preserved.
  UPDATED_CONFIG_YAML=$(kubectl get -n dex configMaps/dex -o jsonpath="{.data['config\.yaml']}" | yq e "del(.staticClients[0].redirectURIs[] | select(. == \"$LOCALHOST_CALLBACK\"))" -)
  dq_mid=\\\"
  yaml_esc="${UPDATED_CONFIG_YAML//\"/$dq_mid}"
  kubectl get configMaps/dex -n dex -o json | jq ".data[\"config.yaml\"] |= \"${yaml_esc}\"" | kubectl replace -f -

  # rollout Dex deployment
  echo 'Rolling out Dex deployment...'
  kubectl patch deployment/dex --patch "{\"spec\":{\"replicas\":0}}" -n dex
  echo 'Waiting 5 seconds to dex shut down...'
  sleep 5
  kubectl patch deployment/dex --patch "{\"spec\":{\"replicas\":1}}" -n dex
  echo 'Done.'
fi
