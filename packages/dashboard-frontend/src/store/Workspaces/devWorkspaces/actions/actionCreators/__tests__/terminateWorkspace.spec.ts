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

import common from '@eclipse-che/common';

import devfileApi from '@/services/devfileApi';
import { WorkspaceAdapter } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { verifyAuthorized } from '@/store/SanityCheck';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { terminateWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/terminateWorkspace';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesTerminateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/store/SanityCheck');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers');
jest.mock('@/services/workspace-adapter');

describe('devWorkspaces, actions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('terminateWorkspace', () => {
    let store: ReturnType<typeof createMockStore>;
    const mockDelete = jest.fn();
    const mockWorkspace = {
      metadata: {
        namespace: 'test-namespace',
        name: 'test-workspace',
        uid: '1',
      },
    } as devfileApi.DevWorkspace;

    beforeEach(() => {
      store = createMockStore({
        devWorkspaces: {
          isLoading: false,
          resourceVersion: '',
          workspaces: [mockWorkspace],
          startedWorkspaces: {},
          warnings: {},
        },
      } as Partial<RootState> as RootState);

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (getDevWorkspaceClient as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });
      (WorkspaceAdapter.getUID as jest.Mock).mockReturnValue(mockWorkspace.metadata.uid);
      (common.helpers.errors.getMessage as jest.Mock).mockImplementation((e: Error) => e.message);
    });

    it('should dispatch terminate action on successful deletion', async () => {
      await store.dispatch(terminateWorkspace(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(
        devWorkspacesTerminateAction({
          workspaceUID: mockWorkspace.metadata.uid,
          message: 'Cleaning up resources for deletion',
        }),
      );

      expect(mockDelete).toHaveBeenCalledWith(
        mockWorkspace.metadata.namespace,
        mockWorkspace.metadata.name,
      );
    });

    it('should handle authorization failure', async () => {
      const errorMessage = 'Not authorized';
      (verifyAuthorized as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(store.dispatch(terminateWorkspace(mockWorkspace))).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        devWorkspacesErrorAction(
          `Failed to delete the workspace ${mockWorkspace.metadata.name}, reason: ${errorMessage}`,
        ),
      );
    });

    it('should handle deletion failure', async () => {
      const errorMessage = 'Deletion failed';
      mockDelete.mockRejectedValueOnce(new Error(errorMessage));

      await expect(store.dispatch(terminateWorkspace(mockWorkspace))).rejects.toThrow(errorMessage);

      expect(verifyAuthorized).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalledWith(
        mockWorkspace.metadata.namespace,
        mockWorkspace.metadata.name,
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(
        devWorkspacesErrorAction(
          `Failed to delete the workspace ${mockWorkspace.metadata.name}, reason: ${errorMessage}`,
        ),
      );
    });
  });
});
