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

import {
  V1alpha2DevWorkspaceSpecTemplateComponents,
  V1alpha2DevWorkspaceTemplateSpec,
  V1alpha2DevWorkspaceTemplateSpecComponents,
  V230DevfileComponentsItemsContainer,
} from '@devfile/api';
import { api } from '@eclipse-che/common';
import { inject, injectable } from 'inversify';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';

import * as DwApi from '@/services/backend-client/devWorkspaceApi';
import * as DwtApi from '@/services/backend-client/devWorkspaceTemplateApi';
import devfileApi from '@/services/devfileApi';
import { DevWorkspacePlugin } from '@/services/devfileApi/devWorkspace';
import {
  DEVWORKSPACE_CHE_EDITOR,
  DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION,
} from '@/services/devfileApi/devWorkspace/metadata';
import {
  DEVWORKSPACE_CONFIG_ATTR,
  DEVWORKSPACE_CONTAINER_SCC_ATTR,
} from '@/services/devfileApi/devWorkspace/spec/template';
import { delay } from '@/services/helpers/delay';
import { isWebTerminal } from '@/services/helpers/devworkspace';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { fetchData } from '@/services/registry/fetchData';
import { WorkspaceAdapter } from '@/services/workspace-adapter';
import { DevWorkspaceDefaultPluginsHandler } from '@/services/workspace-client/devworkspace/DevWorkspaceDefaultPluginsHandler';
import { fetchEditor } from '@/services/workspace-client/devworkspace/devWorkspaceEditor';
import { isCheEditorYamlPath, normaliseDevWorkspace } from '@/services/workspace-client/helpers';
import { EDITOR_DEVFILE_API_QUERY } from '@/store/DevfileRegistries/const';
import { WorkspacesDefaultPlugins } from '@/store/Plugins/devWorkspacePlugins';

export const devWorkspaceVersion = 'v1alpha2';
export const devWorkspaceApiGroup = 'workspace.devfile.io';
export const devWorkspaceSingularSubresource = 'devworkspace';

export const COMPONENT_UPDATE_POLICY = 'che.eclipse.org/components-update-policy';
export const REGISTRY_URL = 'che.eclipse.org/plugin-registry-url';

export const DEVWORKSPACE_LABEL_METADATA_NAME = 'kubernetes.io/metadata.name';

export const DEVWORKSPACE_NEXT_START_ANNOTATION = 'che.eclipse.org/next-start-cfg';
export const DEVWORKSPACE_DEVFILE_SOURCE = 'che.eclipse.org/devfile-source';
export const DEVWORKSPACE_DEVFILE = 'che.eclipse.org/devfile';

export const DEVWORKSPACE_BOOTSTRAP = 'controller.devfile.io/bootstrap-devworkspace';
export const DEVWORKSPACE_DEBUG_START_ANNOTATION = 'controller.devfile.io/debug-start';

export const DEVWORKSPACE_METADATA_ANNOTATION = 'dw.metadata.annotations';

export interface ICheEditorOverrideContainer extends V230DevfileComponentsItemsContainer {
  name: string;
}
export interface ICheEditorYaml {
  inline?: devfileApi.Devfile;
  id?: string;
  reference?: string;
  registryUrl?: string;
  override?: {
    containers: ICheEditorOverrideContainer[];
  };
}

/**
 * This class manages the connection between the frontend and the devworkspace typescript library
 */
@injectable()
export class DevWorkspaceClient {
  private readonly maxStatusAttempts: number;
  private readonly pluginRegistryUrlEnvName: string;
  private readonly pluginRegistryInternalUrlEnvName: string;
  private readonly clusterConsoleUrlEnvName: string;
  private readonly clusterConsoleTitleEnvName: string;
  private readonly openVSXUrlEnvName: string;
  private readonly dashboardUrlEnvName: string;
  // HOST_USERS environment variable for controlling host user capabilities in DevWorkspace containers
  private readonly hostUsersEnvName: string;
  private readonly defaultPluginsHandler: DevWorkspaceDefaultPluginsHandler;

