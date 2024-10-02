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

import common from '@eclipse-che/common';

import devfileApi from '@/services/devfileApi';
import { DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION } from '@/services/devfileApi/devWorkspace/metadata';
import { che } from '@/services/models';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import * as infrastructureNamespaces from '@/store/InfrastructureNamespaces';
import { verifyAuthorized } from '@/store/SanityCheck';
import { actionCreators } from '@/store/Workspaces/devWorkspaces/actions';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { requestWorkspaces } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/requestWorkspaces';
import {
  devWorkspacesErrorAction,
  devWorkspacesReceiveAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateStartedAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@/store/InfrastructureNamespaces');
jest.mock('@/store/SanityCheck');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers');
jest.mock('@eclipse-che/common');

const mockNamespace = {
  name: 'test-namespace',
  attributes: {
    phase: 'Active',
  },
};

jest.spyOn(infrastructureNamespaces, 'selectDefaultNamespace').mockReturnValue(mockNamespace);
(verifyAuthorized as jest.Mock).mockResolvedValue(true);

describe('devWorkspaces, actions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestWorkspaces', () => {
    let store: ReturnType<typeof createMockStore>;
    const mockGetAllWorkspaces = jest.fn();
    const mockUpdateWorkspace = jest.fn();

    beforeEach(() => {
      store = createMockStore({
        devWorkspaces: {
          isLoading: false,
          resourceVersion: '',
          workspaces: [],
          startedWorkspaces: {},
          warnings: {},
        },
      } as Partial<RootState> as RootState);

      (getDevWorkspaceClient as jest.Mock).mockReturnValue({
        getAllWorkspaces: mockGetAllWorkspaces,
      });

      (actionCreators.updateWorkspace as jest.Mock).mockImplementation(() => mockUpdateWorkspace);
    });

    it('should dispatch receive action on successful fetch', async () => {
      const mockWorkspaces = [
        {
          metadata: { name: 'workspace1', annotations: {} },
        },
        {
          metadata: {
            name: 'workspace2',
            annotations: { [DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION]: '12345' },
          },
        },
      ] as devfileApi.DevWorkspace[];
      const mockResourceVersion = '12345';

      mockGetAllWorkspaces.mockResolvedValue({
        workspaces: mockWorkspaces,
        resourceVersion: mockResourceVersion,
      });

      await store.dispatch(requestWorkspaces());

      const actions = store.getActions();
      expect(actions).toHaveLength(3);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(
        devWorkspacesReceiveAction({
          workspaces: mockWorkspaces,
          resourceVersion: mockResourceVersion,
        }),
      );
      expect(actions[2]).toEqual(devWorkspacesUpdateStartedAction(mockWorkspaces));

      // updateWorkspace should be called only for the workspace without timestamp annotation
      expect(actionCreators.updateWorkspace).toHaveBeenCalledTimes(1);
      expect(actionCreators.updateWorkspace).toHaveBeenCalledWith(mockWorkspaces[0]);
    });

    it('should handle when there is no default namespace', async () => {
      jest
        .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
        .mockReturnValueOnce({} as che.KubernetesNamespace);

      await store.dispatch(requestWorkspaces());

      const actions = store.getActions();
      expect(actions).toHaveLength(3);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(
        devWorkspacesReceiveAction({
          workspaces: [],
          resourceVersion: '',
        }),
      );
      expect(actions[2]).toEqual(devWorkspacesUpdateStartedAction([]));
    });

    it('should handle errors during fetching workspaces', async () => {
      const error = new Error('Test Error');
      mockGetAllWorkspaces.mockRejectedValue(error);
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue('Test Error Message');

      await expect(store.dispatch(requestWorkspaces())).rejects.toThrow(error);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(
        devWorkspacesErrorAction(
          'Failed to fetch available workspaces, reason: Test Error Message',
        ),
      );
    });

    it('should handle authorization failure', async () => {
      const error = new Error('Authorization failed');
      (verifyAuthorized as jest.Mock).mockRejectedValue(error);
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue('Authorization failed');

      await expect(store.dispatch(requestWorkspaces())).rejects.toThrow(error);

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        devWorkspacesErrorAction(
          'Failed to fetch available workspaces, reason: Authorization failed',
        ),
      );
    });
  });
});
