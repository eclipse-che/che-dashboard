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
import { DevWorkspaceClient as DevWorkspaceClientLibrary, IDevWorkspaceApi, IDevWorkspaceDevfile } from '@eclipse-che/devworkspace-client';
import { WorkspaceStatus } from '../helpers/types';
import { KeycloakSetupService } from '../keycloak/setup';
import { delay } from '../helpers/delay';

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

  private devworkspaceClient: IDevWorkspaceApi;
  private previousItems: Map<string, Map<string, IStatusUpdate>>;
  private _defaultEditor?: string;
  private _defaultPlugins?: string[];
  private maxStatusAttempts: number;

  constructor(@inject(KeycloakSetupService) keycloakSetupService: KeycloakSetupService) {
    super(keycloakSetupService);
    this.axios.defaults.baseURL = '/api/unsupported/k8s';
    this.devworkspaceClient = DevWorkspaceClientLibrary.getRestApi(this.axios).workspaceApi;
    this.previousItems = new Map();
    this.maxStatusAttempts = 10;
  }

  isEnabled(): Promise<boolean> {
    return this.devworkspaceClient.isApiEnabled();
  }

  async getAllWorkspaces(defaultNamespace: string): Promise<che.Workspace[]> {
    const workspaces = await this.devworkspaceClient.getAllWorkspaces(defaultNamespace);
    const availableWorkspaces: che.Workspace[] = [];
    for (const workspace of workspaces) {
      if (!isDeleting(workspace) && !isWebTerminal(workspace)) {
        availableWorkspaces.push(convertDevWorkspaceV2ToV1(workspace));
      }
    }
    return availableWorkspaces;
  }

  async getWorkspaceByName(namespace: string, workspaceName: string): Promise<che.Workspace> {
    let workspace = await this.devworkspaceClient.getWorkspaceByName(namespace, workspaceName);
    let attempted = 0;
    while ((!workspace.status || !workspace.status.phase || !workspace.status.ideUrl) && attempted < this.maxStatusAttempts) {
      workspace = await this.devworkspaceClient.getWorkspaceByName(namespace, workspaceName);
      attempted += 1;
      await delay();
    }
    if (!workspace.status || !workspace.status.phase || !workspace.status.ideUrl) {
      throw new Error(`Could not retrieve devworkspace status information from ${workspaceName} in namespace ${namespace}`);
    }
    return convertDevWorkspaceV2ToV1(workspace);
  }

  async create(devfile: IDevWorkspaceDevfile): Promise<che.Workspace> {
    const createdWorkspace = await this.devworkspaceClient.create(devfile, this._defaultEditor, this._defaultPlugins);
    return convertDevWorkspaceV2ToV1(createdWorkspace);
  }

  delete(namespace: string, name: string): void {
    this.devworkspaceClient.delete(namespace, name);
  }

  async changeWorkspaceStatus(namespace: string, name: string, started: boolean): Promise<che.Workspace> {
    const changedWorkspace = await this.devworkspaceClient.changeWorkspaceStatus(namespace, name, started);
    return convertDevWorkspaceV2ToV1(changedWorkspace);
  }

  /**
   * Initialize the given namespace
   * @param namespace The namespace you want to initialize
   * @returns If the namespace has been initialized
   */
  async initializeNamespace(namespace: string): Promise<boolean> {
    try {
      await this.devworkspaceClient.initializeNamespace(namespace);
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

  set defaultEditor(editor: string) {
    this._defaultEditor = editor;
  }

  set defaultPlugins(plugins: string[]) {
    this._defaultPlugins = plugins;
  }
}
