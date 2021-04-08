/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { inject, injectable } from 'inversify';
import { convertDevWorkspaceV2ToV1, isDeleting, isWebTerminal } from '../helpers/devworkspace';
import { WorkspaceClient } from './';
import { RestApi as DevWorkspaceRestApi, IDevWorkspaceApi, IDevWorkspaceDevfile, IDevWorkspace, IDevWorkspaceTemplateApi, IDevWorkspaceTemplate, devWorkspaceApiGroup, devworkspaceSingularSubresource, devworkspaceVersion, ICheApi } from '@eclipse-che/devworkspace-client';
import { DevWorkspaceStatus, WorkspaceStatus } from '../helpers/types';
import { KeycloakSetupService } from '../keycloak/setup';
import { delay } from '../helpers/delay';
import { RestApi } from '@eclipse-che/devworkspace-client/dist/browser';

export interface IStatusUpdate {
  error?: string;
  status?: string;
  prevStatus?: string;
  workspaceId: string;
}

/**
 * This class manages the connection between the frontend and the devworkspace typescript library
 */
@injectable()
export class DevWorkspaceClient extends WorkspaceClient {

  private dwApi: IDevWorkspaceApi;
  private dwtApi: IDevWorkspaceTemplateApi;
  private dwCheApi: ICheApi;
  private previousItems: Map<string, Map<string, IStatusUpdate>>;
  private client: RestApi;
  private maxStatusAttempts: number;
  private initializing: Promise<void>;

  constructor(@inject(KeycloakSetupService) keycloakSetupService: KeycloakSetupService) {
    super(keycloakSetupService);
    this.axios.defaults.baseURL = '/api/unsupported/k8s';
    this.client = new DevWorkspaceRestApi(this.axios);
    this.dwCheApi = this.client.cheApi;
    this.dwApi = this.client.devworkspaceApi;
    this.dwtApi = this.client.templateApi;
    this.previousItems = new Map();
    this.maxStatusAttempts = 10;
  }

  isEnabled(): Promise<boolean> {
    return this.client.isDevWorkspaceApiEnabled();
  }

  async getAllWorkspaces(defaultNamespace: string): Promise<che.Workspace[]> {
    await this.initializing;
    const workspaces = await this.dwApi.listInNamespace(defaultNamespace);
    const availableWorkspaces: che.Workspace[] = [];
    for (const workspace of workspaces) {
      if (!isDeleting(workspace) && !isWebTerminal(workspace)) {
        availableWorkspaces.push(convertDevWorkspaceV2ToV1(workspace));
      }
    }
    return availableWorkspaces;
  }

  async getWorkspaceByName(namespace: string, workspaceName: string): Promise<che.Workspace> {
    let workspace = await this.dwApi.getByName(namespace, workspaceName);
    let attempted = 0;
    while ((!workspace.status || !workspace.status.phase || !workspace.status.ideUrl) && attempted < this.maxStatusAttempts) {
      workspace = await this.dwApi.getByName(namespace, workspaceName);
      this.checkForDevWorkspaceError(workspace);
      attempted += 1;
      await delay();
    }
    this.checkForDevWorkspaceError(workspace);
    const workspaceStatus = workspace.status;
    if (!workspaceStatus || !workspaceStatus.phase) {
      throw new Error(`Could not retrieve devworkspace status information from ${workspaceName} in namespace ${namespace}`);
    } else if (workspaceStatus.phase.toUpperCase() === DevWorkspaceStatus[DevWorkspaceStatus.RUNNING] && !workspaceStatus?.ideUrl) {
      throw new Error('Could not retrieve ideUrl for the running workspace');
    }
    return convertDevWorkspaceV2ToV1(workspace);
  }