  constructor(
    @inject(DevWorkspaceDefaultPluginsHandler)
    defaultPluginsHandler: DevWorkspaceDefaultPluginsHandler,
  ) {
    this.maxStatusAttempts = 10;
    this.pluginRegistryUrlEnvName = 'CHE_PLUGIN_REGISTRY_URL';
    this.pluginRegistryInternalUrlEnvName = 'CHE_PLUGIN_REGISTRY_INTERNAL_URL';
    this.openVSXUrlEnvName = 'OPENVSX_REGISTRY_URL';
    this.dashboardUrlEnvName = 'CHE_DASHBOARD_URL';
    this.clusterConsoleUrlEnvName = 'CLUSTER_CONSOLE_URL';
    this.clusterConsoleTitleEnvName = 'CLUSTER_CONSOLE_TITLE';
    this.hostUsersEnvName = 'HOST_USERS';
    this.defaultPluginsHandler = defaultPluginsHandler;
  }

  async getAllWorkspaces(
    defaultNamespace: string,
  ): Promise<{ workspaces: devfileApi.DevWorkspace[]; resourceVersion: string }> {
    const listWorkspaces = await DwApi.listWorkspacesInNamespace(defaultNamespace);
    const {
      items,
      metadata: { resourceVersion },
    } = listWorkspaces?.metadata
      ? listWorkspaces
      : { items: [], metadata: { resourceVersion: '' } };
    const workspaces: devfileApi.DevWorkspace[] = [];
    for (const item of items) {
      if (!isWebTerminal(item)) {
        workspaces.push(normaliseDevWorkspace(item));
      }
    }
    return { workspaces, resourceVersion };
  }

  async getWorkspaceByName(
    namespace: string,
    workspaceName: string,
  ): Promise<devfileApi.DevWorkspace> {
    let workspace = await DwApi.getWorkspaceByName(namespace, workspaceName);
    let attempt = 0;
    while (!workspace.status?.phase && attempt < this.maxStatusAttempts) {
      if (attempt > 0) {
        await delay();
      }
      workspace = await DwApi.getWorkspaceByName(namespace, workspaceName);
      attempt++;
    }
    const workspaceStatus = workspace?.status;
    if (!workspaceStatus || !workspaceStatus.phase) {
      console.warn(
        `Could not retrieve devworkspace status information from ${workspaceName} in namespace ${namespace}`,
      );
    } else if (workspaceStatus.phase === DevWorkspaceStatus.RUNNING && !workspaceStatus?.mainUrl) {
      console.warn('Could not retrieve mainUrl for the running workspace');
    }

    return normaliseDevWorkspace(workspace);
  }

  async createDevWorkspace(
    defaultNamespace: string,
    devWorkspaceResource: devfileApi.DevWorkspace,
    editorId: string | undefined,
    customName?: string,
  ): Promise<{ headers: DwApi.Headers; devWorkspace: devfileApi.DevWorkspace }> {
    if (!devWorkspaceResource.spec.routingClass) {
      devWorkspaceResource.spec.routingClass = 'che';
    }
    devWorkspaceResource.spec.started = false;
    devWorkspaceResource.metadata.namespace = defaultNamespace;

    if (!devWorkspaceResource.metadata.annotations) {
      devWorkspaceResource.metadata.annotations = {};
    }

    devWorkspaceResource.metadata.annotations[DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION] =
      new Date().toISOString();

    if (editorId) {
      devWorkspaceResource.metadata.annotations[DEVWORKSPACE_CHE_EDITOR] = editorId;
    }

    if (!devWorkspaceResource.metadata.labels) {
      devWorkspaceResource.metadata.labels = {};
    }
    if (customName) {
      devWorkspaceResource.metadata.labels[DEVWORKSPACE_LABEL_METADATA_NAME] = customName;
    }

    const { headers, devWorkspace } = await DwApi.createWorkspace(devWorkspaceResource);

    return { headers, devWorkspace };
  }

