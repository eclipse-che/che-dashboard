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

import { inject, injectable } from 'inversify';
import { isWebTerminal } from '../../helpers/devworkspace';
import { WorkspaceClient } from '../index';
import {
  IDevWorkspaceDevfile, IDevWorkspace, IDevWorkspaceTemplate, IPatch,
} from './types';
import {
  devWorkspaceApiGroup, devworkspaceSingularSubresource, devworkspaceVersion
} from './converters';
import { DevWorkspaceStatus } from '../../helpers/types';
import { KeycloakSetupService } from '../../keycloak/setup';
import { delay } from '../../helpers/delay';
import { ThunkDispatch } from 'redux-thunk';
import { State } from '../../../store/Workspaces/devWorkspaces';
import { Action } from 'redux';
import { AppState, AppThunk } from '../../../store';
import { V1alpha2DevWorkspace, V1alpha2DevWorkspaceTemplate, V1alpha2DevWorkspaceSpecTemplate } from '@devfile/api';
import { InversifyBinding } from '@eclipse-che/che-theia-devworkspace-handler/lib/inversify/inversify-binding';
import { CheTheiaPluginsDevfileResolver } from '@eclipse-che/che-theia-devworkspace-handler/lib/devfile/che-theia-plugins-devfile-resolver';
import { SidecarPolicy } from '@eclipse-che/che-theia-devworkspace-handler/lib/api/devfile-context';
import * as DwApi from '../../assets/dashboard-backend/devWorkspaceApi';
import * as DwtApi from '../../assets/dashboard-backend/devWorkspaceTemplateApi';
import * as DwCheApi from '../../assets/dashboard-backend/cheWorkspaceApi';
import { WebsocketClient, SubscribeMessage } from '../../assets/dashboard-backend/websocketClient';
export interface IStatusUpdate {
  error?: string;
  message?: string;
  status?: string;
  prevStatus?: string;
  workspaceId: string;
}

export const DEVWORKSPACE_NEXT_START_ANNOTATION = 'che.eclipse.org/next-start-cfg';

export const DEVWORKSPACE_DEVFILE_SOURCE = 'che.eclipse.org/devfile-source';

export const DEVWORKSPACE_METADATA_ANNOTATION = 'dw.metadata.annotations';

/**
 * This class manages the connection between the frontend and the devworkspace typescript library
 */
@injectable()
export class Index extends WorkspaceClient {
  private previousItems: Map<string, Map<string, IStatusUpdate>>;
  private readonly maxStatusAttempts: number;
  private lastDevWorkspaceLog: Map<string, string>;
  private pluginRegistryUrlEnvName: string;
  private dashboardUrlEnvName: string;
  private readonly websocketClient: WebsocketClient;
  private intervalId: number | undefined;

  constructor(@inject(KeycloakSetupService) keycloakSetupService: KeycloakSetupService) {
    super(keycloakSetupService);
    this.previousItems = new Map();
    this.maxStatusAttempts = 10;
    this.lastDevWorkspaceLog = new Map();
    this.pluginRegistryUrlEnvName = 'CHE_PLUGIN_REGISTRY_URL';
    this.dashboardUrlEnvName = 'CHE_DASHBOARD_URL';

    this.websocketClient = new WebsocketClient();
  }

  isEnabled(): Promise<boolean> {
    return Promise.resolve(true); // this.client.isDevWorkspaceApiEnabled();
  }

  async getAllWorkspaces(defaultNamespace: string): Promise<IDevWorkspace[]> {
    const workspaces = await DwApi.listWorkspacesInNamespace(defaultNamespace);
    const availableWorkspaces: IDevWorkspace[] = [];
    for (const workspace of workspaces) {
      if (!isWebTerminal(workspace)) {
        availableWorkspaces.push(workspace);
      }
    }
    return availableWorkspaces;
  }

