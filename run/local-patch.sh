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
#   - docker with buildx support
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
#

set -e

# --help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  sed -n '2,/^$/{ s/^# \?//; p }' "$0"
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

CHE_DASHBOARD_IMAGE="${CHE_DASHBOARD_IMAGE:-quay.io/local/che-dashboard:local}"
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
  # Fallback: find any private key (file without .pub extension that has a matching .pub)
  for pub_key in "$crc_dir"/*.pub; do
    local priv_key="${pub_key%.pub}"
    if [[ -f "$priv_key" ]]; then
      echo "$priv_key"
      return
    fi
  done
  echo ""
}

if [[ -z "$CRC_SSH_KEY" ]]; then
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

# Build the image
echo "[INFO] Building image '${CHE_DASHBOARD_IMAGE}' for platform ${BUILD_PLATFORM}..."
docker buildx build \
  --platform "${BUILD_PLATFORM}" \
  --load \
  -f "${PROJECT_DIR}/build/dockerfiles/Dockerfile" \
  -t "${CHE_DASHBOARD_IMAGE}" \
  "${PROJECT_DIR}"

# Save and load into CRC
echo "[INFO] Saving image to ${TAR_PATH}..."
docker save "${CHE_DASHBOARD_IMAGE}" -o "${TAR_PATH}"

echo "[INFO] Copying image to CRC VM ($(du -h "${TAR_PATH}" | cut -f1))..."
scp -i "${CRC_SSH_KEY}" ${CRC_SSH_OPTS} -P "${CRC_SSH_PORT}" \
  "${TAR_PATH}" "core@${CRC_IP}:/tmp/che-dashboard.tar"

echo "[INFO] Loading image into CRC VM..."
ssh -i "${CRC_SSH_KEY}" ${CRC_SSH_OPTS} -p "${CRC_SSH_PORT}" \
  "core@${CRC_IP}" "sudo podman load -i /tmp/che-dashboard.tar && rm /tmp/che-dashboard.tar"

rm -f "${TAR_PATH}"

# Patch CheCluster
echo "[INFO] Patching CheCluster with image '${CHE_DASHBOARD_IMAGE}'..."

if [[ -z "$CHE_NAMESPACE" ]]; then
  CHE_NAMESPACE=$(kubectl get checluster --all-namespaces -o jsonpath='{.items[0].metadata.namespace}' 2>/dev/null)
  if [[ -z "$CHE_NAMESPACE" ]]; then
    CHE_NAMESPACE="eclipse-che"
    echo "[WARN] No CheCluster found. Using default namespace: ${CHE_NAMESPACE}"
  else
    echo "[INFO] Detected CheCluster namespace: ${CHE_NAMESPACE}"
  fi
fi

CHECLUSTER_CR_NAME=$(kubectl get checluster -n "$CHE_NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
PREVIOUS_IMAGE=$(kubectl get checluster -n "$CHE_NAMESPACE" "$CHECLUSTER_CR_NAME" -o=json | jq -r '.spec.components.dashboard.deployment.containers[0].image')

PATCH_VALUE="{\"deployment\": {\"containers\": [{\"image\": \"${CHE_DASHBOARD_IMAGE}\", \"name\": \"che-dashboard\", \"imagePullPolicy\": \"IfNotPresent\"}]}}"

if [ "$PREVIOUS_IMAGE" == "null" ]; then
  kubectl patch -n "$CHE_NAMESPACE" "checluster/$CHECLUSTER_CR_NAME" --type=json \
    -p="[{\"op\": \"replace\", \"path\": \"/spec/components/dashboard\", \"value\": ${PATCH_VALUE}}]"
else
  kubectl patch -n "$CHE_NAMESPACE" "checluster/$CHECLUSTER_CR_NAME" --type=json \
    -p="[{\"op\": \"replace\", \"path\": \"/spec/components/dashboard/deployment/containers/0/image\", \"value\": \"${CHE_DASHBOARD_IMAGE}\"}, {\"op\": \"replace\", \"path\": \"/spec/components/dashboard/deployment/containers/0/imagePullPolicy\", \"value\": \"IfNotPresent\"}]"
fi

echo "[INFO] Waiting for rollout..."
kubectl rollout status deployment che-dashboard -n "$CHE_NAMESPACE" --timeout=120s

echo "[INFO] Done. Dashboard updated to: ${CHE_DASHBOARD_IMAGE}"
