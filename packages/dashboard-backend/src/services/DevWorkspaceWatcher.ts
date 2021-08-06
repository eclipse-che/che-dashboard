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

import { IDevWorkspaceCallbacks } from '@eclipse-che/devworkspace-client';
import {DwClientProvider} from './kubeclient/dwClientProvider';

class DevWorkspaceWatcher {
  private readonly dwClientProvider: DwClientProvider;
  private readonly callbacks: IDevWorkspaceCallbacks;
  private readonly namespace: string;
  private token: string;
  private unsubscribeFunction: Function | undefined;

  constructor(data: { token: string, namespace: string, callbacks: IDevWorkspaceCallbacks }) {
    this.callbacks = data.callbacks;
    this.namespace = data.namespace;
    this.token = data.token;
    this.dwClientProvider = new DwClientProvider();
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
      const { devworkspaceApi } = await (this.dwClientProvider.getDWClient(this.token));
      const unsubscribeFunction = await devworkspaceApi.watchInNamespace(this.namespace, this.callbacks).then((ret: { abort: Function }) => ret.abort);

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