  async getWorkspaceByName(namespace: string, workspaceName: string): Promise<IDevWorkspace> {
    let workspace = await DwApi.getWorkspaceByName(namespace, workspaceName);
    let attempted = 0;
    while ((!workspace.status || !workspace.status.phase || !workspace.status.mainUrl) && attempted < this.maxStatusAttempts) {
      workspace = await DwApi.getWorkspaceByName(namespace, workspaceName);
      this.checkForDevWorkspaceError(workspace);
      attempted += 1;
      await delay();
    }
    this.checkForDevWorkspaceError(workspace);
    const workspaceStatus = workspace.status;
    if (!workspaceStatus || !workspaceStatus.phase) {
      throw new Error(`Could not retrieve devworkspace status information from ${workspaceName} in namespace ${namespace}`);
    } else if (workspaceStatus.phase === DevWorkspaceStatus.RUNNING && !workspaceStatus?.mainUrl) {
      throw new Error('Could not retrieve mainUrl for the running workspace');
    }
    return workspace;
  }

  async create(devfile: IDevWorkspaceDevfile, defaultNamespace: string, pluginsDevfile: IDevWorkspaceDevfile[], pluginRegistryUrl: string | undefined, optionalFilesContent: {
    [fileName: string]: string
  },): Promise<IDevWorkspace> {
    if (!devfile.components) {
      devfile.components = [];
    }

    const createdWorkspace = await DwApi.createWorkspace(devfile, defaultNamespace, false);
    const namespace = createdWorkspace.metadata.namespace;
    const name = createdWorkspace.metadata.name;
    const workspaceId = createdWorkspace.status.devworkspaceId;

    const devfileGroupVersion = `${devWorkspaceApiGroup}/${devworkspaceVersion}`;
    const devWorkspaceTemplates: V1alpha2DevWorkspaceTemplate[] = [];
    for (const pluginDevfile of pluginsDevfile) {
      // TODO handle error in a proper way
      const pluginName = this.normalizePluginName(pluginDevfile.metadata.name, workspaceId);

      const theiaDWT = {
        kind: 'DevWorkspaceTemplate',
        apiVersion: devfileGroupVersion,
        metadata: {
          name: pluginName,
          namespace,
        },
        spec: pluginDevfile
      };
      devWorkspaceTemplates.push(theiaDWT);
    }

    const devWorkspace: V1alpha2DevWorkspace = createdWorkspace;
    // call theia library to insert all the logic
    const inversifyBindings = new InversifyBinding();
    const container = await inversifyBindings.initBindings({
      pluginRegistryUrl: pluginRegistryUrl || '',
      axiosInstance: this.axios,
      insertTemplates: false,
    });
    const cheTheiaPluginsContent = optionalFilesContent['.che/che-theia-plugins.yaml'];
    const vscodeExtensionsJsonContent = optionalFilesContent['.vscode/extensions.json'];
    const cheTheiaPluginsDevfileResolver = container.get(CheTheiaPluginsDevfileResolver);

    let sidecarPolicy: SidecarPolicy;
    const devfileCheTheiaSidecarPolicy = (devfile as V1alpha2DevWorkspaceSpecTemplate).attributes?.['che-theia.eclipse.org/sidecar-policy'];
    if (devfileCheTheiaSidecarPolicy === 'USE_DEV_CONTAINER') {
      sidecarPolicy = SidecarPolicy.USE_DEV_CONTAINER;
    } else {
      sidecarPolicy = SidecarPolicy.MERGE_IMAGE;
    }
    console.debug('Loading devfile', devfile, 'with optional .che/che-theia-plugins.yaml', cheTheiaPluginsContent, 'and .vscode/extensions.json', vscodeExtensionsJsonContent, 'with sidecar policy', sidecarPolicy);
    // call library to update dashboard-backend and add optional templates
    await cheTheiaPluginsDevfileResolver.handle({
      devfile,
      cheTheiaPluginsContent,
      vscodeExtensionsJsonContent,
      devWorkspace,
      devWorkspaceTemplates,
      sidecarPolicy,
      suffix: workspaceId,
    });
    console.debug('Devfile updated to', devfile, ' and templates updated to', devWorkspaceTemplates);

    await Promise.all(devWorkspaceTemplates.map(async template => {
      if (!template.metadata) {
        template.metadata = {};
      }

      // Update the namespace
      (template.metadata as any).namespace = namespace;

      // Update owner reference (to allow automatic cleanup)
      (template.metadata as any).ownerReferences = [
        {
          apiVersion: devfileGroupVersion,
          kind: devworkspaceSingularSubresource,
          name: createdWorkspace.metadata.name,
          uid: createdWorkspace.metadata.uid
        }
      ];

      // propagate the plugin registry and dashboard urls to the containers in the initial devworkspace templates
      if (template.spec?.components) {
        for (const component of template.spec?.components) {
          const container = component.container;
          if (container) {
            if (!container.env) {
              container.env = [];
            }
            container.env.push(...[{
              name: this.dashboardUrlEnvName,
              value: window.location.origin,
            }, {
              name: this.pluginRegistryUrlEnvName,
              value: pluginRegistryUrl || ''
            }]);
          }
        }
      }

      const pluginDWT = await DwtApi.createTemplate(<IDevWorkspaceTemplate>template);
      this.addPlugin(createdWorkspace, pluginDWT.metadata.name, pluginDWT.metadata.namespace);
    }));

    createdWorkspace.spec.started = true;
    const patch = [
      {
        op: 'replace',
        path: '/spec',
        value: createdWorkspace.spec,
      }
    ];
    return DwApi.patchWorkspace(namespace, name, patch);
  }

