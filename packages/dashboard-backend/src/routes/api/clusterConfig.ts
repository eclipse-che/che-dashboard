/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { ClusterConfig } from '@eclipse-che/common';
import { FastifyInstance } from 'fastify';
import * as k8s from '@kubernetes/client-node';

import { baseApiPath } from '@/constants/config';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { getSchema } from '@/services/helpers';

import { exec } from '@/devworkspaceClient/services/helpers/exec';
import { prepareCoreV1API } from '@/devworkspaceClient/services/helpers/prepareCoreV1API';
import { getKubeConfig } from '@/devworkspaceClient/helpers/kube';

const tags = ['Cluster Config'];

export function registerClusterConfigRoute(instance: FastifyInstance) {
  instance.register(async server => {
    server.get(`${baseApiPath}/cluster-config`, getSchema({ tags }), async () =>
      buildClusterConfig(),
    );
  });
}

async function getArchitectureFromDashboardPod(): Promise<string> {
  const kc = getKubeConfig();
  const coreV1API = prepareCoreV1API(kc);
  const namespace = 'openshift-devspaces';
  const labelSelector = 'app=che-dashboard';

  const podList = await coreV1API.listNamespacedPod(
    namespace,
    undefined,
    false,
    undefined,
    undefined,
    labelSelector,
  );

  const pod = podList.body.items.find(p => p.status?.phase === 'Running');
  if (!pod) {
    throw new Error(`No running dashboard pod found in namespace '${namespace}'`);
  }

  const podName = pod.metadata?.name!;
  const containerName = pod.spec?.containers[0]?.name!;
  const server = kc.getCurrentCluster()?.server || '';
  const opts: any = {};
  kc.applyToRequest(opts);

  const { stdout } = await exec(
    podName,
    namespace,
    containerName,
    [
      'sh',
      '-c',
      `
        command -v podman >/dev/null 2>&1 || { echo "podman is absent"; exit 1; }
        command -v oc >/dev/null 2>&1 || { echo "oc is absent"; exit 1; }
        [[ -n "$HOME" ]] || { echo "HOME is not set"; exit 1; }

        CERTS_SRC="/var/run/secrets/kubernetes.io/serviceaccount"
        CERTS_DEST="$HOME/.config/containers/certs.d/image-registry.openshift-image-registry.svc:5000"
        mkdir -p "$CERTS_DEST"
        ln -sf "$CERTS_SRC/service-ca.crt" "$CERTS_DEST/service-ca.crt"
        ln -sf "$CERTS_SRC/ca.crt" "$CERTS_DEST/ca.crt"

        OC_USER=$(oc whoami)
        [[ "$OC_USER" == "kube:admin" ]] && OC_USER="kubeadmin"

        podman login -u "$OC_USER" -p $(oc whoami -t) image-registry.openshift-image-registry.svc:5000

        arch
      `
    ],
    { server, opts }
  );

  return stdout.trim();
}

async function buildClusterConfig(): Promise<ClusterConfig> {
  const token = getServiceAccountToken();
  const { serverConfigApi } = getDevWorkspaceClient(token);

  const cheCustomResource = await serverConfigApi.fetchCheCustomResource();
  const dashboardWarning = serverConfigApi.getDashboardWarning(cheCustomResource);
  const runningWorkspacesLimit = serverConfigApi.getRunningWorkspacesLimit(cheCustomResource);
  const allWorkspacesLimit = serverConfigApi.getAllWorkspacesLimit(cheCustomResource);
  const dashboardFavicon = serverConfigApi.getDashboardLogo(cheCustomResource);

  let detectedArch = 'unknown';
  try {
    detectedArch = await getArchitectureFromDashboardPod();
  } catch (e) {
    console.error('Error getting architecture from dashboard pod:', e);
  }

  const supportedArchitectures = [detectedArch];

  return {
    dashboardWarning,
    dashboardFavicon,
    allWorkspacesLimit,
    runningWorkspacesLimit,
    infrastructure: {
      supportedArchitectures,
    },
  };
}






