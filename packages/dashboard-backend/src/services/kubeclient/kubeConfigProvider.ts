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
    const currentContext = baseKc.getContextObject(baseKc.getCurrentContext());
    if (!currentContext) {
      throw 'SA kubecofig is not a valid: no current context is found';
    }
    const currentCluster = baseKc.getCluster(currentContext.cluster);
    if (!currentCluster) {
      throw 'base kubeconfig is not a valid: no cluster exists specified in the current context';
    }

    const user: User = {
      // todo is there way to figure out openshift username?
      name: 'developer',
      token: token,
    };
    const context: Context = {
      user: user.name,
      cluster: currentContext.cluster,
      name: 'logged-user',
    };

    const kubeconfig = new KubeConfig();
    kubeconfig.addUser(user);
    kubeconfig.addCluster(currentCluster);
    kubeconfig.addContext(context);
    kubeconfig.setCurrentContext(context.name);
    return kubeconfig;
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

}