  /**
   * Update a devworkspace.
   * If the workspace you want to update has the DEVWORKSPACE_NEXT_START_ANNOTATION then
   * patch the cluster object with the value of DEVWORKSPACE_NEXT_START_ANNOTATION and don't restart the devworkspace.
   *
   * If the workspace does not specify DEVWORKSPACE_NEXT_START_ANNOTATION then
   * update the spec of the devworkspace and remove DEVWORKSPACE_NEXT_START_ANNOTATION if it exists.
   *
   * @param workspace The DevWorkspace you want to update
   * @param plugins The plugins you want to inject into the devworkspace
   */
  async update(workspace: IDevWorkspace, plugins: IDevWorkspaceDevfile[]): Promise<IDevWorkspace> {
    // Take the devworkspace with no plugins and then inject them
    for (const plugin of plugins) {
      const pluginName = this.normalizePluginName(plugin.metadata.name, workspace.status.devworkspaceId);
      this.addPlugin(workspace, pluginName, workspace.metadata.namespace);
    }

    const namespace = workspace.metadata.namespace;
    const name = workspace.metadata.name;

    const patch: IPatch[] = [];

    if (workspace.metadata.annotations && workspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION]) {

      /**
       * This is the case when you are annotating a devworkspace and will restart it later
       */
      patch.push(
        {
          op: 'add',
          path: '/metadata/annotations',
          value: {
            [DEVWORKSPACE_NEXT_START_ANNOTATION]: workspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION]
          }
        },

      );
    } else {
      /**
       * This is the case when you are updating a devworkspace normally
       */
      patch.push(
        {
          op: 'replace',
          path: '/spec',
          value: workspace.spec,
        }
      );
      const onClusterWorkspace = await this.getWorkspaceByName(namespace, name);

      // If the workspace currently has DEVWORKSPACE_NEXT_START_ANNOTATION then delete it since we are starting a devworkspace normally
      if (onClusterWorkspace.metadata.annotations && onClusterWorkspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION]) {
        // We have to escape the slash when removing the annotation and ~1 is used as the escape character https://tools.ietf.org/html/rfc6902#appendix-A.14
        const escapedAnnotation = DEVWORKSPACE_NEXT_START_ANNOTATION.replace('/', '~1');
        patch.push(
          {
            op: 'remove',
            path: `/metadata/annotations/${escapedAnnotation}`,
          }
        );
      }
    }

    return DwApi.patchWorkspace(namespace, name, patch);
  }

  /**
   * Created a normalize plugin name, which is a plugin name with all spaces replaced
   * to dashes and a workspaceId appended at the end
   * @param pluginName The name of the plugin
   * @param workspaceId The id of the workspace
   */
  private normalizePluginName(pluginName: string, workspaceId: string): string {
    return `${pluginName.replaceAll(' ', '-').toLowerCase()}-${workspaceId}`;
  }

  async delete(namespace: string, name: string): Promise<void> {
    await DwApi.deleteWorkspace(namespace, name);
  }

  async changeWorkspaceStatus(namespace: string, name: string, started: boolean): Promise<IDevWorkspace> {
    const changedWorkspace = await DwApi.patchWorkspace(namespace, name, [{
      op: 'replace',
      path: '/spec/started',
      value: started
    }]);
    if (!started && changedWorkspace.status?.devworkspaceId) {
      this.lastDevWorkspaceLog.delete(changedWorkspace.status.devworkspaceId);
    }
    this.checkForDevWorkspaceError(changedWorkspace);
    return changedWorkspace;
  }

  /**
   * Add the plugin to the workspace
   * @param workspace A devworkspace
   * @param pluginName The name of the plugin
   */
  private addPlugin(workspace: IDevWorkspace, pluginName: string, namespace: string) {
    if (!workspace.spec.template.components) {
      workspace.spec.template.components = [];
    }
    workspace.spec.template.components.push({
      name: pluginName,
      plugin: {
        kubernetes: {
          name: pluginName,
          namespace
        }
      }
    });
  }

  /**
   * Initialize the given namespace
   * @param namespace The namespace you want to initialize
   * @returns If the namespace has been initialized
   */
  async initializeNamespace(namespace: string): Promise<void> {
    return DwCheApi.initializeNamespace(namespace);
  }

  async subscribeToNamespace(
    namespace: string,
    callbacks: {
      updateDevWorkspaceStatus: (message: IStatusUpdate) => AppThunk<Action, void>,
      updateDeletedDevWorkspaces: (deletedWorkspacesIds: string[]) => AppThunk<Action, void>,
      updateAddedDevWorkspaces: (workspace: IDevWorkspace[]) => AppThunk<Action, void>,
    },
    dispatch: ThunkDispatch<State, undefined, Action>,
    getState: () => AppState,
  ): Promise<void> {

    await this.websocketClient.connect();

    const message: SubscribeMessage = {
      request: 'SUBSCRIBE',
      params: { namespace },
      channel: 'onModified'
    };
    await this.websocketClient.subscribe(message);
    this.websocketClient.addListener(message.channel, (devworkspace: IDevWorkspace) => {
      const statusUpdate = this.createStatusUpdate(devworkspace);

      const message = devworkspace.status.message;
      if (message) {
        const workspaceId = devworkspace.status.devworkspaceId;
        const lastMessage = this.lastDevWorkspaceLog.get(workspaceId);

        // Only add new messages we haven't seen before
        if (lastMessage !== message) {
          statusUpdate.message = message;
          this.lastDevWorkspaceLog.set(workspaceId, message);
        }
      }
      callbacks.updateDevWorkspaceStatus(statusUpdate)(dispatch, getState, undefined);
    });

    // websocketClient KeepAlive
    const keepAliveTimeout = 60 * 1000;
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }
    this.intervalId = window.setInterval(async () => {
      await this.websocketClient.subscribe(message);
    }, keepAliveTimeout);

    message.channel = 'onAdded';
    await this.websocketClient.subscribe(message);
    this.websocketClient.addListener(message.channel, (workspace: IDevWorkspace) => {
      callbacks.updateAddedDevWorkspaces([workspace])(dispatch, getState, undefined);
    });

    message.channel = 'onDeleted';
    await this.websocketClient.subscribe(message);
    this.websocketClient.addListener(message.channel, (workspacesId: string) => {
      callbacks.updateDeletedDevWorkspaces([workspacesId])(dispatch, getState, undefined);
    });

  }

  /**
   * Create a status update between the previously recieving DevWorkspace with a certain workspace id
   * and the new DevWorkspace
   * @param devworkspace The incoming DevWorkspace
   */
  private createStatusUpdate(devworkspace: IDevWorkspace): IStatusUpdate {
    const namespace = devworkspace.metadata.namespace;
    const workspaceId = devworkspace.status.devworkspaceId;
    // Starting devworkspaces don't have status defined
    const status = typeof devworkspace.status.phase === 'string'
      ? devworkspace.status.phase
      : DevWorkspaceStatus.STARTING;

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
    if (currentPhase && currentPhase === DevWorkspaceStatus.FAILED) {
      const message = devworkspace.status.message;
      if (message) {
        throw new Error(devworkspace.status.message);
      }
      throw new Error('Unknown error occured when trying to process the devworkspace');
    }
  }
}
