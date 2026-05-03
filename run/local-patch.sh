#!/bin/bash
#
# Build and Load Dashboard Image into CRC (no registry push)
#
# Builds a dashboard image for the local CRC VM architecture, loads it directly
# into the VM via SSH (bypassing any container registry), and patches the
# CheCluster custom resource to use it.
#
# Prerequisites:
#   - CRC installed and running (`crc start`)
#   - docker with buildx support (or podman)
#   - kubectl configured to talk to the CRC cluster
#   - jq installed
#
# Usage:
#   yarn local:patch
#   # or
#   ./run/local-patch.sh
#   ./run/local-patch.sh --help
#
# Environment Variables:
#   CRC_SSH_KEY         - Path to CRC VM SSH private key
#                         (default: auto-detected from ~/.crc/machines/crc/)
#   CRC_SSH_PORT        - SSH port for the CRC VM (default: 2222)
#   CHE_NAMESPACE       - Kubernetes namespace (default: auto-detected or eclipse-che)
#   CHE_DASHBOARD_IMAGE - Image name:tag (default: quay.io/local/che-dashboard:local)
#   BUILD_PLATFORM      - Target platform (default: linux/arm64)
#   SKIP_BUILD          - Set to 1 to skip local JS build (use pre-built output). ~30s faster.
#                         Use when only CSS/assets changed or you already ran yarn build.
#   PREBUILD            - Set to 1 to build JS locally first, then package into thin image.
#                         Faster than building inside Docker when webpack cache is warm.
#   LOCAL_PLUGINS       - Path to a local che-dashboard-plugins clone. When set, plugins are
#                         copied from there instead of downloaded from GitHub Releases.
#                         e.g. LOCAL_PLUGINS=~/workspace/olexii4/che-dashboard-plugins
#

set -e

# --help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  sed -n '2,/^$/{ s/^# \?//; p }' "$0"
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

IMAGE_TAG="local-$(date +%Y%m%d-%H%M%S)"
CHE_DASHBOARD_IMAGE="${CHE_DASHBOARD_IMAGE:-quay.io/local/che-dashboard:${IMAGE_TAG}}"
BUILD_PLATFORM="${BUILD_PLATFORM:-linux/arm64}"
CRC_SSH_PORT="${CRC_SSH_PORT:-2222}"
TAR_PATH="/tmp/che-dashboard.tar"

CRC_SSH_OPTS="-o StrictHostKeyChecking=no -o LogLevel=ERROR"

