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

import devfileApi from '@/services/devfileApi';
import { FactoryParams } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { che } from '@/services/models';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import * as clusterInfo from '@/store/ClusterInfo';
import * as infrastructureNamespaces from '@/store/InfrastructureNamespaces';
import { verifyAuthorized } from '@/store/SanityCheck';
import * as serverConfig from '@/store/ServerConfig';
import { createWorkspaceFromResources } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/createWorkspaceFromResources';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { updateDevWorkspaceTemplate } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/editorImage';
import {
  devWorkspacesAddAction,
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspaceWarningUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/store/SanityCheck');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/editorImage');
jest.mock('@/store/ServerConfig');
jest.mock('@/store/InfrastructureNamespaces');
jest.mock('@/store/ClusterInfo');

describe('devWorkspaces, actions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkspaceFromResources', () => {
    let store: ReturnType<typeof createMockStore>;
    const mockCreateDevWorkspace = jest.fn();
    const mockCreateDevWorkspaceTemplate = jest.fn();
    const mockUpdateDevWorkspace = jest.fn();
    const mockVerifyAuthorized = verifyAuthorized as jest.MockedFunction<typeof verifyAuthorized>;
    const mockUpdateDevWorkspaceTemplate = updateDevWorkspaceTemplate as jest.MockedFunction<
      typeof updateDevWorkspaceTemplate
    >;

    const mockWorkspace = {
      metadata: {
        namespace: 'test-namespace',
        name: 'test-workspace',
        uid: '1',
      },
    } as devfileApi.DevWorkspace;

    const mockWorkspaceTemplate = {} as devfileApi.DevWorkspaceTemplate;

    const mockFactoryParams = {} as Partial<FactoryParams>;

    beforeEach(() => {
      store = createMockStore({} as Partial<RootState> as RootState);

      jest.spyOn(infrastructureNamespaces, 'selectDefaultNamespace').mockReturnValue({
        name: 'default-namespace',
      } as che.KubernetesNamespace);
      jest.spyOn(serverConfig, 'selectOpenVSXUrl').mockReturnValue('https://openvsx.org');
      jest
        .spyOn(serverConfig, 'selectPluginRegistryUrl')
        .mockReturnValue('https://plugin-registry.com');
      jest
        .spyOn(serverConfig, 'selectPluginRegistryInternalUrl')
        .mockReturnValue('https://internal-plugin-registry.com');
      jest.spyOn(serverConfig, 'selectDefaultEditor').mockReturnValue('che-editor');
      jest.spyOn(clusterInfo, 'selectApplications').mockReturnValue([
        {
          id: ApplicationId.CLUSTER_CONSOLE,
          url: 'https://cluster-console.com',
          icon: '',
          title: 'Console',
        },
      ]);

      (getDevWorkspaceClient as jest.Mock).mockReturnValue({
        createDevWorkspace: mockCreateDevWorkspace,
        createDevWorkspaceTemplate: mockCreateDevWorkspaceTemplate,
        updateDevWorkspace: mockUpdateDevWorkspace,
      });

      mockCreateDevWorkspace.mockResolvedValue({
        devWorkspace: mockWorkspace,
        headers: {},
      });

      mockUpdateDevWorkspace.mockResolvedValue({
        devWorkspace: mockWorkspace,
        headers: {},
      });

      mockUpdateDevWorkspaceTemplate.mockReturnValue(mockWorkspaceTemplate);

      (mockVerifyAuthorized as jest.Mock).mockResolvedValue(true);

      (common.helpers.errors.getMessage as jest.Mock).mockImplementation((e: Error) => e.message);
    });

    it('should dispatch add action on successful workspace creation', async () => {
      await store.dispatch(
        createWorkspaceFromResources(mockWorkspace, mockWorkspaceTemplate, mockFactoryParams),
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(devWorkspacesAddAction(mockWorkspace));

      expect(mockVerifyAuthorized).toHaveBeenCalled();

      expect(mockCreateDevWorkspace).toHaveBeenCalledWith(
        'default-namespace',
        mockWorkspace,
        'che-editor',
      );

      expect(mockCreateDevWorkspaceTemplate).toHaveBeenCalled();

      expect(mockUpdateDevWorkspace).toHaveBeenCalledWith(mockWorkspace);
    });

    it('should handle warnings from createDevWorkspace and dispatch warning action', async () => {
      mockCreateDevWorkspace.mockResolvedValueOnce({
        devWorkspace: mockWorkspace,
        headers: {
          warning: '299 - Some warning message',
        },
      });

      await store.dispatch(
        createWorkspaceFromResources(mockWorkspace, mockWorkspaceTemplate, mockFactoryParams),
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(3);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(
        devWorkspaceWarningUpdateAction({
          warning: 'Some warning message',
          workspace: mockWorkspace,
        }),
      );
      expect(actions[2]).toEqual(devWorkspacesAddAction(mockWorkspace));
    });

    it('should handle warnings from updateDevWorkspace and dispatch warning action', async () => {
      mockUpdateDevWorkspace.mockResolvedValueOnce({
        devWorkspace: mockWorkspace,
        headers: {
          warning: '299 - Another warning message',
        },
      });

      await store.dispatch(
        createWorkspaceFromResources(mockWorkspace, mockWorkspaceTemplate, mockFactoryParams),
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(3);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(
        devWorkspaceWarningUpdateAction({
          warning: 'Another warning message',
          workspace: mockWorkspace,
        }),
      );
      expect(actions[2]).toEqual(devWorkspacesAddAction(mockWorkspace));
    });

    it('should use provided editor if specified', async () => {
      await store.dispatch(
        createWorkspaceFromResources(
          mockWorkspace,
          mockWorkspaceTemplate,
          mockFactoryParams,
          'custom-editor',
        ),
      );

      expect(mockCreateDevWorkspace).toHaveBeenCalledWith(
        'default-namespace',
        mockWorkspace,
        'custom-editor',
      );
    });

    it('should handle errors during workspace creation', async () => {
      const errorMessage = 'Creation failed';
      mockCreateDevWorkspace.mockRejectedValueOnce(new Error(errorMessage));

      await expect(
        store.dispatch(
          createWorkspaceFromResources(mockWorkspace, mockWorkspaceTemplate, mockFactoryParams),
        ),
      ).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(
        devWorkspacesErrorAction(`Failed to create a new workspace, reason: ${errorMessage}`),
      );
    });

    it('should handle authorization failures', async () => {
      const errorMessage = 'Not authorized';
      mockVerifyAuthorized.mockRejectedValueOnce(new Error(errorMessage));

      await expect(
        store.dispatch(
          createWorkspaceFromResources(mockWorkspace, mockWorkspaceTemplate, mockFactoryParams),
        ),
      ).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        devWorkspacesErrorAction(`Failed to create a new workspace, reason: ${errorMessage}`),
      );
    });
  });
});
