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
import { WorkspaceAdapter } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { verifyAuthorized } from '@/store/SanityCheck';
import {
  getDevWorkspaceClient,
  shouldUpdateDevWorkspace,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { updateWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/updateWorkspace';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/store/SanityCheck');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers');
jest.mock('@/services/workspace-adapter');

describe('devWorkspaces, actions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateWorkspace', () => {
    let store: ReturnType<typeof createMockStore>;
    const mockUpdate = jest.fn();
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
        update: mockUpdate,
      });
      (common.helpers.errors.getMessage as jest.Mock).mockImplementation((e: Error) => e.message);
      (WorkspaceAdapter.getId as jest.Mock).mockImplementation(
        (w: devfileApi.DevWorkspace) => w.metadata.uid,
      );
      (shouldUpdateDevWorkspace as jest.Mock).mockReturnValue(true);
    });

    it('should dispatch update action on successful update', async () => {
      const updatedWorkspace = {
        ...mockWorkspace,
        metadata: {
          ...mockWorkspace.metadata,
          annotations: {
            newAnnotation: 'value',
          },
        },
      };
      mockUpdate.mockResolvedValueOnce(updatedWorkspace);

      await store.dispatch(updateWorkspace(mockWorkspace));

      expect(verifyAuthorized).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(mockWorkspace);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(devWorkspacesUpdateAction(updatedWorkspace));
    });

    it('should dispatch update action with undefined when shouldUpdateDevWorkspace returns false', async () => {
      const updatedWorkspace = {
        ...mockWorkspace,
        metadata: {
          ...mockWorkspace.metadata,
          annotations: {
            newAnnotation: 'value',
          },
        },
      };
      mockUpdate.mockResolvedValueOnce(updatedWorkspace);
      (shouldUpdateDevWorkspace as jest.Mock).mockReturnValueOnce(false);

      await store.dispatch(updateWorkspace(mockWorkspace));

      expect(verifyAuthorized).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(mockWorkspace);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(devWorkspacesUpdateAction(undefined));
    });

    it('should handle authorization failure', async () => {
      const errorMessage = 'Not authorized';
      (verifyAuthorized as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(store.dispatch(updateWorkspace(mockWorkspace))).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        devWorkspacesErrorAction(
          `Failed to update the workspace ${mockWorkspace.metadata.name}, reason: ${errorMessage}`,
        ),
      );
    });

    it('should handle update failure', async () => {
      const errorMessage = 'Update failed';
      mockUpdate.mockRejectedValueOnce(new Error(errorMessage));

      await expect(store.dispatch(updateWorkspace(mockWorkspace))).rejects.toThrow(errorMessage);

      expect(verifyAuthorized).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(mockWorkspace);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(
        devWorkspacesErrorAction(
          `Failed to update the workspace ${mockWorkspace.metadata.name}, reason: ${errorMessage}`,
        ),
      );
    });
  });
});
