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

import { IDevWorkspaceClient, IDevWorkspaceClientFactory } from '@eclipse-che/devworkspace-client';
import { isOpenShift } from './helpers';
import { openshiftKubeconfig } from './openshift';
import { k8sKubeconfig } from './kubernetes';
import { KubeConfig } from '@kubernetes/client-node';
import * as k8s from '@kubernetes/client-node';

export async function createDevWorkspaceClient(dwClientFactory: IDevWorkspaceClientFactory, keycloakToken: string): Promise<IDevWorkspaceClient> {
    const kc: any = createLocalKubeConfig();
    const apiClient = kc.makeApiClient(k8s.ApisApi);

    let contextKc: KubeConfig;
    if (await isOpenShift(apiClient)) {
      contextKc = await openshiftKubeconfig(keycloakToken);
    } else {
      contextKc = await k8sKubeconfig(keycloakToken);
    }
    // todo
    return dwClientFactory.create(contextKc as any);
}

function createLocalKubeConfig(): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
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
