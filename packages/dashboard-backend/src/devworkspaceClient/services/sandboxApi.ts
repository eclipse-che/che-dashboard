/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { api } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';
import { V1Status } from '@kubernetes/client-node';

import { createError } from '@/devworkspaceClient/services/helpers/createError';
import { MERGE_PATCH_OPTIONS } from '@/devworkspaceClient/services/helpers/patchOptions';
import {
  CustomObjectAPI,
  prepareCustomObjectAPI,
} from '@/devworkspaceClient/services/helpers/prepareCustomObjectAPI';
import { prepareCustomObjectWatch } from '@/devworkspaceClient/services/helpers/prepareCustomObjectWatch';
import { retryableExec } from '@/devworkspaceClient/services/helpers/retryableExec';
import { ISandbox, ISandboxApi, ISandboxList } from '@/devworkspaceClient/types';
import { MessageListener } from '@/services/types/Observer';
import { logger } from '@/utils/logger';

export const SANDBOX_API_GROUP = 'agents.x-k8s.io';
export const SANDBOX_API_VERSION = 'v1beta1';
export const SANDBOX_PLURAL = 'sandboxes';

/**
 * Label the Agent Space UI puts on the sandbox pod.
 *
 * The controller labels the pod with a hash of the sandbox name, readable only
 * from `status.selector` and therefore only once the sandbox exists. This one
 * is deterministic, which is how the terminal finds the pod without a round
 * trip. Must stay in step with `SANDBOX_POD_LABEL` of the Agent Space bundle.
 */
export const SANDBOX_POD_LABEL = 'che.eclipse.org/sandbox';

const SANDBOX_API_ERROR_LABEL = 'CUSTOM_OBJECTS_API_ERROR';

/**
 * Relays Agent Sandbox resources between the browser and the Kubernetes API.
 *
 * The Che gateway does not route `/apis/...` to the API server, so the Agent Space
 * bundle cannot reach Sandboxes directly. Going through the dashboard backend also
 * keeps every call bound to the requesting user's token, so the RBAC the operator
 * provisions still applies.
 */
export class SandboxApiService implements ISandboxApi {
  private readonly customObjectAPI: CustomObjectAPI;
  private readonly apisApi: k8s.ApisApi;
  // prepareCustomObjectAPI() pins patches to json-patch; sandbox updates describe the
  // desired state instead, so the merge-patch call is made against the raw client.
  private readonly customObjectsApi: k8s.CustomObjectsApi;
  private readonly customObjectWatch: k8s.Watch;
  private stopWatch?: () => void;

