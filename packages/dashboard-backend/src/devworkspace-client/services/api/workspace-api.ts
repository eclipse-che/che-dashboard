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

import * as k8s from '@kubernetes/client-node';
import {
  IDevWorkspace,
  IDevWorkspaceList,
  IDevWorkspaceApi,
  IDevWorkspaceCallbacks,
  IDevWorkspaceDevfile,
  IPatch,
} from '../../types';
import {
  devworkspacePluralSubresource,
  devworkspaceVersion,
  devWorkspaceApiGroup,
} from '../../const';

import { devfileToDevWorkspace } from '../converters';
import { helpers } from '@eclipse-che/common';
import { HttpError } from '@kubernetes/client-node';

export class DevWorkspaceApi implements IDevWorkspaceApi {
  private readonly customObjectAPI: k8s.CustomObjectsApi;
  private readonly customObjectWatch: k8s.Watch;

  constructor(kc: k8s.KubeConfig) {
    this.customObjectAPI = kc.makeApiClient(k8s.CustomObjectsApi);
    this.customObjectWatch = new k8s.Watch(kc);
  }

  async listInNamespace(namespace: string): Promise<IDevWorkspaceList> {
    try {
      const resp = await this.customObjectAPI.listNamespacedCustomObject(
        devWorkspaceApiGroup,
        devworkspaceVersion,
        namespace,
        devworkspacePluralSubresource
      );
      return resp.body as IDevWorkspaceList;
    } catch (e) {
      throw new Error('unable to list devworkspaces: ' + helpers.errors.getMessage(e));
    }
  }

  async getByName(
    namespace: string,
    name: string
  ): Promise<IDevWorkspace> {
    try {
      const resp = await this.customObjectAPI.getNamespacedCustomObject(
        devWorkspaceApiGroup,
        devworkspaceVersion,
        namespace,
        devworkspacePluralSubresource,
        name
      );
      return resp.body as IDevWorkspace;
    } catch (e) {
      throw new Error(`unable to get devworkspace ${namespace}/${name}: ` + helpers.errors.getMessage(e));
    }
  }

  async create(
    devfile: IDevWorkspaceDevfile,
    routingClass: string,
    started: boolean = true
  ): Promise<IDevWorkspace> {
    try {
      const devworkspace = devfileToDevWorkspace(devfile, routingClass, started);
      const namespace = devfile.metadata.namespace;
      const resp = await this.customObjectAPI.createNamespacedCustomObject(
        devWorkspaceApiGroup,
        devworkspaceVersion,
        namespace,
        devworkspacePluralSubresource,
        devworkspace
      );
      return resp.body as IDevWorkspace;
    } catch (e) {
      throw new Error('unable to create devworkspace: ' + helpers.errors.getMessage(e));
    }
  }

  async update(devworkspace: IDevWorkspace): Promise<IDevWorkspace> {
    try {
      // you have to delete some elements from the devworkspace in order to update
      if (devworkspace.metadata?.uid) {
        devworkspace.metadata.uid = undefined;
      }
      if (devworkspace.metadata.creationTimestamp) {
        delete devworkspace.metadata.creationTimestamp;
      }
      if (devworkspace.metadata.deletionTimestamp) {
        delete devworkspace.metadata.deletionTimestamp;
      }

      const name = devworkspace.metadata.name;
      const namespace = devworkspace.metadata.namespace;

      const resp = await this.customObjectAPI.replaceNamespacedCustomObject(
        devWorkspaceApiGroup,
        devworkspaceVersion,
        namespace,
        devworkspacePluralSubresource,
        name,
        devworkspace
      );
      return resp.body as IDevWorkspace;
    } catch (e) {
      throw new Error('unable to update devworkspace: ' + helpers.errors.getMessage(e));
    }
  }

  async delete(namespace: string, name: string): Promise<void> {
    try {
      await this.customObjectAPI.deleteNamespacedCustomObject(
        devWorkspaceApiGroup,
        devworkspaceVersion,
        namespace,
        devworkspacePluralSubresource,
        name
      );
    } catch (e) {
      throw new Error(`unable to delete devworkspace ${namespace}/${name}: ` + helpers.errors.getMessage(e));
    }
  }

  /**
   * Patch a DevWorkspace
   */
  async patch(namespace: string, name: string, patches: IPatch[]): Promise<IDevWorkspace> {
    return this.createPatch(namespace, name, patches);
  }

  private async createPatch(
    namespace: string,
    name: string,
    patches: IPatch[]) {
    try {
      const options = {
        headers: {
          'Content-type': k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH,
        },
      };
      const resp = await this.customObjectAPI.patchNamespacedCustomObject(
        devWorkspaceApiGroup,
        devworkspaceVersion,
        namespace,
        devworkspacePluralSubresource,
        name,
        patches,
        undefined,
        undefined,
        undefined,
        options
      );
      return resp.body as IDevWorkspace;
    } catch (e) {
      throw new Error(`unable to patch devworkspace: ` + helpers.errors.getMessage(e));
    }
  }

  async watchInNamespace(namespace: string, resourceVersion: string, callbacks: IDevWorkspaceCallbacks): Promise<{ abort: Function }> {
    const path = `/apis/${devWorkspaceApiGroup}/${devworkspaceVersion}/watch/namespaces/${namespace}/devworkspaces`;
    const queryParams = { watch: true, resourceVersion };

    return this.customObjectWatch.watch(path, queryParams, (type: string, devworkspace: IDevWorkspace) => {
      const workspaceId = devworkspace!.status!.devworkspaceId;

      if (type === 'ADDED') {
        callbacks.onAdded(devworkspace);
      } else if (type === 'MODIFIED') {
        callbacks.onModified(devworkspace);
      } else if (type === 'DELETED') {
        callbacks.onDeleted(workspaceId);
      } else if (type === 'ERROR') {
        callbacks.onError('Error: Unknown error.');
      } else {
        callbacks.onError(`Error: Unknown type '${type}'.`);
      }
    }, error => {
      console.error('Watch in namespace error:', error);
      const message = typeof (error) === 'string' ? error : 'Unknown type error.'
      callbacks.onError(message);
    });
  }
}
