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

CHE_DASHBOARD_IMAGE="${IMAGE_REGISTRY_HOST}/${IMAGE_REGISTRY_USER_NAME}/che-dashboard:next-${RANDOM}"

echo "Build a new image '${CHE_DASHBOARD_IMAGE}'..."

docker build . -f build/dockerfiles/Dockerfile -t $CHE_DASHBOARD_IMAGE

echo "Push the image '${CHE_DASHBOARD_IMAGE}'..."

docker push $CHE_DASHBOARD_IMAGE

echo "Patching checluster with the new dashboard image '${CHE_DASHBOARD_IMAGE}'..."

CHE_NAMESPACE="${CHE_NAMESPACE:-eclipse-che}"
DASHBOARD_POD_NAME=$(kubectl get pods -n $CHE_NAMESPACE -o=custom-columns=:metadata.name | grep dashboard)
CHECLUSTER_CR_NAMESPACE=$(kubectl exec $DASHBOARD_POD_NAME -n $CHE_NAMESPACE -- printenv CHECLUSTER_CR_NAMESPACE)
CHECLUSTER_CR_NAME=$(kubectl exec $DASHBOARD_POD_NAME -n $CHE_NAMESPACE -- printenv CHECLUSTER_CR_NAME)
PREVIOUS_CHE_DASHBOARD_IMAGE=$(kubectl get checluster -n $CHE_NAMESPACE $CHECLUSTER_CR_NAME -o=json | jq -r '.spec.components.dashboard.deployment.containers[0].image')

if [ "$PREVIOUS_CHE_DASHBOARD_IMAGE" = "null" ]; then
  echo "Replace '/spec/components/dashboard\' with '{deployment: {containers: [{image: \"${CHE_DASHBOARD_IMAGE}\", name: che-dasboard}]}}'..."
  kubectl patch checluster -n $CHE_NAMESPACE $CHECLUSTER_CR_NAME --type=json -p="[{\"op\": \"replace\", \"path\": \"/spec/components/dashboard\", \"value\": {deployment: {containers: [{image: \"${CHE_DASHBOARD_IMAGE}\", name: che-dasboard}]}}}]"
else
  echo "Change the previous dashboard image '${PREVIOUS_CHE_DASHBOARD_IMAGE}' to the new one '${CHE_DASHBOARD_IMAGE}'..."
  kubectl patch checluster -n $CHE_NAMESPACE $CHECLUSTER_CR_NAME --type=json -p="[{\"op\": \"replace\", \"path\": \"/spec/components/dashboard.deployment.containers[0].image\", \"value\": ${CHE_DASHBOARD_IMAGE}}]"
fi

echo 'Done.'
