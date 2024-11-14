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

import common, { ApplicationId } from '@eclipse-che/common';
import { dump } from 'js-yaml';

import * as DwApi from '@/services/backend-client/devWorkspaceApi';
import { fetchResources } from '@/services/backend-client/devworkspaceResourcesApi';
import * as DwtApi from '@/services/backend-client/devWorkspaceTemplateApi';
import devfileApi from '@/services/devfileApi';
import { loadResourcesContent } from '@/services/registry/resources';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import * as clusterInfo from '@/store/ClusterInfo';
import * as DevfileRegistries from '@/store/DevfileRegistries';
import { getEditor } from '@/store/DevfileRegistries/getEditor';
import { verifyAuthorized } from '@/store/SanityCheck';
import * as serverConfig from '@/store/ServerConfig';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import {
  getEditorImage,
  updateEditorDevfile,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/editorImage';
import { getEditorName } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/updateEditor';
import { updateWorkspaceWithDefaultDevfile } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/updateWorkspaceWithDefaultDevfile';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@/services/backend-client/devWorkspaceApi');
jest.mock('@/services/backend-client/devworkspaceResourcesApi');
jest.mock('@/services/backend-client/devWorkspaceTemplateApi');
jest.mock('@/services/devfileApi');
jest.mock('@/services/registry/resources');
jest.mock('@/store/ClusterInfo');
jest.mock('@/store/DevfileRegistries');
jest.mock('@/store/DevfileRegistries/getEditor');
jest.mock('@/store/SanityCheck');
jest.mock('@/store/ServerConfig');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/editorImage');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/updateEditor');
jest.mock('@eclipse-che/common');
jest.mock('js-yaml');

describe('devWorkspaces, actions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateWorkspaceWithDefaultDevfile', () => {
    let store: ReturnType<typeof createMockStore>;
    const mockWorkspace = {
      metadata: {
        name: 'test-workspace',
        namespace: 'test-namespace',
        annotations: {},
      },
      spec: {
        template: {},
      },
    } as devfileApi.DevWorkspace;

    const mockState = {
      devWorkspaces: {
        isLoading: false,
        resourceVersion: '',
        workspaces: [mockWorkspace],
        startedWorkspaces: {},
        warnings: {},
      },
    };

    beforeEach(() => {
      store = createMockStore(mockState as Partial<RootState> as RootState);

      jest.spyOn(DevfileRegistries, 'selectDefaultDevfile').mockReturnValue({
        metadata: {
          name: 'default-devfile',
        },
      } as devfileApi.Devfile);

      jest.spyOn(serverConfig, 'selectDefaultEditor').mockReturnValue('che-editor');
      jest.spyOn(serverConfig, 'selectOpenVSXUrl').mockReturnValue('https://openvsx.org');
      jest
        .spyOn(serverConfig, 'selectPluginRegistryUrl')
        .mockReturnValue('https://plugin-registry.com');
      jest
        .spyOn(serverConfig, 'selectPluginRegistryInternalUrl')
        .mockReturnValue('https://internal-plugin-registry.com');
      jest.spyOn(clusterInfo, 'selectApplications').mockReturnValue([
        {
          id: ApplicationId.CLUSTER_CONSOLE,
          url: 'https://cluster-console.com',
          icon: '',
          title: 'Console',
        },
      ]);

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);

      (getEditor as jest.Mock).mockResolvedValue({
        content: 'editor-content',
        editorYamlUrl: 'https://editor-url.com/editor.yaml',
      });

      (dump as jest.Mock).mockReturnValue('dumped-devfile-content');

      (fetchResources as jest.Mock).mockResolvedValue('resources-content');

      (loadResourcesContent as jest.Mock).mockReturnValue([
        {
          kind: 'DevWorkspace',
          metadata: { annotations: {} },
          spec: {
            template: {
              components: [],
            },
            started: false,
            routingClass: 'che',
          },
        },
        {
          kind: 'DevWorkspaceTemplate',
          metadata: { annotations: {} },
          spec: {
            components: [],
          },
        },
      ]);

      (getDevWorkspaceClient as jest.Mock).mockReturnValue({
        addEnvVarsToContainers: jest.fn(),
      });

      (getEditorImage as jest.Mock).mockReturnValue('editor-image');

      (updateEditorDevfile as jest.Mock).mockReturnValue('updated-editor-content');

      (DwtApi.getTemplateByName as jest.Mock).mockResolvedValue({
        metadata: { annotations: {} },
        spec: {},
      });

      (DwtApi.patchTemplate as jest.Mock).mockResolvedValue({});

      (DwApi.patchWorkspace as jest.Mock).mockResolvedValue({
        devWorkspace: {
          metadata: {},
        },
      });

      (getEditorName as jest.Mock).mockReturnValue('editor-name');

      (common.helpers.errors.getMessage as jest.Mock).mockImplementation(
        (err: Error) => err.message,
      );
    });

    it('should dispatch update action on successful update', async () => {
      await store.dispatch(updateWorkspaceWithDefaultDevfile(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toStrictEqual(
        devWorkspacesUpdateAction({ metadata: {} } as devfileApi.DevWorkspace),
      );

      expect(verifyAuthorized).toHaveBeenCalledTimes(1);
      expect(getEditor).toHaveBeenCalledWith(
        'che-editor',
        expect.any(Function),
        expect.any(Function),
      );

      expect(fetchResources).toHaveBeenCalledWith({
        devfileContent: 'dumped-devfile-content',
        editorPath: undefined,
        editorContent: 'updated-editor-content',
      });

      expect(DwtApi.getTemplateByName).toHaveBeenCalledWith('test-namespace', 'editor-name');
      expect(DwtApi.patchTemplate).toHaveBeenCalled();

      expect(DwApi.patchWorkspace).toHaveBeenCalledWith(
        'test-namespace',
        'test-workspace',
        expect.any(Array),
      );
    });

    it('should handle errors and dispatch error action', async () => {
      const errorMessage = 'Failed to update';
      (DwApi.patchWorkspace as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(
        store.dispatch(updateWorkspaceWithDefaultDevfile(mockWorkspace)),
      ).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toEqual([
        devWorkspacesRequestAction(),
        devWorkspacesErrorAction(
          `Failed to update the workspace ${mockWorkspace.metadata.name}, reason: ${errorMessage}`,
        ),
      ]);
    });

    it('should throw error if default devfile is not defined', async () => {
      jest.spyOn(DevfileRegistries, 'selectDefaultDevfile').mockReturnValue(undefined);

      await expect(
        store.dispatch(updateWorkspaceWithDefaultDevfile(mockWorkspace)),
      ).rejects.toThrow('Cannot define default devfile');

      const actions = store.getActions();
      expect(actions).toEqual([]);
    });

    it('should throw error if default editor is not defined', async () => {
      jest.spyOn(serverConfig, 'selectDefaultEditor').mockReturnValue('');

      await expect(
        store.dispatch(updateWorkspaceWithDefaultDevfile(mockWorkspace)),
      ).rejects.toThrow('Cannot define default editor');

      const actions = store.getActions();
      expect(actions).toEqual([]);
    });
  });
});
