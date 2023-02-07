/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import {
  devworkspaceGroup,
  devworkspaceLatestVersion,
  devworkspacePlural,
  V1alpha2DevWorkspace,
} from '@devfile/api';
import { api } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';
import { V1Status } from '@kubernetes/client-node';
import http from 'http';
import { MessageListener } from '../../services/types/Observer';
import { IDevWorkspaceApi } from '../types';
import { createError } from './helpers/createError';
import { CustomObjectAPI, prepareCustomObjectAPI } from './helpers/prepareCustomObjectAPI';
import { prepareCustomObjectWatch } from './helpers/prepareCustomObjectWatch';

const DEV_WORKSPACE_API_ERROR_LABEL = 'CUSTOM_OBJECTS_API_ERROR';

export class DevWorkspaceApiService implements IDevWorkspaceApi {
  private readonly customObjectAPI: CustomObjectAPI;
  private readonly customObjectWatch: k8s.Watch;
  private stopWatch?: () => void;

  constructor(kc: k8s.KubeConfig) {
    this.customObjectAPI = prepareCustomObjectAPI(kc);
    this.customObjectWatch = prepareCustomObjectWatch(kc);
  }

  async listInNamespace(namespace: string): Promise<api.IDevWorkspaceList> {
    try {
      const resp = await this.customObjectAPI.listNamespacedCustomObject(
        devworkspaceGroup,
        devworkspaceLatestVersion,
        namespace,
        devworkspacePlural,
      );
      return resp.body as api.IDevWorkspaceList;
    } catch (e) {
      throw createError(e, DEV_WORKSPACE_API_ERROR_LABEL, 'Unable to list devworkspaces');
    }
  }

  async getByName(namespace: string, name: string): Promise<V1alpha2DevWorkspace> {
    try {
      const resp = await this.customObjectAPI.getNamespacedCustomObject(
        devworkspaceGroup,
        devworkspaceLatestVersion,
        namespace,
        devworkspacePlural,
        name,
      );
      return resp.body as V1alpha2DevWorkspace;
    } catch (e) {
      throw createError(
        e,
        DEV_WORKSPACE_API_ERROR_LABEL,
        `Unable to get devworkspace ${namespace}/${name}`,
      );
    }
  }

  async create(
    devworkspace: V1alpha2DevWorkspace,
    namespace: string,
  ): Promise<V1alpha2DevWorkspace> {
    try {
      if (!devworkspace.metadata?.name && !devworkspace.metadata?.generateName) {
        throw new Error(
          'Either DevWorkspace `metadata.name` or `metadata.generateName` is required.',
        );
      }

      const resp = await this.customObjectAPI.createNamespacedCustomObject(
        devworkspaceGroup,
        devworkspaceLatestVersion,
        namespace,
        devworkspacePlural,
        devworkspace,
      );
      return resp.body as V1alpha2DevWorkspace;
    } catch (e) {
      throw createError(e, DEV_WORKSPACE_API_ERROR_LABEL, 'Unable to create devworkspace');
    }
  }

  async update(devworkspace: V1alpha2DevWorkspace): Promise<V1alpha2DevWorkspace> {
    try {
      if (!devworkspace.metadata?.name || !devworkspace.metadata?.namespace) {
        throw new Error('DevWorkspace.metadata with name and namespace are required');
      }

      // you have to delete some elements from the devworkspace in order to update
      if (devworkspace.metadata?.uid) {
        devworkspace.metadata.uid = undefined;
      }
      if (devworkspace.metadata?.creationTimestamp) {
        delete devworkspace.metadata.creationTimestamp;
      }
      if (devworkspace.metadata?.deletionTimestamp) {
        delete devworkspace.metadata.deletionTimestamp;
      }

      const name = devworkspace.metadata.name;
      const namespace = devworkspace.metadata.namespace;

      const resp = await this.customObjectAPI.replaceNamespacedCustomObject(
        devworkspaceGroup,
        devworkspaceLatestVersion,
        namespace,
        devworkspacePlural,
        name,
        devworkspace,
      );
      return resp.body as V1alpha2DevWorkspace;
    } catch (e) {
      throw createError(e, DEV_WORKSPACE_API_ERROR_LABEL, 'Unable to update devworkspace');
    }
  }

  async delete(namespace: string, name: string): Promise<void> {
    try {
      await this.customObjectAPI.deleteNamespacedCustomObject(
        devworkspaceGroup,
        devworkspaceLatestVersion,
        namespace,
        devworkspacePlural,
        name,
      );
    } catch (e) {
      throw createError(
        e,
        DEV_WORKSPACE_API_ERROR_LABEL,
        `Unable to delete devworkspace ${namespace}/${name}`,
      );
    }
  }

  /**
   * Patch a DevWorkspace
   */
  async patch(
    namespace: string,
    name: string,
    patches: api.IPatch[],
  ): Promise<V1alpha2DevWorkspace> {
    return this.createPatch(namespace, name, patches);
  }

  private async createPatch(namespace: string, name: string, patches: api.IPatch[]) {
    try {
      const options = {
        headers: {
          'Content-type': k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH,
        },
      };
      const resp = await this.customObjectAPI.patchNamespacedCustomObject(
        devworkspaceGroup,
        devworkspaceLatestVersion,
        namespace,
        devworkspacePlural,
        name,
        patches,
        undefined,
        undefined,
        undefined,
        options,
      );
      return resp.body as V1alpha2DevWorkspace;
    } catch (e) {
      throw createError(e, DEV_WORKSPACE_API_ERROR_LABEL, 'Unable to patch devworkspace');
    }
  }

  async watchInNamespace(
    namespace: string,
    resourceVersion: string,
    listener: MessageListener,
  ): Promise<void> {
    const path = `/apis/${devworkspaceGroup}/${devworkspaceLatestVersion}/watch/namespaces/${namespace}/${devworkspacePlural}`;
    const queryParams = { watch: true, resourceVersion };

    this.stopWatching();

    const request: http.ServerResponse = await this.customObjectWatch.watch(
      path,
      queryParams,
      (eventPhase: string, apiObj: V1alpha2DevWorkspace | V1Status) => {
        switch (eventPhase) {
          case api.webSocket.EventPhase.ADDED:
          case api.webSocket.EventPhase.MODIFIED:
          case api.webSocket.EventPhase.DELETED: {
            const devWorkspace = apiObj as V1alpha2DevWorkspace;
            listener({ eventPhase, devWorkspace });
            break;
          }
          case api.webSocket.EventPhase.ERROR: {
            const status = apiObj as V1Status;
            listener({ eventPhase, status });
            break;
          }
        }
      },
      (error: unknown) => {
        console.error(`[ERROR] Stopped watching ${path}. Reason:`, error);
      },
    );

    this.stopWatch = () => request.destroy();
  }

  /**
   * Stop watching DevWorkspaces.
   */
  public stopWatching(): void {
    this.stopWatch?.();
    this.stopWatch = undefined;
  }
}