# Auto-detect CRC SSH key if not provided
find_crc_ssh_key() {
  local crc_dir="$HOME/.crc/machines/crc"
  if [[ ! -d "$crc_dir" ]]; then
    echo ""
    return
  fi
  for key_name in id_ed25519 id_ecdsa id_rsa; do
    if [[ -f "$crc_dir/$key_name" ]]; then
      echo "$crc_dir/$key_name"
      return
    fi
  done
  for pub_key in "$crc_dir"/*.pub; do
    local priv_key="${pub_key%.pub}"
    if [[ -f "$priv_key" ]]; then
      echo "$priv_key"
      return
    fi
  done
  echo ""
}

if [[ -z "${CRC_SSH_KEY:-}" ]]; then
  CRC_SSH_KEY=$(find_crc_ssh_key)
  if [[ -z "$CRC_SSH_KEY" ]]; then
    echo "[ERROR] Could not find CRC SSH key in ~/.crc/machines/crc/"
    echo "        Set CRC_SSH_KEY environment variable manually:"
    echo "        export CRC_SSH_KEY=/path/to/your/crc/ssh/key"
    exit 1
  fi
  echo "[INFO] Using SSH key: ${CRC_SSH_KEY}"
fi

if [[ ! -f "$CRC_SSH_KEY" ]]; then
  echo "[ERROR] SSH key not found: ${CRC_SSH_KEY}"
  exit 1
fi

# Verify CRC is running
if ! crc status &>/dev/null; then
  echo "[ERROR] CRC is not running. Start it with: crc start"
  exit 1
fi

CRC_IP=$(crc ip)

# Detect container engine
CONTAINER_ENGINE=$("${PROJECT_DIR}/scripts/container_tool.sh" detect)
echo "[INFO] Using container engine: ${CONTAINER_ENGINE}"

# PREBUILD mode: build JS locally then package into a thin image (faster for incremental changes)
if [[ "${PREBUILD:-0}" == "1" ]]; then
  echo "[INFO] PREBUILD mode: building JS locally, then packaging..."
  cd "${PROJECT_DIR}"
  bash scripts/fetch-plugins.sh
  bash scripts/prepare-plugins.sh
  yarn workspace @eclipse-che/common run build
  yarn workspace @eclipse-che/dashboard-plugins run build
  yarn workspace @eclipse-che/dashboard-backend run build
  yarn workspace @eclipse-che/dashboard-frontend run build

  echo "[INFO] Building thin image '${CHE_DASHBOARD_IMAGE}' from pre-built output..."
  # Use an inline Dockerfile to copy pre-built output (no compile step, very fast)
  PREBUILD_DOCKERFILE=$(mktemp /tmp/Dockerfile.XXXXXX)
  cat > "${PREBUILD_DOCKERFILE}" <<'DOCKERFILE'
FROM docker.io/node:24.0.2-alpine3.21
RUN apk --no-cache add curl git
COPY packages/dashboard-backend/lib /backend
COPY packages/dashboard-frontend/lib/public /public
COPY packages/devfile-registry /public/dashboard/devfile-registry
RUN chmod -R ug+rw /public/dashboard/devfile-registry
COPY build/dockerfiles/entrypoint.sh /entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
CMD ["sh"]
DOCKERFILE

  if [[ "$CONTAINER_ENGINE" == "docker" ]]; then
    docker buildx build --platform "${BUILD_PLATFORM}" --load \
      -f "${PREBUILD_DOCKERFILE}" -t "${CHE_DASHBOARD_IMAGE}" "${PROJECT_DIR}"
  else
    podman build --platform "${BUILD_PLATFORM}" \
      -f "${PREBUILD_DOCKERFILE}" -t "${CHE_DASHBOARD_IMAGE}" "${PROJECT_DIR}"
  fi
  rm -f "${PREBUILD_DOCKERFILE}"

# Normal mode: build everything inside Docker (uses Docker layer caching)
elif [[ "${SKIP_BUILD:-0}" == "1" ]]; then
  echo "[INFO] SKIP_BUILD mode: using pre-built output without rebuilding JS..."
  PREBUILD_DOCKERFILE=$(mktemp /tmp/Dockerfile.XXXXXX)
  cat > "${PREBUILD_DOCKERFILE}" <<'DOCKERFILE'
FROM docker.io/node:24.0.2-alpine3.21
RUN apk --no-cache add curl git
COPY packages/dashboard-backend/lib /backend
COPY packages/dashboard-frontend/lib/public /public
COPY packages/devfile-registry /public/dashboard/devfile-registry
RUN chmod -R ug+rw /public/dashboard/devfile-registry
COPY build/dockerfiles/entrypoint.sh /entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
CMD ["sh"]
DOCKERFILE

  cd "${PROJECT_DIR}"
  if [[ "$CONTAINER_ENGINE" == "docker" ]]; then
    docker buildx build --platform "${BUILD_PLATFORM}" --load \
      -f "${PREBUILD_DOCKERFILE}" -t "${CHE_DASHBOARD_IMAGE}" "${PROJECT_DIR}"
  else
    podman build --platform "${BUILD_PLATFORM}" \
      -f "${PREBUILD_DOCKERFILE}" -t "${CHE_DASHBOARD_IMAGE}" "${PROJECT_DIR}"
  fi
  rm -f "${PREBUILD_DOCKERFILE}"

else
  # Build the image
  echo "[INFO] Building image '${CHE_DASHBOARD_IMAGE}' for platform ${BUILD_PLATFORM}..."
  if [[ "$CONTAINER_ENGINE" == "docker" ]]; then
    docker buildx build \
      --platform "${BUILD_PLATFORM}" \
      --load \
      -f "${PROJECT_DIR}/build/dockerfiles/Dockerfile" \
      -t "${CHE_DASHBOARD_IMAGE}" \
      "${PROJECT_DIR}"
  else
    podman build \
      --platform "${BUILD_PLATFORM}" \
      -f "${PROJECT_DIR}/build/dockerfiles/Dockerfile" \
      -t "${CHE_DASHBOARD_IMAGE}" \
      "${PROJECT_DIR}"
  fi
fi

# Save and load into CRC
echo "[INFO] Saving image to ${TAR_PATH}..."
if [[ "$CONTAINER_ENGINE" == "docker" ]]; then
  docker save "${CHE_DASHBOARD_IMAGE}" -o "${TAR_PATH}"
else
  podman save "${CHE_DASHBOARD_IMAGE}" -o "${TAR_PATH}"
fi

echo "[INFO] Copying image to CRC VM ($(du -h "${TAR_PATH}" | cut -f1))..."
scp -i "${CRC_SSH_KEY}" ${CRC_SSH_OPTS} -P "${CRC_SSH_PORT}" \
  "${TAR_PATH}" "core@${CRC_IP}:/tmp/che-dashboard.tar"

echo "[INFO] Loading image into CRC VM..."
ssh -i "${CRC_SSH_KEY}" ${CRC_SSH_OPTS} -p "${CRC_SSH_PORT}" \
  "core@${CRC_IP}" "sudo podman load -i /tmp/che-dashboard.tar && rm /tmp/che-dashboard.tar"

rm -f "${TAR_PATH}"

# Patch CheCluster
echo "[INFO] Patching CheCluster with image '${CHE_DASHBOARD_IMAGE}'..."

if [[ -z "${CHE_NAMESPACE:-}" ]]; then
  CHE_NAMESPACE=$(kubectl get checluster --all-namespaces -o jsonpath='{.items[0].metadata.namespace}' 2>/dev/null)
  if [[ -z "$CHE_NAMESPACE" ]]; then
    CHE_NAMESPACE="eclipse-che"
    echo "[WARN] No CheCluster found. Using default namespace: ${CHE_NAMESPACE}"
  else
    echo "[INFO] Detected CheCluster namespace: ${CHE_NAMESPACE}"
  fi
fi

CHECLUSTER_CR_NAME=$(kubectl get checluster -n "$CHE_NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
PREVIOUS_IMAGE=$(kubectl get checluster -n "$CHE_NAMESPACE" "$CHECLUSTER_CR_NAME" -o=json | jq -r '.spec.components.dashboard.deployment.containers[0].image // "null"')

PATCH_VALUE="{\"deployment\": {\"containers\": [{\"image\": \"${CHE_DASHBOARD_IMAGE}\", \"name\": \"che-dashboard\", \"imagePullPolicy\": \"IfNotPresent\"}]}}"

if [[ "$PREVIOUS_IMAGE" == "null" ]]; then
  kubectl patch -n "$CHE_NAMESPACE" "checluster/$CHECLUSTER_CR_NAME" --type=json \
    -p="[{\"op\": \"replace\", \"path\": \"/spec/components/dashboard\", \"value\": ${PATCH_VALUE}}]"
else
  kubectl patch -n "$CHE_NAMESPACE" "checluster/$CHECLUSTER_CR_NAME" --type=json \
    -p="[{\"op\": \"replace\", \"path\": \"/spec/components/dashboard/deployment/containers/0/image\", \"value\": \"${CHE_DASHBOARD_IMAGE}\"}, {\"op\": \"replace\", \"path\": \"/spec/components/dashboard/deployment/containers/0/imagePullPolicy\", \"value\": \"IfNotPresent\"}]"
fi

echo "[INFO] Waiting for rollout..."
kubectl rollout status deployment/che-dashboard -n "$CHE_NAMESPACE" --timeout=120s

echo "[INFO] Done. Dashboard updated to: ${CHE_DASHBOARD_IMAGE}"
