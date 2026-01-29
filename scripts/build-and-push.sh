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
    echo "${BASE_TAG}"
    echo "${BASE_TAG}" > "$TAG_FILE"
    return
  fi
  
  CURRENT_TAG=$(cat "$TAG_FILE")
  
  # Extract base and counter
  if [[ $CURRENT_TAG =~ ^([^_]+)_([0-9]+)$ ]]; then
    TAG_BASE="${BASH_REMATCH[1]}"
    TAG_COUNTER="${BASH_REMATCH[2]}"
    NEXT_COUNTER=$((TAG_COUNTER + 1))
    NEXT_TAG="${TAG_BASE}_${NEXT_COUNTER}"
  elif [[ $CURRENT_TAG =~ ^([^_]+)$ ]]; then
    TAG_BASE="${BASH_REMATCH[1]}"
    NEXT_TAG="${TAG_BASE}_1"
  else
    echo "Error: Invalid tag format in $TAG_FILE"
    exit 1
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