  async createDevWorkspaceTemplate(
    defaultNamespace: string,
    devWorkspace: devfileApi.DevWorkspace,
    devWorkspaceTemplateResource: devfileApi.DevWorkspaceTemplate,
    pluginRegistryUrl: string | undefined,
    pluginRegistryInternalUrl: string | undefined,
    openVSXUrl: string | undefined,
    clusterConsole?: {
      url: string;
      title: string;
    },
  ): Promise<devfileApi.DevWorkspaceTemplate> {
    devWorkspaceTemplateResource.metadata.namespace = defaultNamespace;

    // add owner reference (to allow automatic cleanup)
    devWorkspaceTemplateResource.metadata.ownerReferences = [
      {
        apiVersion: `${devWorkspaceApiGroup}/${devWorkspaceVersion}`,
        kind: devWorkspaceSingularSubresource,
        name: devWorkspace.metadata.name,
        uid: devWorkspace.metadata.uid,
      },
    ];

    this.addEnvVarsToContainers(
      devWorkspaceTemplateResource.spec?.components,
      pluginRegistryUrl,
      pluginRegistryInternalUrl,
      openVSXUrl,
      clusterConsole,
    );

    return DwtApi.createTemplate(devWorkspaceTemplateResource);
  }

  /**
   * propagate the plugin registry, plugin internal registry,
   * and dashboard URLs into the components containers
   */
  public addEnvVarsToContainers(
    components:
      | V1alpha2DevWorkspaceSpecTemplateComponents[]
      | V1alpha2DevWorkspaceTemplateSpecComponents[]
      | undefined,
    pluginRegistryUrl: string | undefined,
    pluginRegistryInternalUrl: string | undefined,
    openVSXUrl: string | undefined,
    clusterConsole?: {
      url: string;
      title: string;
    },
  ): void {
    if (components === undefined) {
      return;
    }

    const dashboardUrl = window.location.origin;

    for (const component of components) {
      const container = component.container;
      if (container === undefined) {
        continue;
      }
      const envs = (container.env || []).filter(
        env =>
          env.name !== this.dashboardUrlEnvName &&
          env.name !== this.pluginRegistryUrlEnvName &&
          env.name !== this.pluginRegistryInternalUrlEnvName &&
          env.name !== this.clusterConsoleUrlEnvName &&
          env.name !== this.clusterConsoleTitleEnvName &&
          env.name !== this.openVSXUrlEnvName,
      );
      envs.push({
        name: this.dashboardUrlEnvName,
        value: dashboardUrl,
      });
      if (pluginRegistryUrl !== undefined) {
        envs.push({
          name: this.pluginRegistryUrlEnvName,
          value: pluginRegistryUrl,
        });
      }

      if (pluginRegistryInternalUrl !== undefined) {
        envs.push({
          name: this.pluginRegistryInternalUrlEnvName,
          value: pluginRegistryInternalUrl,
        });
      }
      if (clusterConsole?.url !== undefined) {
        envs.push({
          name: this.clusterConsoleUrlEnvName,
          value: clusterConsole.url,
        });
      }
      if (clusterConsole?.title !== undefined) {
        envs.push({
          name: this.clusterConsoleTitleEnvName,
          value: clusterConsole.title,
        });
      }
      if (openVSXUrl !== undefined) {
        envs.push({
          name: this.openVSXUrlEnvName,
          value: openVSXUrl,
        });
      }
      container.env = envs;
    }
  }

