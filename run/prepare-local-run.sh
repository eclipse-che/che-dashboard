#!/bin/bash

set -e
set -u

usage() {
  cat <<EOF
This script add changes made to enable local dashboard development flow against a remote Che Cluster.

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

if [[ "$(uname)" == "Linux" ]]; then
    YQ_FLAGS="-r"
else
    YQ_FLAGS="e"
fi

CHE_NAMESPACE="${CHE_NAMESPACE:-eclipse-che}"
CHE_SELF_SIGNED_MOUNT_PATH="${CHE_SELF_SIGNED_MOUNT_PATH:-$(pwd)/run/public-certs}"

DASHBOARD_POD_NAME=$(kubectl get pods -n "$CHE_NAMESPACE" --field-selector=status.phase=Running -o=custom-columns=:metadata.name | grep dashboard | head -1)

if [[ -z "$DASHBOARD_POD_NAME" ]]; then
  echo "[ERROR] No running dashboard pod found in namespace $CHE_NAMESPACE"
  exit 1
fi

kubectl describe pod "$DASHBOARD_POD_NAME" -n "$CHE_NAMESPACE" > run/.che-dashboard-pod

CHECLUSTER_CR_NAME=$(grep -o 'CHECLUSTER_CR_NAME:.*' run/.che-dashboard-pod | grep -o '\S*$')

kubectl get checluster -n "$CHE_NAMESPACE" "$CHECLUSTER_CR_NAME" -o=json > run/.custom-resources

rm -rf "$CHE_SELF_SIGNED_MOUNT_PATH"
mkdir -p "$CHE_SELF_SIGNED_MOUNT_PATH"

# copy certificate from the dashboard pod
kubectl cp $CHE_NAMESPACE/$DASHBOARD_POD_NAME:/public-certs/che-self-signed/..data/ca.crt "$CHE_SELF_SIGNED_MOUNT_PATH/ca.crt"

CHE_HOST=http://localhost:8080
LOCALHOST_CALLBACK="$CHE_HOST/oauth/callback"

GATEWAY=$(kubectl get deployments.apps -n "$CHE_NAMESPACE" che-gateway --ignore-not-found -o=json | jq -e '.spec.template.spec.containers|any(.name == "oauth-proxy")')

if [[ -n "$(oc whoami -t 2>/dev/null)" ]] && [ "$GATEWAY" == "true" ]; then
  # OpenShift native auth — patch OAuthClient to allow localhost redirect URI
  echo 'Detected OpenShift native auth mode. Patching OAuthClient...'

  # Read client_id from the oauth-proxy ConfigMap (config is file-based, not CLI args)
  OAUTH_CLIENT=$(kubectl get configmap che-gateway-config-oauth-proxy -n "$CHE_NAMESPACE" \
    -o jsonpath='{.data.oauth-proxy\.cfg}' 2>/dev/null | \
    awk -F'"' '/client_id/{print $2}')

  if [[ -z "$OAUTH_CLIENT" ]]; then
    echo '[ERROR] Could not find client_id in che-gateway-config-oauth-proxy ConfigMap.'
    exit 1
  fi
  echo "OAuthClient: $OAUTH_CLIENT"

  # Idempotent: only add redirect URI if not already present
  EXISTING=$(oc get oauthclient "$OAUTH_CLIENT" -o json | jq -r '.redirectURIs[]' 2>/dev/null | grep -F "$LOCALHOST_CALLBACK" || true)
  if [[ -n "$EXISTING" ]]; then
    echo "localhost redirect URI already present in OAuthClient '$OAUTH_CLIENT'. Skipping patch."
  else
    echo "Patching OAuthClient '$OAUTH_CLIENT': adding $LOCALHOST_CALLBACK"
    oc patch oauthclient "$OAUTH_CLIENT" --type=json \
      -p="[{\"op\":\"add\",\"path\":\"/redirectURIs/-\",\"value\":\"$LOCALHOST_CALLBACK\"}]"
  fi

  # Switch grantMethod to 'auto' so the OAuth flow completes without a manual
  # "Grant access?" confirmation screen after login.
  CURRENT_GRANT=$(oc get oauthclient "$OAUTH_CLIENT" -o jsonpath='{.grantMethod}' 2>/dev/null)
  if [[ "$CURRENT_GRANT" != "auto" ]]; then
    echo "Patching OAuthClient '$OAUTH_CLIENT': grantMethod → auto"
    oc patch oauthclient "$OAUTH_CLIENT" --type=merge -p '{"grantMethod":"auto"}'
  fi
  echo 'Done.'
  exit 0
fi

if [ "$GATEWAY" == "true" ]; then
  # Dex-based native auth (Minikube) — patch dex configMap
  echo 'Detected gateway with oauth-proxy. Running in native auth mode.'
  echo 'Looking for staticClient for local start'
  if kubectl get -n dex configMaps/dex -o jsonpath="{.data['config\.yaml']}" | yq ${YQ_FLAGS} ".staticClients[0].redirectURIs" - | grep $LOCALHOST_CALLBACK; then
    echo 'Found the staticClient for localStart'
  else
    echo 'Patching dex config map...'
    # Append the localhost callback URL — keeps the existing cluster redirect URIs intact
    # so the che-operator does not detect a breaking change and reconcile immediately.
    UPDATED_CONFIG_YAML=$(kubectl get -n dex configMaps/dex -o jsonpath="{.data['config\.yaml']}" | yq ${YQ_FLAGS} ".staticClients[0].redirectURIs += [\"$LOCALHOST_CALLBACK\"]" -)
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
fi
