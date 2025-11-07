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

import devfileApi from '@/services/devfileApi';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { WorkspaceAdapter } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { actionCreators, onStatusChangeCallbacks } from '@/store/Workspaces/devWorkspaces/actions';
import { restartWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/restartWorkspace';

jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators');

(actionCreators.startWorkspace as jest.Mock).mockImplementation(() => async () => {});
(actionCreators.stopWorkspace as jest.Mock).mockImplementation(() => async () => {});

const mockNamespace = 'test-namespace';
const mockName = 'test-workspace';
const mockWorkspace = {
  metadata: {
    namespace: mockNamespace,
    name: mockName,
    annotations: {},
  },
  status: {
    phase: DevWorkspaceStatus.RUNNING,
  },
} as devfileApi.DevWorkspace;

describe('devWorkspaces, actions', () => {
  let store: ReturnType<typeof createMockStore>;

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('restartWorkspace', () => {
    it('should call startWorkspace if the workspace is stopped', async () => {
      const mockStoppedWorkspace = {
        ...mockWorkspace,
        status: {
          phase: DevWorkspaceStatus.STOPPED,
        },
      } as devfileApi.DevWorkspace;

      store.dispatch(restartWorkspace(mockStoppedWorkspace));

      expect(actionCreators.startWorkspace).toHaveBeenCalled();
      expect(actionCreators.stopWorkspace).not.toHaveBeenCalled();
    });

    it('should dispatch start action on successful restart', async () => {
      // do not await, as we need to trigger the status change callback
      // using await will block the test
      store.dispatch(restartWorkspace(mockWorkspace));

      expect(actionCreators.stopWorkspace).toHaveBeenCalled();
      expect(actionCreators.startWorkspace).not.toHaveBeenCalled();

      expect(onStatusChangeCallbacks.size).toBe(1);

      // trigger workspace status change to start the workspace
      const handler = onStatusChangeCallbacks.get(WorkspaceAdapter.getUID(mockWorkspace))!;
      handler(DevWorkspaceStatus.STOPPED as string);

      expect(actionCreators.startWorkspace).toHaveBeenCalled();
    });

    it('should handle errors when stopping the workspace', async () => {
      const errorMessage = 'Network error';

      (actionCreators.stopWorkspace as jest.Mock).mockImplementation(() => async () => {
        throw new Error(errorMessage);
      });

      await expect(store.dispatch(restartWorkspace(mockWorkspace))).rejects.toThrow(errorMessage);
    });

    it('should handle errors when starting the workspace', async () => {
      const errorMessage = 'Network error';

      (actionCreators.startWorkspace as jest.Mock).mockImplementation(() => async () => {
        throw new Error(errorMessage);
      });

      // do not await, as we need to trigger the status change callback
      // using await will block the test
      const promise = store.dispatch(restartWorkspace(mockWorkspace));

      expect(actionCreators.stopWorkspace).toHaveBeenCalled();
      expect(actionCreators.startWorkspace).not.toHaveBeenCalled();

      expect(onStatusChangeCallbacks.size).toBe(1);

      // trigger workspace status change to start the workspace
      const handler = onStatusChangeCallbacks.get(WorkspaceAdapter.getUID(mockWorkspace))!;
      handler(DevWorkspaceStatus.STOPPED as string);

      await expect(promise).rejects.toThrow(errorMessage);
    });
  });
});
