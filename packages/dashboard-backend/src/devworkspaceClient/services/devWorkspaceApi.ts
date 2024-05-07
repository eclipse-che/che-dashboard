/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { V1alpha2DevWorkspace } from '@devfile/api';
import { devworkspaceGroup, devworkspaceLatestVersion, devworkspacePlural } from '@devfile/api/api';
import { api } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';
import { V1Status } from '@kubernetes/client-node';
import http, { IncomingHttpHeaders } from 'http';

import { createError } from '@/devworkspaceClient/services/helpers/createError';
import {
  CustomObjectAPI,
  prepareCustomObjectAPI,
} from '@/devworkspaceClient/services/helpers/prepareCustomObjectAPI';
import { prepareCustomObjectWatch } from '@/devworkspaceClient/services/helpers/prepareCustomObjectWatch';
import { IDevWorkspaceApi } from '@/devworkspaceClient/types';
import { MessageListener } from '@/services/types/Observer';
import { logger } from '@/utils/logger';

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

  private propagateHeaders(resp: { response: http.IncomingMessage; body: unknown }) {
    const propagateHeaders = ['warning'];
    const headers = Object.entries(resp.response.headers).reduce((acc, [key, value]) => {
      if (propagateHeaders.includes(key)) {
        acc[key] = value;
      }
      return acc;
    }, {} as Partial<IncomingHttpHeaders>);
    return headers;
  }

  async create(
    devworkspace: V1alpha2DevWorkspace,
    namespace: string,
  ): Promise<{ devWorkspace: V1alpha2DevWorkspace; headers: Partial<IncomingHttpHeaders> }> {
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
      const devWorkspace = resp.body as V1alpha2DevWorkspace;
      const headers = this.propagateHeaders(resp);
      return { devWorkspace, headers };
    } catch (e) {
      throw createError(e, DEV_WORKSPACE_API_ERROR_LABEL, 'Unable to create devworkspace');
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
  ): Promise<{ devWorkspace: V1alpha2DevWorkspace; headers: Partial<IncomingHttpHeaders> }> {
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
      const devWorkspace = resp.body as V1alpha2DevWorkspace;
      const headers = this.propagateHeaders(resp);
      return { devWorkspace, headers };
    } catch (e) {
      throw createError(e, DEV_WORKSPACE_API_ERROR_LABEL, 'Unable to patch devworkspace');
    }
  }

  async watchInNamespace(
    listener: MessageListener,
    params: api.webSocket.SubscribeParams,
  ): Promise<void> {
    const path = `/apis/${devworkspaceGroup}/${devworkspaceLatestVersion}/watch/namespaces/${params.namespace}/${devworkspacePlural}`;
    const queryParams = { watch: true, resourceVersion: params.resourceVersion };

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
            listener({ eventPhase, status, params });
            break;
          }
        }
      },
      (error: unknown) => {
        logger.warn(error, `Stopped watching ${path}.`);
        request.destroy();
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
