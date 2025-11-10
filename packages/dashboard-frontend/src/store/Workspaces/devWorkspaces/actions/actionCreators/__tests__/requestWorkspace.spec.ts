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

import common, { helpers } from '@eclipse-che/common';

import devfileApi from '@/services/devfileApi';
import { DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION } from '@/services/devfileApi/devWorkspace/metadata';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { verifyAuthorized } from '@/store/SanityCheck';
import { actionCreators } from '@/store/Workspaces/devWorkspaces/actions/actionCreators';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { requestWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/requestWorkspace';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@/store/SanityCheck');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers');
jest.mock('@eclipse-che/common');

(verifyAuthorized as jest.Mock).mockResolvedValue(true);

const mockNamespace = 'test-namespace';
const mockName = 'test-workspace';
const mockWorkspace = {
  metadata: {
    namespace: mockNamespace,
    name: mockName,
    resourceVersion: '1',
  },
} as devfileApi.DevWorkspace;
const mockReceivedWorkspace = {
  metadata: {
    namespace: mockNamespace,
    name: mockName,
    resourceVersion: '2',
  },
} as devfileApi.DevWorkspace;

const mockGetWorkspaceByName = jest.fn().mockImplementation(() => {
  return mockReceivedWorkspace;
});
(getDevWorkspaceClient as jest.Mock).mockReturnValue({
  getWorkspaceByName: mockGetWorkspaceByName,
});

(actionCreators.updateWorkspace as jest.Mock).mockImplementation(() => async () => {});

describe('devWorkspaces, actions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestWorkspace', () => {
    let store: ReturnType<typeof createMockStore>;

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
    });

    it('should handle error when authorization fails', async () => {
      const errorMessage = 'You are not authorized to perform this action';
      (verifyAuthorized as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      (common.helpers.errors.getMessage as jest.Mock).mockReturnValueOnce(errorMessage);

      await expect(store.dispatch(requestWorkspace(mockWorkspace))).rejects.toThrow(
        'You are not authorized to perform this action',
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        devWorkspacesErrorAction(
          `Failed to fetch the workspace ${mockWorkspace.metadata.name}, reason: ${errorMessage}`,
        ),
      );
    });

    it('should dispatch update action on successful fetch, and then call the updateWorkspace action', async () => {
      await store.dispatch(requestWorkspace(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(devWorkspacesUpdateAction(mockReceivedWorkspace));

      expect(mockGetWorkspaceByName).toHaveBeenCalledWith(mockNamespace, mockName);
      expect(actionCreators.updateWorkspace).toHaveBeenCalledWith(mockReceivedWorkspace);
    });

    it('should dispatch update action on successful fetch, and do not call the updateWorkspace action', async () => {
      const mockWorkspaceWithAnnotations = {
        ...mockWorkspace,
        metadata: {
          ...mockWorkspace.metadata,
          annotations: {
            [DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION]: '12345',
          },
        },
      } as devfileApi.DevWorkspace;
      mockGetWorkspaceByName.mockReturnValueOnce(mockWorkspaceWithAnnotations);

      await store.dispatch(requestWorkspace(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(devWorkspacesUpdateAction(mockWorkspaceWithAnnotations));

      expect(mockGetWorkspaceByName).toHaveBeenCalledWith(mockNamespace, mockName);
      expect(actionCreators.updateWorkspace).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching the workspace', async () => {
      const errorMessage = 'Network error';

      mockGetWorkspaceByName.mockRejectedValueOnce(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValueOnce(errorMessage);

      await expect(store.dispatch(requestWorkspace(mockWorkspace))).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(
        devWorkspacesErrorAction(
          `Failed to fetch the workspace ${mockName}, reason: ${errorMessage}`,
        ),
      );
    });
  });
});
