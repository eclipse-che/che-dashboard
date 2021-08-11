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
import { DevWorkspaceClient } from '../../devworkspace-client';
import * as k8s from '@kubernetes/client-node';
import * as helper from './helpers';
import {KubeConfigProvider} from './kubeConfigProvider';
import {keycloakToOpenShiftToken, validateToken} from './keycloak';

export class DwClientProvider {
  private kubeconfigProvider: KubeConfigProvider;
  private isOpenShift: Promise<boolean>;

  constructor() {
    this.kubeconfigProvider = new KubeConfigProvider();

    const kc: any = this.kubeconfigProvider.getSAKubeConfig();
    const apiClient = kc.makeApiClient(k8s.ApisApi);
    this.isOpenShift = helper.isOpenShift(apiClient);
  }

  async getDWClient(keycloakToken: string) {
    let contextKc: KubeConfig;
    if (await this.isOpenShift) {
      const openshiftToken = await keycloakToOpenShiftToken(keycloakToken);
      contextKc = this.kubeconfigProvider.getKubeConfig(openshiftToken);
    } else {
      await validateToken(keycloakToken);
      contextKc = this.kubeconfigProvider.getSAKubeConfig();
    }
    // todo get rid of any
    return new DevWorkspaceClient(contextKc as any);
  }
}
