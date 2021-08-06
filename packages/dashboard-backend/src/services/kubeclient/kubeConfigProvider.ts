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

import { Context, KubeConfig, User} from '@kubernetes/client-node';
import * as helper from './helpers';
import * as k8s from '@kubernetes/client-node';

export class KubeConfigProvider {
  private isOpenShift: Promise<boolean>;
  // todo maybe cache SA kubeconfig
  // private saKubeConfig: KubeConfig;

  constructor() {
    const kc: any = this.getSAKubeConfig();
    const apiClient = kc.makeApiClient(k8s.ApisApi);
    this.isOpenShift = helper.isOpenShift(apiClient);
  }

  getKubeConfig(token: string): KubeConfig {
    const baseKc = this.getSAKubeConfig();
    // todo make sure that this user not appear twice
    baseKc.addUser(this.createUser(token));
    const context = baseKc.getContextObject(baseKc.getCurrentContext());
    if (!context) {
      throw 'SA kubecofig is not a valid';
    }
    const c: Context = {
      user: 'developer',
      cluster: context.cluster,
      name: 'logged-user',
    };
    baseKc.addContext(c);
    baseKc.setCurrentContext('logged-user');
    return baseKc;
  }

  getSAKubeConfig(): KubeConfig {
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

  /**
   * Create a kubernetes client node user with the provided openshift token
   * @param openShiftToken The openShift token you want to use for the user
   * @returns A kubernetes client node user object
   */
  createUser(openShiftToken: string): User {
    return {
      name: 'developer',
      token: openShiftToken
    } as User;
  }
}