  /**
   * Called when a DevWorkspace has started.
   *
   * @param workspace The DevWorkspace that was started
   * @param editorId The editor id of the DevWorkspace that was started
   */
  async onStart(
    workspace: devfileApi.DevWorkspace,
    defaultPlugins: WorkspacesDefaultPlugins,
    editorId?: string,
  ) {
    if (editorId) {
      await this.defaultPluginsHandler.handle(workspace, editorId, defaultPlugins);
    }
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
  async update(
    workspace: devfileApi.DevWorkspace,
    plugins: devfileApi.Devfile[] = [],
  ): Promise<devfileApi.DevWorkspace> {
    // Take the devworkspace with no plugins and then inject them
    for (const plugin of plugins) {
      if (!plugin.metadata) {
        continue;
      }
      const pluginName = this.normalizePluginName(
        plugin.metadata.name,
        WorkspaceAdapter.getId(workspace),
      );
      this.addPlugin(workspace, pluginName, workspace.metadata.namespace);
    }

    const namespace = workspace.metadata.namespace;
    const name = workspace.metadata.name;

    const patch: api.IPatch[] = [];

    // Ensure /metadata/annotations exists before patching nested paths
    this.ensureMetadataAnnotations(workspace, patch);

    const updatingTimeAnnotationPath =
      '/metadata/annotations/' + this.escape(DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION);
    if (
      workspace.metadata.annotations?.[DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION] === undefined
    ) {
      patch.push({
        op: 'add',
        path: updatingTimeAnnotationPath,
        value: new Date().toISOString(),
      });
    } else {
      patch.push({
        op: 'replace',
        path: updatingTimeAnnotationPath,
        value: new Date().toISOString(),
      });
    }

    const nextStartAnnotationPath =
      '/metadata/annotations/' + this.escape(DEVWORKSPACE_NEXT_START_ANNOTATION);
    if (workspace.metadata.annotations?.[DEVWORKSPACE_NEXT_START_ANNOTATION]) {
      /**
       * This is the case when you are annotating a devworkspace and will restart it later
       */
      patch.push({
        op: 'add',
        path: nextStartAnnotationPath,
        value: workspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION],
      });
    } else {
      /**
       * This is the case when you are updating a devworkspace normally
       */
      patch.push({
        op: 'replace',
        path: '/spec',
        value: workspace.spec,
      });
      const onClusterWorkspace = await this.getWorkspaceByName(namespace, name);

      // If the workspace currently has DEVWORKSPACE_NEXT_START_ANNOTATION then delete it since we are starting a devworkspace normally
      if (
        onClusterWorkspace.metadata.annotations &&
        onClusterWorkspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION]
      ) {
        patch.push({
          op: 'remove',
          path: nextStartAnnotationPath,
        });
      }

      // Update workspace custom name if it has changed
      const currentCustomName =
        onClusterWorkspace.metadata.labels?.[DEVWORKSPACE_LABEL_METADATA_NAME];
      const newCustomName = workspace.metadata.labels?.[DEVWORKSPACE_LABEL_METADATA_NAME];
      if (newCustomName !== currentCustomName) {
        const customNamePath = '/metadata/labels/' + this.escape(DEVWORKSPACE_LABEL_METADATA_NAME);
        if (newCustomName) {
          // Ensure labels object exists
          if (!onClusterWorkspace.metadata.labels) {
            patch.push({
              op: 'add',
              path: '/metadata/labels',
              value: {},
            });
          }
          // Add or replace the custom name label
          if (currentCustomName === undefined) {
            patch.push({
              op: 'add',
              path: customNamePath,
              value: newCustomName,
            });
          } else {
            patch.push({
              op: 'replace',
              path: customNamePath,
              value: newCustomName,
            });
          }
        } else if (currentCustomName !== undefined) {
          // Remove the custom name label if it was cleared
          patch.push({
            op: 'remove',
            path: customNamePath,
          });
        }
      }
    }

