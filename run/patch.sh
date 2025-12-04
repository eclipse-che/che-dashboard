#!/bin/bash
#
# Build, Push, and Patch Dashboard Image
#
# This script builds a single-architecture dashboard image, pushes it to a registry,
# and patches the CheCluster to use the new image.
#
# For multi-architecture builds, use ./run/build-multiarch.sh instead.
# See run/MULTIARCH_BUILD.md for multi-arch documentation.
#
# Usage:
#   export IMAGE_REGISTRY_HOST=quay.io
#   export IMAGE_REGISTRY_USER_NAME=your-username
#   ./run/patch.sh
#
# Environment Variables:
#   IMAGE_REGISTRY_HOST     - Container registry host (required)
#   IMAGE_REGISTRY_USER_NAME - Registry username/namespace (required)
#   CHE_NAMESPACE           - Kubernetes namespace (default: eclipse-che)
#   CHE_DASHBOARD_IMAGE     - Use existing image instead of building (optional)
#

set -e

# If CHE_DASHBOARD_IMAGE is already set, skip building and just patch
if [[ -n "$CHE_DASHBOARD_IMAGE" ]]; then
  echo "[INFO] Using existing image: ${CHE_DASHBOARD_IMAGE}"
else
  # Validate required environment variables for building
  if [[ -z "$IMAGE_REGISTRY_HOST" ]]; then
    echo "[ERROR] Environment variable IMAGE_REGISTRY_HOST is not set."
    exit 1
  fi

  if [[ -z "$IMAGE_REGISTRY_USER_NAME" ]]; then
    echo "[ERROR] Environment variable IMAGE_REGISTRY_USER_NAME is not set."
    exit 1
  fi

  TAG=$(git branch --show-current)'_'$(date '+%Y_%m_%d_%H_%M_%S')
  CHE_DASHBOARD_IMAGE="${IMAGE_REGISTRY_HOST}/${IMAGE_REGISTRY_USER_NAME}/che-dashboard:${TAG}"

  echo "[INFO] Building image '${CHE_DASHBOARD_IMAGE}'..."
  "${PWD}/scripts/container_tool.sh" build . -f build/dockerfiles/skaffold.Dockerfile -t $CHE_DASHBOARD_IMAGE

  echo "[INFO] Pushing image '${CHE_DASHBOARD_IMAGE}'..."
  "${PWD}/scripts/container_tool.sh" push $CHE_DASHBOARD_IMAGE
fi

echo "[INFO] Patching CheCluster with image '${CHE_DASHBOARD_IMAGE}'..."

CHE_NAMESPACE="${CHE_NAMESPACE:-eclipse-che}"
DASHBOARD_POD_NAME=$(kubectl get pods -n $CHE_NAMESPACE -o=custom-columns=:metadata.name | grep dashboard)
CHECLUSTER_CR_NAME=$(kubectl exec $DASHBOARD_POD_NAME -n $CHE_NAMESPACE -- printenv CHECLUSTER_CR_NAME)
PREVIOUS_CHE_DASHBOARD_IMAGE=$(kubectl get checluster -n $CHE_NAMESPACE $CHECLUSTER_CR_NAME -o=json | jq -r '.spec.components.dashboard.deployment.containers[0].image')

if [ "$PREVIOUS_CHE_DASHBOARD_IMAGE" == "null" ]; then
  kubectl patch -n "$CHE_NAMESPACE" "checluster/$CHECLUSTER_CR_NAME" --type=json -p="[{\"op\": \"replace\", \"path\": \"/spec/components/dashboard\", \"value\": {deployment: {containers: [{image: \"${CHE_DASHBOARD_IMAGE}\", name: che-dasboard}]}}}]"
else
  kubectl patch -n "$CHE_NAMESPACE" "checluster/$CHECLUSTER_CR_NAME" --type=json -p="[{\"op\": \"replace\", \"path\": \"/spec/components/dashboard/deployment/containers/0/image\", \"value\": ${CHE_DASHBOARD_IMAGE}}]"
fi

echo "[INFO] Done. Dashboard image updated to: ${CHE_DASHBOARD_IMAGE}"
