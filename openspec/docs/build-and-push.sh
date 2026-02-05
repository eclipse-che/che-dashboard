#!/bin/bash
#
# Copyright (c) 2018-2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
#

set -e

# Configuration
REGISTRY="quay.io/oorel/che-dashboard"
BASE_TAG="${1:-pr-1452}"
TAG_FILE=".image-tag"

# Get the next tag version
get_next_tag() {
  if [ ! -f "$TAG_FILE" ]; then
    NEXT_TAG="${BASE_TAG}-01"
    echo "${NEXT_TAG}" > "$TAG_FILE"
    echo "${NEXT_TAG}"
    return
  fi
  
  CURRENT_TAG=$(cat "$TAG_FILE")
  
  # Extract base and counter (format: pr-1452-01)
  if [[ $CURRENT_TAG =~ ^(.+)-([0-9]{2})$ ]]; then
    TAG_BASE="${BASH_REMATCH[1]}"
    TAG_COUNTER="${BASH_REMATCH[2]}"
    NEXT_COUNTER=$(printf "%02d" $((10#$TAG_COUNTER + 1)))
    NEXT_TAG="${TAG_BASE}-${NEXT_COUNTER}"
  else
    # First time or invalid format, start with -01
    NEXT_TAG="${BASE_TAG}-01"
  fi
  
  echo "$NEXT_TAG"
  echo "$NEXT_TAG" > "$TAG_FILE"
}

# Main script
NEXT_TAG=$(get_next_tag)
IMAGE_NAME="${REGISTRY}:${NEXT_TAG}"

echo "================================================"
echo "Building and pushing image: $IMAGE_NAME"
echo "================================================"

# Build image
echo "[1/2] Building image..."
podman build -f build/dockerfiles/Dockerfile -t "$IMAGE_NAME" .

# Push image
echo "[2/2] Pushing image..."
podman push "$IMAGE_NAME"

echo "================================================"
echo "✅ Successfully built and pushed: $IMAGE_NAME"
echo "================================================"
echo "Tag saved to: $TAG_FILE"
