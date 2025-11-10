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

import common, { api, ApplicationId } from '@eclipse-che/common';
import { dump } from 'js-yaml';

import * as DwApi from '@/services/backend-client/devWorkspaceApi';
import { fetchResources } from '@/services/backend-client/devworkspaceResourcesApi';
import * as DwtApi from '@/services/backend-client/devWorkspaceTemplateApi';
import devfileApi from '@/services/devfileApi';
import {
  DEVWORKSPACE_CHE_EDITOR,
  DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION,
} from '@/services/devfileApi/devWorkspace/metadata';
import { loadResourcesContent } from '@/services/registry/resources';
import {
  COMPONENT_UPDATE_POLICY,
  REGISTRY_URL,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { AppThunk } from '@/store';
import { selectApplications } from '@/store/ClusterInfo';
import { selectDefaultDevfile } from '@/store/DevfileRegistries';
import { getEditor } from '@/store/DevfileRegistries/getEditor';
import { verifyAuthorized } from '@/store/SanityCheck';
import {
  selectDefaultEditor,
  selectOpenVSXUrl,
  selectPluginRegistryInternalUrl,
  selectPluginRegistryUrl,
} from '@/store/ServerConfig';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import {
  getEditorImage,
  updateEditorDevfile,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/editorImage';
import { getEditorName } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/updateEditor';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export const updateWorkspaceWithDefaultDevfile =
  (workspace: devfileApi.DevWorkspace): AppThunk =>
  async (dispatch, getState) => {
    const state = getState();
    const defaultsDevfile = selectDefaultDevfile(state);
    if (!defaultsDevfile) {
      throw new Error('Cannot define default devfile');
    }
    const defaultsEditor = selectDefaultEditor(state);
    if (!defaultsEditor) {
      throw new Error('Cannot define default editor');
    }
    const openVSXUrl = selectOpenVSXUrl(state);
    const pluginRegistryUrl = selectPluginRegistryUrl(state);
    const pluginRegistryInternalUrl = selectPluginRegistryInternalUrl(state);
    const clusterConsole = selectApplications(state).find(
      app => app.id === ApplicationId.CLUSTER_CONSOLE,
    );

    let editorContent: string | undefined;
    let editorYamlUrl: string | undefined;
    let devWorkspaceResource: devfileApi.DevWorkspace;
    let devWorkspaceTemplateResource: devfileApi.DevWorkspaceTemplate;

    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(devWorkspacesRequestAction());

      const response = await getEditor(defaultsEditor, dispatch, getState);
      if (response.content) {
        editorContent = response.content;
        editorYamlUrl = response.editorYamlUrl;
      } else {
        throw new Error(response.error);
      }
      console.debug(`Using default editor ${defaultsEditor}`);

      defaultsDevfile.metadata.name = workspace.metadata.name;
      delete defaultsDevfile.metadata.generateName;

      const editorImage = getEditorImage(workspace);
      if (editorImage) {
        editorContent = updateEditorDevfile(editorContent, editorImage);
      }
      const resourcesContent = await fetchResources({
        devfileContent: dump(defaultsDevfile),
        editorPath: undefined,
        editorContent,
      });
      const resources = loadResourcesContent(resourcesContent);
      devWorkspaceResource = resources.find(
        resource => resource.kind === 'DevWorkspace',
      ) as devfileApi.DevWorkspace;
      if (devWorkspaceResource === undefined) {
        throw new Error('Failed to find a DevWorkspace in the fetched resources.');
      }
      if (devWorkspaceResource.metadata) {
        if (!devWorkspaceResource.metadata.annotations) {
          devWorkspaceResource.metadata.annotations = {};
        }
      }
      if (!devWorkspaceResource.spec.routingClass) {
        devWorkspaceResource.spec.routingClass = 'che';
      }
      devWorkspaceResource.spec.started = false;

      getDevWorkspaceClient().addEnvVarsToContainers(
        devWorkspaceResource.spec.template.components,
        pluginRegistryUrl,
        pluginRegistryInternalUrl,
        openVSXUrl,
        clusterConsole,
      );
      if (!devWorkspaceResource.metadata.annotations) {
        devWorkspaceResource.metadata.annotations = {};
      }
      devWorkspaceResource.spec.contributions = workspace.spec.contributions;

      // add projects from the origin workspace
      devWorkspaceResource.spec.template.projects = workspace.spec.template.projects;

      devWorkspaceTemplateResource = resources.find(
        resource => resource.kind === 'DevWorkspaceTemplate',
      ) as devfileApi.DevWorkspaceTemplate;
      if (devWorkspaceTemplateResource === undefined) {
        throw new Error('Failed to find a DevWorkspaceTemplate in the fetched resources.');
      }
      if (!devWorkspaceTemplateResource.metadata.annotations) {
        devWorkspaceTemplateResource.metadata.annotations = {};
      }

      // removes endpoints with 'urlRewriteSupport: false'
      const components = devWorkspaceTemplateResource.spec?.components || [];
      components.forEach(component => {
        if (component.container && Array.isArray(component.container.endpoints)) {
          component.container.endpoints = component.container.endpoints.filter(endpoint => {
            const attributes = endpoint.attributes as { urlRewriteSupported: boolean };
            return attributes.urlRewriteSupported;
          });
        }
      });

      if (editorYamlUrl) {
        devWorkspaceTemplateResource.metadata.annotations[COMPONENT_UPDATE_POLICY] = 'managed';
        devWorkspaceTemplateResource.metadata.annotations[REGISTRY_URL] = editorYamlUrl;
      }

      getDevWorkspaceClient().addEnvVarsToContainers(
        devWorkspaceTemplateResource.spec?.components,
        pluginRegistryUrl,
        pluginRegistryInternalUrl,
        openVSXUrl,
        clusterConsole,
      );
      let targetTemplate: devfileApi.DevWorkspaceTemplate | undefined;
      const templateName = getEditorName(workspace);
      const templateNamespace = workspace.metadata.namespace;
      if (templateName && templateNamespace) {
        targetTemplate = await DwtApi.getTemplateByName(templateNamespace, templateName);
      }
      if (!templateName || !templateNamespace || !targetTemplate) {
        throw new Error('Cannot define the target template');
      }

      const targetTemplatePatch: api.IPatch[] = [];
      if (targetTemplate.metadata.annotations) {
        targetTemplatePatch.push({
          op: 'replace',
          path: '/metadata/annotations',
          value: devWorkspaceTemplateResource.metadata.annotations,
        });
      } else {
        targetTemplatePatch.push({
          op: 'add',
          path: '/metadata/annotations',
          value: devWorkspaceTemplateResource.metadata.annotations,
        });
      }
      targetTemplatePatch.push({
        op: 'replace',
        path: '/spec',
        value: devWorkspaceTemplateResource.spec,
      });
      await DwtApi.patchTemplate(templateNamespace, templateName, targetTemplatePatch);

      const targetWorkspacePatch: api.IPatch[] = [];
      devWorkspaceResource.metadata.annotations[DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION] =
        new Date().toISOString();
      devWorkspaceResource.metadata.annotations[DEVWORKSPACE_CHE_EDITOR] = defaultsEditor;
      if (workspace.metadata.annotations) {
        targetWorkspacePatch.push({
          op: 'replace',
          path: '/metadata/annotations',
          value: devWorkspaceResource.metadata.annotations,
        });
      } else {
        targetWorkspacePatch.push({
          op: 'add',
          path: '/metadata/annotations',
          value: devWorkspaceResource.metadata.annotations,
        });
      }
      targetWorkspacePatch.push({
        op: 'replace',
        path: '/spec',
        value: devWorkspaceResource.spec,
      });
      const { devWorkspace } = await DwApi.patchWorkspace(
        workspace.metadata.namespace,
        workspace.metadata.name,
        targetWorkspacePatch,
      );

      dispatch(devWorkspacesUpdateAction(devWorkspace));
    } catch (e) {
      const errorMessage =
        `Failed to update the workspace ${workspace.metadata.name}, reason: ` +
        common.helpers.errors.getMessage(e);
      dispatch(devWorkspacesErrorAction(errorMessage));
      throw e;
    }
  };