    const { devWorkspace } = await DwApi.patchWorkspace(namespace, name, patch);
    return devWorkspace;
  }

  async updateAnnotation(workspace: devfileApi.DevWorkspace): Promise<devfileApi.DevWorkspace> {
    const patch: api.IPatch = {
      op: 'replace',
      path: '/metadata/annotations',
      value: workspace.metadata.annotations || {},
    };
    const { devWorkspace } = await DwApi.patchWorkspace(
      workspace.metadata.namespace,
      workspace.metadata.name,
      [patch],
    );
    return devWorkspace;
  }

  private escape(key: string): string {
    // We have to escape the slash and use ~1 instead. See https://tools.ietf.org/html/rfc6902#appendix-A.14
    return key.replace(/\//g, '~1');
  }

  /**
   * Created a normalize plugin name, which is a plugin name with all spaces replaced
   * to dashes and a workspaceId appended at the end
   * @param pluginName The name of the plugin
   * @param workspaceId The id of the workspace
   */
  private normalizePluginName(pluginName: string, workspaceId: string): string {
    return `${pluginName.replace(/ /g, '-').toLowerCase()}-${workspaceId}`;
  }

  async delete(namespace: string, name: string): Promise<void> {
    await DwApi.deleteWorkspace(namespace, name);
  }

  getDebugMode(workspace: devfileApi.DevWorkspace): boolean {
    return workspace.metadata.annotations?.[DEVWORKSPACE_DEBUG_START_ANNOTATION] === 'true';
  }

  async managePvcStrategy(
    workspace: devfileApi.DevWorkspace,
    config: api.IServerConfig,
  ): Promise<devfileApi.DevWorkspace> {
    const patch: api.IPatch[] = [];
    const cheNamespace = config.cheNamespace;
    let attributes = workspace.spec.template.attributes;
    if (cheNamespace) {
      const devworkspaceConfig = { name: 'devworkspace-config', namespace: cheNamespace };
      const devworkspaceConfigPath = `/spec/template/attributes/${this.escape(
        DEVWORKSPACE_CONFIG_ATTR,
      )}`;
      if (attributes) {
        if (!attributes[DEVWORKSPACE_CONFIG_ATTR]) {
          patch.push({ op: 'add', path: devworkspaceConfigPath, value: devworkspaceConfig });
        }
      } else {
        patch.push({
          op: 'add',
          path: '/spec/template/attributes',
          value: { [DEVWORKSPACE_CONFIG_ATTR]: devworkspaceConfig },
        });
        attributes = {};
      }
    }

    const openVSXURL = config.pluginRegistry?.openVSXURL || '';
    const components = cloneDeep(workspace.spec.template.components);
    if (components) {
      let shouldUpdate = false;
      components.forEach(component => {
        const envs = component.container?.env || [];
        envs.forEach(env => {
          if (env.name === this.openVSXUrlEnvName && env.value !== openVSXURL) {
            shouldUpdate = true;
            env.value = openVSXURL;
          }
        });
      });
      if (shouldUpdate) {
        patch.push({ op: 'replace', path: '/spec/template/components', value: components });
      }
    }

    if (patch.length === 0) {
      return workspace;
    }
    const { devWorkspace } = await DwApi.patchWorkspace(
      workspace.metadata.namespace,
      workspace.metadata.name,
      patch,
    );
    return devWorkspace;
  }

  async manageDebugMode(
    workspace: devfileApi.DevWorkspace,
    debugMode: boolean,
  ): Promise<devfileApi.DevWorkspace> {
    const patch: api.IPatch[] = [];
    const currentDebugMode = this.getDebugMode(workspace);
    if (currentDebugMode !== debugMode) {
      // Ensure /metadata/annotations exists before patching nested paths
      this.ensureMetadataAnnotations(workspace, patch);

      const path = `/metadata/annotations/${this.escape(DEVWORKSPACE_DEBUG_START_ANNOTATION)}`;
      if (!debugMode) {
        patch.push({ op: 'remove', path });
      } else {
        if (workspace.metadata.annotations?.[DEVWORKSPACE_DEBUG_START_ANNOTATION]) {
          patch.push({ op: 'replace', path, value: 'true' });
        } else {
          patch.push({ op: 'add', path, value: 'true' });
        }
      }
    }

    if (patch.length === 0) {
      return workspace;
    }
    const { devWorkspace } = await DwApi.patchWorkspace(
      workspace.metadata.namespace,
      workspace.metadata.name,
      patch,
    );
    return devWorkspace;
  }

  /**
   * Injects or removes the container scc attribute depending
   * on the CR `disableContainerBuildCapabilities` or `disableContainerRunCapabilities`
   * fields value.
   */
  async manageContainerSccAttribute(
    workspace: devfileApi.DevWorkspace,
    config: api.IServerConfig,
  ): Promise<devfileApi.DevWorkspace> {
    const patch: api.IPatch[] = [];

    if (!config.containerRun?.disableContainerRunCapabilities) {
      // container run capabilities is enabled.
      patch.push(
        ...this.manageContainerSccAttributeForCapability(
          workspace,
          config.containerRun.containerRunConfiguration,
          false,
        ),
      );
    } else if (!config.containerBuild?.disableContainerBuildCapabilities) {
      // container build capabilities is enabled.
      patch.push(
        ...this.manageContainerSccAttributeForCapability(
          workspace,
          config.containerBuild.containerBuildConfiguration,
          true,
        ),
      );
    } else {
      // container capabilities are disabled.
      patch.push(...this.deleteSccAttribute(workspace));
    }

    if (patch.length === 0) {
      return workspace;
    }

    const { devWorkspace } = await DwApi.patchWorkspace(
      workspace.metadata.namespace,
      workspace.metadata.name,
      patch,
    );
    return devWorkspace;
  }

  manageContainerSccAttributeForCapability(
    workspace: devfileApi.DevWorkspace,
    capabilityConfig: { openShiftSecurityContextConstraint?: string } | undefined,
    hostUsers: boolean,
  ): api.IPatch[] {
    const patch: api.IPatch[] = [];

    const sccName = capabilityConfig?.openShiftSecurityContextConstraint;
    if (!sccName) {
      console.warn(
        'Skip injecting the `controller.devfile.io/scc` attribute: "openShiftSecurityContextConstraint" is undefined',
      );
      return patch;
    }

    if (workspace.spec.template.attributes?.[DEVWORKSPACE_CONTAINER_SCC_ATTR]) {
      // if `controller.devfile.io/scc` attribute exists, then replace it
      patch.push(...this.replaceSccAttribute(workspace, sccName));
    } else {
      // if `controller.devfile.io/scc` attribute doesn't exist, then add it.
      patch.push(...this.addSccAttribute(workspace, sccName));
    }
    // Ensures, that HOST_USERS set correspondingly to `controller.devfile.io/scc` attribute
    patch.push(...this.setHostUsersEnvVar(workspace, hostUsers));

    return patch;
  }

  deleteSccAttribute(workspace: devfileApi.DevWorkspace): api.IPatch[] {
    const patch: api.IPatch[] = [];

    if (workspace.spec.template.attributes?.[DEVWORKSPACE_CONTAINER_SCC_ATTR]) {
      const path = `/spec/template/attributes/${this.escape(DEVWORKSPACE_CONTAINER_SCC_ATTR)}`;
      patch.push({ op: 'remove', path });
    }
    patch.push(...this.removeHostUsersEnvVar(workspace));

    return patch;
  }

  addSccAttribute(workspace: devfileApi.DevWorkspace, scc: string): api.IPatch[] {
    const patch: api.IPatch[] = [];

    if (!workspace.spec.template.attributes) {
      const path = '/spec/template/attributes';
      const value = {
        [DEVWORKSPACE_CONTAINER_SCC_ATTR]: scc,
      };
      patch.push({ op: 'add', path, value });
    } else {
      const path = `/spec/template/attributes/${this.escape(DEVWORKSPACE_CONTAINER_SCC_ATTR)}`;
      const value = scc;
      patch.push({ op: 'add', path, value });
    }

    return patch;
  }

  replaceSccAttribute(workspace: devfileApi.DevWorkspace, scc: string): api.IPatch[] {
    const patch: api.IPatch[] = [];

    if (workspace.spec.template.attributes?.[DEVWORKSPACE_CONTAINER_SCC_ATTR] !== scc) {
      const path = `/spec/template/attributes/${this.escape(DEVWORKSPACE_CONTAINER_SCC_ATTR)}`;
      const value = scc;
      patch.push({ op: 'replace', path, value });
    }

    return patch;
  }

  /**
   * Sets the HOST_USERS environment variable in all container components.
   * This controls whether containers run with host user capabilities.
   * @param workspace The DevWorkspace to update
   * @param hostUsers Whether to enable host users (true for container-build, false for container-run)
   * @returns Array of JSON patches to apply
   */
  setHostUsersEnvVar(workspace: devfileApi.DevWorkspace, hostUsers: boolean): api.IPatch[] {
    const patch: api.IPatch[] = [];

    const value = { name: this.hostUsersEnvName, value: hostUsers.toString() };
    const components = workspace.spec.template.components;
    if (!components) {
      return patch;
    }

    for (let cmpIndex = 0; cmpIndex < components.length; cmpIndex++) {
      const container = components[cmpIndex].container;
      if (container === undefined) {
        continue;
      }

      if (!container.env) {
        const path = `/spec/template/components/${cmpIndex}/container/env`;
        patch.push({ op: 'add', path, value: [value] });
        continue;
      }

      const envIndex = container.env.findIndex(value => value.name === this.hostUsersEnvName);
      if (envIndex >= 0) {
        const env = container.env[envIndex];
        // If value is different, then replace it
        if (env.value !== hostUsers.toString()) {
          const path = `/spec/template/components/${cmpIndex}/container/env/${envIndex}`;
          patch.push({ op: 'replace', path, value });
        }
      } else {
        // If environment variable is absent, then add it
        const path = `/spec/template/components/${cmpIndex}/container/env/-`;
        patch.push({ op: 'add', path, value });
      }
    }

    return patch;
  }

  /**
   * Removes the HOST_USERS environment variable from all container components.
   * Called when container capabilities are disabled.
   * @param workspace The DevWorkspace to update
   * @returns Array of JSON patches to apply
   */
  removeHostUsersEnvVar(workspace: devfileApi.DevWorkspace): api.IPatch[] {
    const patch: api.IPatch[] = [];

    const components = workspace.spec.template.components;
    if (!components) {
      return patch;
    }

    for (let cmpIndex = 0; cmpIndex < components.length; cmpIndex++) {
      const container = components[cmpIndex].container;
      if (!container?.env) {
        continue;
      }

      const envIndex = container.env.findIndex(value => value.name === this.hostUsersEnvName);
      if (envIndex >= 0) {
        const path = `/spec/template/components/${cmpIndex}/container/env/${envIndex}`;
        patch.push({ op: 'remove', path });
      }
    }

    return patch;
  }

  async changeWorkspaceStatus(
    workspace: devfileApi.DevWorkspace,
    started: boolean,
    skipErrorCheck?: boolean,
  ): Promise<devfileApi.DevWorkspace> {
    const patch: api.IPatch[] = [
      {
        op: 'replace',
        path: '/spec/started',
        value: started,
      },
    ];

    if (started) {
      // Ensure /metadata/annotations exists before patching nested paths
      this.ensureMetadataAnnotations(workspace, patch);

      const updatingTimeAnnotationPath =
        '/metadata/annotations/' + this.escape(DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION);
      if (
        workspace.metadata.annotations?.[DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION] === undefined
      ) {
        patch.push({
          op: 'add',
          path: updatingTimeAnnotationPath,
          value: new Date().toISOString(),
        });
      } else {
        patch.push({
          op: 'replace',
          path: updatingTimeAnnotationPath,
          value: new Date().toISOString(),
        });
      }
    }

    let { devWorkspace } = await DwApi.patchWorkspace(
      workspace.metadata.namespace,
      workspace.metadata.name,
      patch,
    );
    if (!skipErrorCheck) {
      const currentPhase = WorkspaceAdapter.getStatus(devWorkspace);
      // Need to request DevWorkspace again to get updated Status -- we've patched spec.started
      // but status still may contain an earlier error until DevWorkspace Operator updates it.
      if (currentPhase === DevWorkspaceStatus.FAILED) {
        devWorkspace = await DwApi.getWorkspaceByName(
          devWorkspace.metadata.namespace,
          devWorkspace.metadata.name,
        );
      }
      this.checkForDevWorkspaceError(devWorkspace);
    }

    return devWorkspace;
  }

  /**
   * Add the plugin to the workspace
   * @param workspace A devworkspace
   * @param pluginName The name of the plugin
   * @param namespace A namespace
   */
  private addPlugin(workspace: devfileApi.DevWorkspace, pluginName: string, namespace: string) {
    if (!workspace.spec.contributions) {
      workspace.spec.contributions = [];
    }
    const contributions = workspace.spec.contributions.filter(
      contribution => contribution.name !== pluginName,
    ) as DevWorkspacePlugin[];
    contributions.push({
      name: pluginName,
      kubernetes: {
        name: pluginName,
        namespace,
      },
    });
    workspace.spec.contributions = contributions;
  }

  public checkForDevWorkspaceError(devworkspace: devfileApi.DevWorkspace) {
    const currentPhase = WorkspaceAdapter.getStatus(devworkspace);
    if (currentPhase && currentPhase === DevWorkspaceStatus.FAILED) {
      const message = devworkspace.status?.message;
      if (message) {
        throw new Error(message);
      }
      throw new Error('Unknown error occurred when trying to process the devworkspace');
    }
  }

  private ensureMetadataAnnotations(workspace: devfileApi.DevWorkspace, patch: api.IPatch[]): void {
    if (!workspace.metadata.annotations) {
      patch.push({
        op: 'add',
        path: '/metadata/annotations',
        value: {},
      });
    }
  }

  async checkForTemplatesUpdate(
    editorName: string,
    namespace: string,
    editors: devfileApi.Devfile[],
    pluginRegistryUrl: string | undefined,
    pluginRegistryInternalUrl: string | undefined,
    openVSXUrl: string | undefined,
    clusterConsole?: { url: string; title: string },
  ): Promise<api.IPatch[]> {
    const patch: api.IPatch[] = [];
    const managedTemplate = await DwtApi.getTemplateByName(namespace, editorName);
    const _editorIdOrPath = managedTemplate.metadata?.annotations?.[REGISTRY_URL];
    const updatePolicy = managedTemplate.metadata?.annotations?.[COMPONENT_UPDATE_POLICY];

    if (!_editorIdOrPath || updatePolicy !== 'managed') {
      console.log('Template is not managed');
      return patch;
    }

    let url: string | undefined;
    if (/^(https?:\/\/)/.test(_editorIdOrPath)) {
      url = _editorIdOrPath;
      // Define a regular expression pattern to match URLs containing 'plugin-registry/v3/plugins'
      // and ending with 'devfile.yaml'. The part between 'v3/plugins/' and '/devfile.yaml' is captured.
      const pluginRegistryURLPattern = /plugin-registry\/v3\/plugins\/(.+?)\/devfile\.yaml$/;
      const match = url.match(pluginRegistryURLPattern);

      if (match) {
        const annotations = {
          [COMPONENT_UPDATE_POLICY]: 'managed',
          [REGISTRY_URL]: `${EDITOR_DEVFILE_API_QUERY}${match[1]}`,
        };
        // Create a patch to update the annotations by replacing plugin registry URL with the editor reference
        patch.push({
          op: 'replace',
          path: '/metadata/annotations',
          value: annotations,
        });
      }
    } else {
      url = `${EDITOR_DEVFILE_API_QUERY}${_editorIdOrPath}`;
      const annotations = {
        [COMPONENT_UPDATE_POLICY]: 'managed',
        [REGISTRY_URL]: url,
      };
      patch.push({
        op: 'replace',
        path: '/metadata/annotations',
        value: annotations,
      });
    }

    let editor: devfileApi.Devfile | undefined = undefined;
    // Found the target editors
    if (url.startsWith(EDITOR_DEVFILE_API_QUERY)) {
      const editorReference = url.replace(EDITOR_DEVFILE_API_QUERY, '');

      const _editor = editors.find(e => {
        return (
          e.metadata?.attributes?.publisher +
            '/' +
            e.metadata?.name +
            '/' +
            e.metadata?.attributes?.version ===
          editorReference
        );
      });
      if (_editor !== undefined) {
        editor = cloneDeep(_editor);
      }
    } else {
      const isCheEditorYamlFile = isCheEditorYamlPath(url);
      editor = await fetchEditor(url, fetchData, isCheEditorYamlFile);
    }

    if (editor === undefined) {
      console.warn('Failed to get editor');
      return patch;
    }

    const spec: Partial<V1alpha2DevWorkspaceTemplateSpec> = {};
    for (const key in editor) {
      if (key !== 'schemaVersion' && key !== 'metadata') {
        if (key === 'components') {
          editor.components?.forEach(component => {
            if (component.container && !component.container.sourceMapping) {
              component.container.sourceMapping = '/projects';
            }
          });
          spec.components = editor.components;
          this.addEnvVarsToContainers(
            spec.components,
            pluginRegistryUrl,
            pluginRegistryInternalUrl,
            openVSXUrl,
            clusterConsole,
          );
        } else {
          spec[key] = editor[key];
        }
      }
    }
    if (!isEqual(spec, managedTemplate.spec)) {
      patch.push({
        op: 'replace',
        path: '/spec',
        value: spec,
      });
    }

    return patch;
  }
}
