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

import { authenticate } from './kubeclient/auth';
import {
  container,
  IDevWorkspaceCallbacks,
  IDevWorkspaceClient,
  INVERSIFY_TYPES
} from '@eclipse-che/devworkspace-client';
import { initializeNodeConfig } from '../nodeConfig';


// Get the default node configuration based off the provided environment arguments
const devworkspaceClientConfig = initializeNodeConfig();
const client: IDevWorkspaceClient = container.get(
  INVERSIFY_TYPES.IDevWorkspaceClient
);

class DevWorkspaceWatcher {
  private readonly callbacks: IDevWorkspaceCallbacks;
  private readonly namespace: string;
  private token: string;
  private unsubscribeFunction: Function | undefined;

  constructor(data: { token: string, namespace: string, callbacks: IDevWorkspaceCallbacks }) {
    this.callbacks = data.callbacks;
    this.namespace = data.namespace;
    this.token = data.token;
  }

  public getNamespace(): string {
    return this.namespace;
  }

  setToken(token: string): void {
    if (this.token !== token) {
      this.token = token;
      this.subscribe();
    }
  }

  async subscribe(): Promise<void> {
    try {
      const { devWorkspaceWatcher } = await authenticate(
        client.getNodeApi(devworkspaceClientConfig),
        this.token
      );
      const unsubscribeFunction = await devWorkspaceWatcher.watcher(this.namespace, this.callbacks).then((ret: { abort: Function }) => ret.abort);

      if (this.unsubscribeFunction) {
        await this.unsubscribe();
      }
      this.unsubscribeFunction = unsubscribeFunction;
    } catch (error) {
      this.callbacks.onError(error.toString());
      throw error;
    }
  }

  async unsubscribe(): Promise<void> {
    if (this.unsubscribeFunction) {
      this.unsubscribeFunction();
      this.unsubscribeFunction = undefined;
      return;
    }
    throw 'Error: There are no subscriptions.';
  }

}

export default DevWorkspaceWatcher;