  constructor(kc: k8s.KubeConfig) {
    this.customObjectAPI = prepareCustomObjectAPI(kc);
    this.apisApi = kc.makeApiClient(k8s.ApisApi);
    this.customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
    this.customObjectWatch = prepareCustomObjectWatch(kc);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const { groups } = await this.apisApi.getAPIVersions();
      // The version matters as much as the group: every call below is pinned to
      // SANDBOX_API_VERSION, so a cluster serving only another version of the
      // group would pass a name-only probe and then 404 on everything.
      return groups.some(
        group =>
          group.name === SANDBOX_API_GROUP &&
          (group.versions ?? []).some(version => version.version === SANDBOX_API_VERSION),
      );
    } catch {
      // The probe decides between the cluster and the demo client; a failure here
      // means "not usable", never a broken page.
      return false;
    }
  }

  async listInNamespace(namespace: string): Promise<ISandboxList> {
    try {
      const resp = await this.customObjectAPI.listNamespacedCustomObject({
        group: SANDBOX_API_GROUP,
        version: SANDBOX_API_VERSION,
        namespace,
        plural: SANDBOX_PLURAL,
      });
      const list = resp as ISandboxList;
      return { ...list, items: list.items ?? [] };
    } catch (e) {
      throw createError(e, SANDBOX_API_ERROR_LABEL, `Unable to list sandboxes in "${namespace}"`);
    }
  }

  async getByName(namespace: string, name: string): Promise<ISandbox> {
    try {
      const resp = await this.customObjectAPI.getNamespacedCustomObject({
        group: SANDBOX_API_GROUP,
        version: SANDBOX_API_VERSION,
        namespace,
        plural: SANDBOX_PLURAL,
        name,
      });
      return resp as ISandbox;
    } catch (e) {
      throw createError(e, SANDBOX_API_ERROR_LABEL, `Unable to get sandbox "${namespace}/${name}"`);
    }
  }

  async create(namespace: string, sandbox: ISandbox): Promise<ISandbox> {
    // The namespace in the path wins, so a body cannot be used to write elsewhere.
    const body: ISandbox = {
      ...sandbox,
      metadata: { ...sandbox.metadata, namespace },
    };
    try {
      const resp = await this.customObjectAPI.createNamespacedCustomObject({
        group: SANDBOX_API_GROUP,
        version: SANDBOX_API_VERSION,
        namespace,
        plural: SANDBOX_PLURAL,
        body,
      });
      return resp as ISandbox;
    } catch (e) {
      throw createError(e, SANDBOX_API_ERROR_LABEL, `Unable to create sandbox in "${namespace}"`);
    }
  }

  async patch(namespace: string, name: string, patch: Record<string, unknown>): Promise<ISandbox> {
    try {
      const resp = await retryableExec(() =>
        this.customObjectsApi.patchNamespacedCustomObject(
          {
            group: SANDBOX_API_GROUP,
            version: SANDBOX_API_VERSION,
            namespace,
            plural: SANDBOX_PLURAL,
            name,
            body: patch,
          },
          MERGE_PATCH_OPTIONS,
        ),
      );
      return resp as ISandbox;
    } catch (e) {
      throw createError(e, SANDBOX_API_ERROR_LABEL, `Unable to patch sandbox "${name}"`);
    }
  }

  async delete(namespace: string, name: string): Promise<void> {
    try {
      await this.customObjectAPI.deleteNamespacedCustomObject({
        group: SANDBOX_API_GROUP,
        version: SANDBOX_API_VERSION,
        namespace,
        plural: SANDBOX_PLURAL,
        name,
      });
    } catch (e) {
      throw createError(e, SANDBOX_API_ERROR_LABEL, `Unable to delete sandbox "${name}"`);
    }
  }

  /**
   * Streams sandbox changes of one namespace to the listener, which the
   * WebSocket route forwards to the browser. This is what replaces the polling
   * the Agent Space UI used to do.
   */
  public async watchInNamespace(
    listener: MessageListener,
    params: api.webSocket.SubscribeParams,
  ): Promise<void> {
    const path = `/apis/${SANDBOX_API_GROUP}/${SANDBOX_API_VERSION}/namespaces/${params.namespace}/${SANDBOX_PLURAL}`;
    const queryParams = { watch: true, resourceVersion: params.resourceVersion };

    this.stopWatching();

    let abortController: AbortController | undefined;
    try {
      abortController = await this.customObjectWatch.watch(
        path,
        queryParams,
        (eventPhase: string, apiObj: ISandbox | V1Status) =>
          this.handleWatchMessage(eventPhase, apiObj, listener, params),
        (error: unknown) => {
          // Aborting is how stopWatching() works; it is not a failure.
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          try {
            logger.error(error, `Stopped watching ${path}.`);
            this.notifyWatchError(error, listener, params);
            abortController?.abort();
          } catch (callbackError) {
            logger.error(callbackError, `Error in sandboxes watch done callback for ${path}.`);
          }
        },
      );
    } catch (error) {
      logger.error(error, `Stopped watching ${path}.`);
      this.notifyWatchError(error, listener, params);
      return;
    }

    this.stopWatch = () => abortController?.abort();
  }

  private notifyWatchError(
    error: unknown,
    listener: MessageListener,
    params: api.webSocket.SubscribeParams,
  ): void {
    const status: V1Status = {
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      message: error instanceof Error ? error.message : String(error),
      code: error != null ? (error as { statusCode?: number }).statusCode : undefined,
    };
    listener({ eventPhase: api.webSocket.EventPhase.ERROR, status, params });
  }

  private handleWatchMessage(
    eventPhase: string,
    apiObj: ISandbox | V1Status,
    listener: MessageListener,
    params: api.webSocket.SubscribeParams,
  ): void {
    switch (eventPhase) {
      case api.webSocket.EventPhase.ADDED:
      case api.webSocket.EventPhase.MODIFIED:
      case api.webSocket.EventPhase.DELETED: {
        const sandbox = apiObj as api.webSocket.SandboxResource;
        listener({ eventPhase, sandbox });
        break;
      }
      case api.webSocket.EventPhase.ERROR: {
        const status = apiObj as V1Status;
        listener({ eventPhase, status, params });
        break;
      }
    }
  }

  /**
   * Stops watching Sandboxes.
   */
  public stopWatching(): void {
    this.stopWatch?.();
    this.stopWatch = undefined;
  }
}
