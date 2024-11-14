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
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { verifyAuthorized } from '@/store/SanityCheck';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { updateWorkspaceAnnotation } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/updateWorkspaceAnnotation';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/store/SanityCheck');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers');

describe('devWorkspaces, actions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateWorkspaceAnnotation', () => {
    let store: ReturnType<typeof createMockStore>;
    const mockUpdateAnnotation = jest.fn();
    const mockWorkspace = {
      metadata: {
        namespace: 'test-namespace',
        name: 'test-workspace',
        annotations: {},
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
        updateAnnotation: mockUpdateAnnotation,
      });
      (common.helpers.errors.getMessage as jest.Mock).mockImplementation((e: Error) => e.message);
    });

    it('should dispatch update action on successful annotation update', async () => {
      const updatedWorkspace = {
        ...mockWorkspace,
        metadata: {
          ...mockWorkspace.metadata,
          annotations: {
            newAnnotation: 'value',
          },
        },
      };
      mockUpdateAnnotation.mockResolvedValueOnce(updatedWorkspace);

      await store.dispatch(updateWorkspaceAnnotation(mockWorkspace));

      expect(verifyAuthorized).toHaveBeenCalled();
      expect(mockUpdateAnnotation).toHaveBeenCalledWith(mockWorkspace);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(devWorkspacesUpdateAction(updatedWorkspace));
    });

    it('should handle authorization failure', async () => {
      const errorMessage = 'Not authorized';
      (verifyAuthorized as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(store.dispatch(updateWorkspaceAnnotation(mockWorkspace))).rejects.toThrow(
        errorMessage,
      );

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
      mockUpdateAnnotation.mockRejectedValueOnce(new Error(errorMessage));

      await expect(store.dispatch(updateWorkspaceAnnotation(mockWorkspace))).rejects.toThrow(
        errorMessage,
      );

      expect(verifyAuthorized).toHaveBeenCalled();
      expect(mockUpdateAnnotation).toHaveBeenCalledWith(mockWorkspace);

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
