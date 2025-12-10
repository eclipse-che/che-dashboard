#!/bin/bash
#
# Multi-Architecture Build Script for Eclipse Che Dashboard
#
# This script builds and pushes multi-architecture Docker images
# supporting AMD64 and ARM64 platforms.
#
# Usage:
#   export IMAGE_REGISTRY_HOST=quay.io
#   export IMAGE_REGISTRY_USER_NAME=your-username
#   ./run/build-multiarch.sh
#
# Environment Variables:
#   IMAGE_REGISTRY_HOST     - Container registry host (required)
#   IMAGE_REGISTRY_USER_NAME - Registry username/namespace (required)
#   PLATFORMS               - Platforms to build (default: linux/amd64,linux/arm64)
#   IMAGE_TAG               - Custom image tag (default: branch_timestamp)
#
# See run/MULTIARCH_BUILD.md for detailed documentation.
#

set -e

# Validate required environment variables
if [[ -z "$IMAGE_REGISTRY_HOST" ]]; then
  echo "[ERROR] Environment variable IMAGE_REGISTRY_HOST is not set."
  echo "        Example: export IMAGE_REGISTRY_HOST=quay.io"
  exit 1
fi

if [[ -z "$IMAGE_REGISTRY_USER_NAME" ]]; then
  echo "[ERROR] Environment variable IMAGE_REGISTRY_USER_NAME is not set."
  echo "        Example: export IMAGE_REGISTRY_USER_NAME=your-username"
  exit 1
fi

# Generate image tag
if [[ -z "$IMAGE_TAG" ]]; then
  IMAGE_TAG=$(git branch --show-current)'_'$(date '+%Y_%m_%d_%H_%M_%S')
fi
CHE_DASHBOARD_IMAGE="${IMAGE_REGISTRY_HOST}/${IMAGE_REGISTRY_USER_NAME}/che-dashboard:${IMAGE_TAG}"

# Platforms to build for
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"

# Detect container engine
echo "[INFO] Detecting container engine..."
CONTAINER_ENGINE=$("${PWD}/scripts/container_tool.sh" detect)

if [ $? -ne 0 ] || [ -z "$CONTAINER_ENGINE" ]; then
  echo "[ERROR] Failed to detect container engine."
  echo "[ERROR] Please install Docker or Podman and ensure it's running."
  exit 1
fi

echo "[INFO] Using container engine: ${CONTAINER_ENGINE}"
echo "[INFO] Building multi-architecture image for platforms: ${PLATFORMS}"
echo "[INFO] Target image: ${CHE_DASHBOARD_IMAGE}"

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
  echo "[INFO] Building and pushing multi-arch image..."
  docker buildx build . \
    -f build/dockerfiles/skaffold.Dockerfile \
    --platform "${PLATFORMS}" \
    -t "${CHE_DASHBOARD_IMAGE}" \
    --push
    
elif [[ "$CONTAINER_ENGINE" == "podman" ]]; then
  # Podman multiarch build
  echo "[INFO] Building multi-arch image with Podman..."
  
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

echo ""
echo "[SUCCESS] Multi-arch image built and pushed: ${CHE_DASHBOARD_IMAGE}"
echo ""
echo "To verify the image, run:"
echo "  docker buildx imagetools inspect ${CHE_DASHBOARD_IMAGE}"
echo "  # or"
echo "  skopeo inspect docker://${CHE_DASHBOARD_IMAGE}"
echo ""
echo "To patch CheCluster with this image, run:"
echo "  export CHE_DASHBOARD_IMAGE=${CHE_DASHBOARD_IMAGE}"
echo "  ./run/patch.sh"

