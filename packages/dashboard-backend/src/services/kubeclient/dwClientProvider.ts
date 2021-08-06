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

import {KubeConfig} from '@kubernetes/client-node';
import {DevWorkspaceClientFactory, IDevWorkspaceClientFactory} from '@eclipse-che/devworkspace-client';
import * as k8s from '@kubernetes/client-node';
import * as helper from './helpers';
import {KubeConfigProvider} from './kubeConfigProvider';
import {keycloakToOpenShiftToken, validateToken} from './keycloak';

export class DwClientProvider {
  private kubeconfigProvider: KubeConfigProvider;
  private dwClientFactory: IDevWorkspaceClientFactory;
  private isOpenShift: Promise<boolean>;

  constructor() {
    this.dwClientFactory = new DevWorkspaceClientFactory();
    this.kubeconfigProvider = new KubeConfigProvider();

    const kc: any = this.kubeconfigProvider.getSAKubeConfig();
    const apiClient = kc.makeApiClient(k8s.ApisApi);
    this.isOpenShift = helper.isOpenShift(apiClient);
  }

  async getDWClient(keycloakToken: string) {
    let contextKc: KubeConfig;
    if (await this.isOpenShift) {
      contextKc = this.kubeconfigProvider.getKubeConfig(await keycloakToOpenShiftToken(keycloakToken));
    } else {
      await validateToken(keycloakToken);
      contextKc = this.kubeconfigProvider.getSAKubeConfig();
    }
    return this.dwClientFactory.create(contextKc as any);
  }
}
