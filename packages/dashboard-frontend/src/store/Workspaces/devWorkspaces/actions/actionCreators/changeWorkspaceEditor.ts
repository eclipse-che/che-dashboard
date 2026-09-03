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

import { V1alpha2DevWorkspaceTemplateSpec } from '@devfile/api';
import common, { ApplicationId } from '@eclipse-che/common';
import cloneDeep from 'lodash/cloneDeep';

import * as DwApi from '@/services/backend-client/devWorkspaceApi';
import * as DwtApi from '@/services/backend-client/devWorkspaceTemplateApi';
import devfileApi from '@/services/devfileApi';
import { DEVWORKSPACE_CHE_EDITOR } from '@/services/devfileApi/devWorkspace/metadata';
import { Workspace } from '@/services/workspace-adapter';
import {
  COMPONENT_UPDATE_POLICY,
  DEVWORKSPACE_DEVFILE_SOURCE,
  REGISTRY_URL,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { AppThunk } from '@/store';
import { selectApplications } from '@/store/ClusterInfo/selectors';
import { EDITOR_DEVFILE_API_QUERY } from '@/store/DevfileRegistries/const';
import { verifyAuthorized } from '@/store/SanityCheck';
import { selectServerConfigState } from '@/store/ServerConfig/selectors';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { getEditorName } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/updateEditor';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export const changeWorkspaceEditor =
  (workspace: Workspace, newEditorId: string): AppThunk =>
  async (dispatch, getState) => {
    const dw = workspace.ref;
    const namespace = dw.metadata.namespace;
    const workspaceName = dw.metadata.name;
    const state = getState();

    try {
      await verifyAuthorized(dispatch, getState);
      dispatch(devWorkspacesRequestAction());

      // Resolve editor devfile from store (same source checkForTemplatesUpdate uses at start time)
      const editors = state.dwPlugins.cmEditors || [];
      const editorDevfile = editors.find(
        e =>
          `${e.metadata.attributes.publisher}/${e.metadata.name}/${e.metadata.attributes.version}` ===
          newEditorId,
      );
      if (!editorDevfile) {
        throw new Error(`Editor "${newEditorId}" not found in the plugin registry`);
      }

      // Build template spec — same logic as checkForTemplatesUpdate uses internally
      const spec: Partial<V1alpha2DevWorkspaceTemplateSpec> = {};
      for (const key in editorDevfile) {
        if (key === 'schemaVersion' || key === 'metadata') {
          continue;
        }
        if (key === 'components') {
          const components = cloneDeep(editorDevfile.components ?? []);
          components.forEach(c => {
            if (c.container && !c.container.sourceMapping) {
              c.container.sourceMapping = '/projects';
            }
          });
          spec.components = components as V1alpha2DevWorkspaceTemplateSpec['components'];
        } else {
          (spec as Record<string, unknown>)[key] = (
            editorDevfile as unknown as Record<string, unknown>
          )[key];
        }
      }

      // Step 1: create new template (reuse createDevWorkspaceTemplate — adds ownerRef + env vars)
      const newEditorName = newEditorId.split('/')[1];
      const newTemplateName = `${newEditorName}-${workspaceName}`;

      const newTemplate: devfileApi.DevWorkspaceTemplate = {
        apiVersion: 'workspace.devfile.io/v1alpha2',
        kind: 'DevWorkspaceTemplate',
        metadata: {
          name: newTemplateName,
          namespace,
          annotations: {
            [COMPONENT_UPDATE_POLICY]: 'managed',
            [REGISTRY_URL]: `${EDITOR_DEVFILE_API_QUERY}${newEditorId}`,
          },
        },
        spec,
      };

      const serverConfig = selectServerConfigState(state).config;
      const clusterConsole = selectApplications(state).find(
        app => app.id === ApplicationId.CLUSTER_CONSOLE,
      );
      await getDevWorkspaceClient().createDevWorkspaceTemplate(
        namespace,
        dw,
        newTemplate,
        serverConfig?.pluginRegistryURL,
        serverConfig?.pluginRegistryInternalURL,
        serverConfig?.pluginRegistry?.openVSXURL,
        clusterConsole,
      );

      // Step 2: patch workspace — annotations + spec.contributions
      const annotations = { ...(dw.metadata.annotations ?? {}) };
      annotations[DEVWORKSPACE_CHE_EDITOR] = newEditorId;
      const devfileSource = annotations[DEVWORKSPACE_DEVFILE_SOURCE] ?? '';
      annotations[DEVWORKSPACE_DEVFILE_SOURCE] = devfileSource.replace(
        /che-editor=[^&\n]+/,
        `che-editor=${newEditorId}`,
      );

      const { devWorkspace: updatedDw } = await DwApi.patchWorkspace(namespace, workspaceName, [
        { op: 'replace', path: '/metadata/annotations', value: annotations },
        { op: 'replace', path: '/spec/contributions/0/kubernetes/name', value: newTemplateName },
      ]);
      dispatch(devWorkspacesUpdateAction(updatedDw));

      // Step 3: delete old template (ownerRef also GC-s it on workspace delete — explicit for cleanliness)
      const oldTemplateName = getEditorName(dw);
      if (oldTemplateName && oldTemplateName !== newTemplateName) {
        await DwtApi.deleteTemplate(namespace, oldTemplateName);
      }
    } catch (e) {
      const errorMessage =
        `Failed to change editor for workspace ${workspaceName}, reason: ` +
        common.helpers.errors.getMessage(e);
      dispatch(devWorkspacesErrorAction(errorMessage));
      throw e;
    }
  };
