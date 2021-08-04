/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { KubeConfig } from '@kubernetes/client-node';
import { IDevWorkspaceClientApi } from '@eclipse-che/devworkspace-client';
import { isOpenShift } from './helpers';
import { authenticateOpenShift } from './openshift';
import { authenticateKubernetes } from './kubernetes';
import * as k8s from '@kubernetes/client-node';

export async function authenticate(nodeApi: IDevWorkspaceClientApi, keycloakToken: string): Promise<IDevWorkspaceClientApi> {
    const kc: any = createLocalKubeConfig();
    const apiClient = kc.makeApiClient(k8s.ApisApi);
    if (await isOpenShift(apiClient)) {
        return authenticateOpenShift(nodeApi, keycloakToken);
    } else {
        return authenticateKubernetes(nodeApi, keycloakToken);
    }
}

function createLocalKubeConfig(): KubeConfig {
  const kc = new KubeConfig();
  if (process.env['LOCAL_RUN'] === 'true') {
    const kubeconfig = process.env['KUBECONFIG'];
    if (!kubeconfig) {
      return kc;
    }
    kc.loadFromFile(kubeconfig);
  } else {
    kc.loadFromCluster();
  }
  return kc;
}