  async create(devfile: IDevWorkspaceDevfile, pluginsDevfile: IDevWorkspaceDevfile[]): Promise<che.Workspace> {
    if (!devfile.components) {
      devfile.components = [];
    }

    const createdWorkspace = await this.dwApi.create(devfile, 'che', false);
    const namespace = createdWorkspace.metadata.namespace;

    for (const pluginDevfile of pluginsDevfile) {
      // todo handle error in a proper way
      const pluginName = pluginDevfile.metadata.name.replaceAll(' ', '-').toLowerCase();
      const workspaceId = createdWorkspace.status.devworkspaceId;
      const devfileGroupVersion = `${devWorkspaceApiGroup}/${devworkspaceVersion}`;
      const theiaDWT = await this.dwtApi.create(<IDevWorkspaceTemplate>{
        kind: 'DevWorkspaceTemplate',
        apiVersion: devfileGroupVersion,
        metadata: {
          name: `${pluginName}-${workspaceId}`,
          namespace,
          ownerReferences: [
            {
              apiVersion: devfileGroupVersion,
              kind: devworkspaceSingularSubresource,
              name: createdWorkspace.metadata.name,
              uid: createdWorkspace.metadata.uid
            }
          ]
        },
        spec: pluginDevfile
      });

      createdWorkspace.spec.template.components.push({
        name: theiaDWT.metadata.name,
        plugin: {
          kubernetes: {
            name: theiaDWT.metadata.name,
            namespace: theiaDWT.metadata.namespace
          }
        }
      });
    }

    createdWorkspace.spec.started = true;
    const updatedWorkspace = await this.dwApi.update(createdWorkspace);

    return convertDevWorkspaceV2ToV1(updatedWorkspace);
  }

  delete(namespace: string, name: string): void {
    this.dwApi.delete(namespace, name);
  }

  async changeWorkspaceStatus(namespace: string, name: string, started: boolean): Promise<che.Workspace> {
    const changedWorkspace = await this.dwApi.changeStatus(namespace, name, started);
    this.checkForDevWorkspaceError(changedWorkspace);
    return convertDevWorkspaceV2ToV1(changedWorkspace);
  }

  /**
   * Initialize the given namespace
   * @param namespace The namespace you want to initialize
   * @returns If the namespace has been initialized
   */
  async initializeNamespace(namespace: string): Promise<boolean> {
    try {
      this.initializing = new Promise((resolve, reject) => {
        this.dwCheApi.initializeNamespace(namespace).then(_ => {
          resolve(undefined);
        });
      });
      await this.initializing;
    } catch (e) {
      console.error(e);
      return false;
    }
    return true;
  }

  subscribeToNamespace(
    defaultNamespace: string,
    callback: any,
    dispatch: any
  ): void {
    setInterval(async () => {
      // This is a temporary solution until websockets work. Ideally we should just have a websocket connection here.
      const devworkspaces = await this.getAllWorkspaces(defaultNamespace);
      devworkspaces.forEach((devworkspace: che.Workspace) => {
        const statusUpdate = this.createStatusUpdate(devworkspace);
        callback(
          {
            id: devworkspace.id,
          } as che.Workspace,
          statusUpdate
        )(dispatch);
      });
    }, 1000);
  }

  /**
   * Create a status update between the previously recieving DevWorkspace with a certain workspace id
   * and the new DevWorkspace
   * @param devworkspace The incoming DevWorkspace
   */
  private createStatusUpdate(devworkspace: che.Workspace): IStatusUpdate {
    const namespace = devworkspace.namespace as string;
    const workspaceId = devworkspace.id;
    // Starting devworkspaces don't have status defined
    const status = devworkspace.status && typeof devworkspace.status === 'string' ? devworkspace.status.toUpperCase() : WorkspaceStatus[WorkspaceStatus.STARTING];

    const prevWorkspace = this.previousItems.get(namespace);
    if (prevWorkspace) {
      const prevStatus = prevWorkspace.get(workspaceId);
      const newUpdate: IStatusUpdate = {
        workspaceId: workspaceId,
        status: status,
        prevStatus: prevStatus?.status,
      };
      prevWorkspace.set(workspaceId, newUpdate);
      return newUpdate;
    } else {
      // there is not a previous update
      const newStatus: IStatusUpdate = {
        workspaceId,
        status: status,
        prevStatus: status,
      };

      const newStatusMap = new Map<string, IStatusUpdate>();
      newStatusMap.set(workspaceId, newStatus);
      this.previousItems.set(namespace, newStatusMap);
      return newStatus;
    }
  }

  checkForDevWorkspaceError(devworkspace: IDevWorkspace) {
    const currentPhase = devworkspace.status?.phase;
    if (currentPhase && currentPhase.toUpperCase() === DevWorkspaceStatus[DevWorkspaceStatus.FAILED]) {
      const message = devworkspace.status.message;
      if (message) {
        throw new Error(devworkspace.status.message);
      }
      throw new Error('Unknown error occured when trying to process the devworkspace');
    }
  }
}
