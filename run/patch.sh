#!/bin/bash

set -e

if [[ -z "$IMAGE_REGISTRY_HOST" ]]; then
  echo 'Environment variable IMAGE_REGISTRY_HOST does not found.'
  exit 0
fi

if [[ -z "$IMAGE_REGISTRY_USER_NAME" ]]; then
  echo 'Environment variable IMAGE_REGISTRY_USER_NAME does not found.'
  exit 0
fi

TAG=$(git branch --show-current)'_'$(date '+%Y_%m_%d_%H_%M_%S')
CHE_DASHBOARD_IMAGE="${IMAGE_REGISTRY_HOST}/${IMAGE_REGISTRY_USER_NAME}/che-dashboard:${TAG}"

# Detect container engine using container_tool.sh
echo "[INFO] Detecting container engine..."
CONTAINER_ENGINE=$("${PWD}/scripts/container_tool.sh" detect)

if [ $? -ne 0 ] || [ -z "$CONTAINER_ENGINE" ]; then
  echo "[ERROR] Failed to detect container engine."
  echo "[ERROR] Please install Docker or Podman and ensure it's running."
  exit 1
fi

echo "[INFO] Using container engine: ${CONTAINER_ENGINE}"

# Determine if multiarch build is requested
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
MULTIARCH="${MULTIARCH:-true}"

if [[ "$MULTIARCH" == "true" ]]; then
  echo "[INFO] Building multi-architecture image for platforms: ${PLATFORMS}"
  
  if [[ "$CONTAINER_ENGINE" == "docker" ]]; then
    # Docker buildx for multiarch
    echo "[INFO] Setting up Docker buildx..."
    
    # Create buildx builder if it doesn't exist
    if ! docker buildx ls | grep -q multiarch-builder; then
      echo "[INFO] Creating multiarch-builder..."
      docker buildx create --name multiarch-builder --use --platform "${PLATFORMS}"
    else
      echo "[INFO] Using existing multiarch-builder..."
      docker buildx use multiarch-builder
    fi
    
    # Bootstrap the builder
    docker buildx inspect --bootstrap
    
    # Build and push in one command for multiarch
    echo "[INFO] Building and pushing multi-arch image '${CHE_DASHBOARD_IMAGE}'..."
    docker buildx build . \
      -f build/dockerfiles/skaffold.Dockerfile \
      --platform "${PLATFORMS}" \
      -t "${CHE_DASHBOARD_IMAGE}" \
      --push
      
  elif [[ "$CONTAINER_ENGINE" == "podman" ]]; then
    # Podman multiarch build
    echo "[INFO] Building and pushing multi-arch image '${CHE_DASHBOARD_IMAGE}'..."
    
    # Create manifest
    podman manifest create "${CHE_DASHBOARD_IMAGE}" || true
    
    # Build for each platform
    IFS=',' read -ra PLATFORM_ARRAY <<< "$PLATFORMS"
    for PLATFORM in "${PLATFORM_ARRAY[@]}"; do
      echo "[INFO] Building for platform: ${PLATFORM}"
      podman build . \
        -f build/dockerfiles/skaffold.Dockerfile \
        --platform "${PLATFORM}" \
        --manifest "${CHE_DASHBOARD_IMAGE}"
    done
    
    # Push manifest
    echo "[INFO] Pushing manifest..."
    podman manifest push "${CHE_DASHBOARD_IMAGE}" "docker://${CHE_DASHBOARD_IMAGE}"
  fi
  
else
  # Single architecture build (legacy mode)
  echo "[INFO] Building single-architecture image '${CHE_DASHBOARD_IMAGE}'..."
  
  "${PWD}/scripts/container_tool.sh" build . -f build/dockerfiles/skaffold.Dockerfile -t $CHE_DASHBOARD_IMAGE
  
  echo "[INFO] Pushing the image '${CHE_DASHBOARD_IMAGE}'..."
  
  "${PWD}/scripts/container_tool.sh" push $CHE_DASHBOARD_IMAGE
fi

echo "[INFO] Patching checluster with the new dashboard image '${CHE_DASHBOARD_IMAGE}'..."

CHE_NAMESPACE="${CHE_NAMESPACE:-eclipse-che}"
DASHBOARD_POD_NAME=$(kubectl get pods -n $CHE_NAMESPACE -o=custom-columns=:metadata.name | grep dashboard)
CHECLUSTER_CR_NAME=$(kubectl exec $DASHBOARD_POD_NAME -n $CHE_NAMESPACE -- printenv CHECLUSTER_CR_NAME)
PREVIOUS_CHE_DASHBOARD_IMAGE=$(kubectl get checluster -n $CHE_NAMESPACE $CHECLUSTER_CR_NAME -o=json | jq -r '.spec.components.dashboard.deployment.containers[0].image')

if [ "$PREVIOUS_CHE_DASHBOARD_IMAGE" == "null" ]; then
  kubectl patch -n "$CHE_NAMESPACE" "checluster/$CHECLUSTER_CR_NAME" --type=json -p="[{\"op\": \"replace\", \"path\": \"/spec/components/dashboard\", \"value\": {deployment: {containers: [{image: \"${CHE_DASHBOARD_IMAGE}\", name: che-dasboard}]}}}]"
else
  kubectl patch -n "$CHE_NAMESPACE" "checluster/$CHECLUSTER_CR_NAME" --type=json -p="[{\"op\": \"replace\", \"path\": \"/spec/components/dashboard/deployment/containers/0/image\", \"value\": ${CHE_DASHBOARD_IMAGE}}]"
fi

echo 'Done.'
