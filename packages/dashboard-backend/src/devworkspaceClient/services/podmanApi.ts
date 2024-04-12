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

import { helpers } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';

import { DockerConfigApiService } from '@/devworkspaceClient/services/dockerConfigApi';
import { exec, ServerConfig } from '@/devworkspaceClient/services/helpers/exec';
import {
  CoreV1API,
  prepareCoreV1API,
} from '@/devworkspaceClient/services/helpers/prepareCoreV1API';
import { IDockerConfigApi, IPodmanApi } from '@/devworkspaceClient/types';
import { logger } from '@/utils/logger';

const EXCLUDED_CONTAINERS = ['che-gateway', 'che-machine-exec'];

export class PodmanApiService implements IPodmanApi {
  private readonly corev1API: CoreV1API;
  private dockerConfig: IDockerConfigApi;
  private readonly kubeConfig: string;
  private readonly getServerConfig: () => ServerConfig;

  constructor(kc: k8s.KubeConfig) {
    this.corev1API = prepareCoreV1API(kc);

    this.kubeConfig = kc.exportConfig();
    this.dockerConfig = new DockerConfigApiService(kc);

    const server = kc.getCurrentCluster()?.server || '';
    const opts = {};
    kc.applyToRequest(opts as any);
    this.getServerConfig = () => ({ opts, server });
  }

  /**
   * Executes the 'podman login' command to the OpenShift internal registry.
   * Before executing the login command, symbolic links for already mounted
   * 'ca.crt' and 'service-ca.crt' certificates are created in the '$HOME/.config/containers/certs.d' folder
   * for the OpenShift internal registry in order to avoid 'x509: certificate signed by unknown authority' errors.
   * @param namespace The namespace where the pod lives
   * @param devworkspaceId The id of the devworkspace
   */
  async podmanLogin(namespace: string, devworkspaceId: string): Promise<void> {
    const currentPod = await this.getPodByDevWorkspaceId(namespace, devworkspaceId);
    const podName = currentPod.metadata?.name || '';
    const currentPodContainers = currentPod.spec?.containers || [];

    let externalDockerRegistriesPodmanLoginCommand = '';
    try {
      externalDockerRegistriesPodmanLoginCommand =
        await this.generateExternalDockerRegistriesPodmanLoginCommand(namespace);
    } catch (e) {
      logger.warn(e);
    }

    let resolved = false;
    for (const container of currentPodContainers) {
      const containerName = container.name;
      if (EXCLUDED_CONTAINERS.indexOf(containerName) !== -1) {
        continue;
      }

      try {
        await exec(
          podName,
          namespace,
          containerName,
          [
            'sh',
            '-c',
            `
            command -v podman >/dev/null 2>&1 || { echo "podman is absent in the container"; exit 1; }

            # Login to external docker registries configured by user on the dashboard
            ${externalDockerRegistriesPodmanLoginCommand}

            command -v oc >/dev/null 2>&1 || { echo "oc is absent in the container"; exit 1; }
            [[ -n "$HOME" ]] || { echo "HOME is not set"; exit 1; }
            export CERTS_SRC="/var/run/secrets/kubernetes.io/serviceaccount"
            export CERTS_DEST="$HOME/.config/containers/certs.d/image-registry.openshift-image-registry.svc:5000"
            mkdir -p "$CERTS_DEST"
            ln -s "$CERTS_SRC/service-ca.crt" "$CERTS_DEST/service-ca.crt"
            ln -s "$CERTS_SRC/ca.crt" "$CERTS_DEST/ca.crt"
            export OC_USER=$(oc whoami)
            [[ "$OC_USER" == "kube:admin" ]] && export OC_USER="kubeadmin"

            # Login to internal OpenShift registry
            podman login -u "$OC_USER" -p $(oc whoami -t) image-registry.openshift-image-registry.svc:5000
            `,
          ],
          this.getServerConfig(),
        );
        if (!resolved) {
          resolved = true;
        }
      } catch (e) {
        logger.warn(e);
      }
    }
    if (!resolved) {
      throw new Error(`Could not 'podman login' into containers in ${namespace}`);
    }
  }

  /**
   * Given a namespace, find a pod that has the label controller.devfile.io/devworkspace_id=${devworkspaceId}
   * @param namespace The namespace to look in
   * @param devworkspaceId The id of the devworkspace
   * @returns The containers for the first pod with given devworkspaceId
   */
  private async getPodByDevWorkspaceId(
    namespace: string,
    devworkspaceId: string,
  ): Promise<k8s.V1Pod> {
    try {
      const resp = await this.corev1API.listNamespacedPod(
        namespace,
        undefined,
        false,
        undefined,
        undefined,
        `controller.devfile.io/devworkspace_id=${devworkspaceId}`,
      );
      if (resp.body.items.length === 0) {
        throw new Error(
          `Could not find requested devworkspace with id ${devworkspaceId} in ${namespace}`,
        );
      }
      return resp.body.items[0];
    } catch (e: any) {
      throw new Error(
        `Error occurred when attempting to retrieve pod. ${helpers.errors.getMessage(e)}`,
      );
    }
  }

  private async generateExternalDockerRegistriesPodmanLoginCommand(
    namespace: string,
  ): Promise<string> {
    let externalDockerRegistriesPodmanLoginCommand = '';

    const dockerConfigBase64Encoded = await this.dockerConfig.read(namespace);
    const dockerConfig = JSON.parse(
      Buffer.from(dockerConfigBase64Encoded.dockerconfig, 'base64').toString('binary'),
    );

    const auths = dockerConfig['auths'];
    if (auths) {
      for (const registry of Object.keys(auths)) {
        let username = '';
        let password = '';

        const credentials = auths[registry];
        if (credentials) {
          username = credentials['username'];
          password = credentials['password'];
        }

        const authBase64Encoded = credentials['auth'];
        if (!username && !password && authBase64Encoded) {
          const auth = Buffer.from(authBase64Encoded, 'base64').toString('binary');
          const usernamePassword = auth.split(':');
          username = usernamePassword[0];
          password = usernamePassword[1];
        }

        if (username && password) {
          // `|| true` ensures that `podman login` won't fail if credentials are invalid
          externalDockerRegistriesPodmanLoginCommand += `podman login ${registry} -u ${username} -p ${password} || true\n`;
        }
      }
    }

    return externalDockerRegistriesPodmanLoginCommand.trimEnd();
  }
}
