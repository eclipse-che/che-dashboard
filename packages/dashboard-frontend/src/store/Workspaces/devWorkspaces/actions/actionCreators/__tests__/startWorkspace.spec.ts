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
import { OAuthService } from '@/services/oauth';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  checkRunningDevWorkspacesClusterLimitExceeded,
  devWorkspacesClusterActionCreators,
} from '@/store/DevWorkspacesCluster';
import { verifyAuthorized } from '@/store/SanityCheck';
import {
  checkRunningWorkspacesLimit,
  getDevWorkspaceClient,
  getWarningFromResponse,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import {
  getEditorName,
  getLifeTimeMs,
  updateEditor,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/updateEditor';
import { startWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/startWorkspace';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateAction,
  devWorkspaceWarningUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@/store/SanityCheck');
jest.mock('@/services/oauth');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers');
jest.mock('@/store/DevWorkspacesCluster');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/updateEditor');
jest.mock('@eclipse-che/common');

const mockNamespace = 'test-namespace';
const mockName = 'test-workspace';
const mockWorkspace = {
  metadata: {
    namespace: mockNamespace,
    name: mockName,
    uid: '1',
    annotations: {},
  },
  spec: {
    started: false,
    template: {},
  },
} as devfileApi.DevWorkspace;

describe('devWorkspaces, actions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startWorkspace', () => {
    let store: ReturnType<typeof createMockStore>;
    const mockChangeWorkspaceStatus = jest.fn().mockResolvedValue(mockWorkspace);
    const mockManagePvcStrategy = jest.fn().mockResolvedValue(mockWorkspace);
    const mockManageHostUsersEnvVar = jest.fn().mockResolvedValue(mockWorkspace);
    const mockManageDebugMode = jest.fn().mockResolvedValue(mockWorkspace);
    const mockOnStart = jest.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      store = createMockStore({
        dwPlugins: {
          defaultPlugins: {},
        },
        dwServerConfig: {
          config: {},
        },
        devWorkspaces: {
          isLoading: false,
          resourceVersion: '',
          workspaces: [mockWorkspace],
          startedWorkspaces: {},
          warnings: {},
        },
      } as Partial<RootState> as RootState);

      (getDevWorkspaceClient as jest.Mock).mockReturnValue({
        changeWorkspaceStatus: mockChangeWorkspaceStatus,
        managePvcStrategy: mockManagePvcStrategy,
        manageHostUsersEnvVar: mockManageHostUsersEnvVar,
        manageDebugMode: mockManageDebugMode,
        onStart: mockOnStart,
      });

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (OAuthService.refreshTokenIfProjectExists as jest.Mock).mockResolvedValue(undefined);
      (getWarningFromResponse as jest.Mock).mockReturnValue('Warning message');
      (
        devWorkspacesClusterActionCreators.requestRunningDevWorkspacesClusterLimitExceeded as jest.Mock
      ).mockImplementation(() => async () => {});
      (checkRunningDevWorkspacesClusterLimitExceeded as jest.Mock).mockReturnValue(undefined);
      (checkRunningWorkspacesLimit as jest.Mock).mockReturnValue(undefined);
      (updateEditor as jest.Mock).mockResolvedValue(undefined);
      (getEditorName as jest.Mock).mockReturnValue('custom-editor');
      (getLifeTimeMs as jest.Mock).mockReturnValue(30001);
    });

    it('should handle when the workspace is not found', async () => {
      const mockWorkspaceNotFound = {
        ...mockWorkspace,
        metadata: {
          ...mockWorkspace.metadata,
          uid: '2',
        },
      };
      await store.dispatch(startWorkspace(mockWorkspaceNotFound));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should handle when the workspace is already started', async () => {
      const mockStartedWorkspace = {
        ...mockWorkspace,
        spec: {
          ...mockWorkspace.spec,
          started: true,
        },
      };
      const storeWithStartedWorkspace = createMockStore({
        devWorkspaces: {
          isLoading: false,
          resourceVersion: '',
          workspaces: [mockStartedWorkspace],
          startedWorkspaces: {},
          warnings: {},
        },
      } as Partial<RootState> as RootState);

      await storeWithStartedWorkspace.dispatch(startWorkspace(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should handle authorization failure', async () => {
      const errorMessage = 'You are not authorized to perform this action';
      (verifyAuthorized as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      (common.helpers.errors.getMessage as jest.Mock).mockReturnValueOnce(errorMessage);

      await expect(store.dispatch(startWorkspace(mockWorkspace))).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        devWorkspacesErrorAction(
          `Failed to start the workspace ${mockWorkspace.metadata.name}, reason: ${errorMessage}`,
        ),
      );
    });

    it('should handle OAuth token refresh failure and dispatch a warning', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Invalid token',
          },
        },
      };

      (OAuthService.refreshTokenIfProjectExists as jest.Mock).mockRejectedValueOnce(mockError);
      (getWarningFromResponse as jest.Mock).mockReturnValueOnce('Invalid token for provider');

      // let's stop the workspace start at this point
      // as we want to test the warning dispatch only
      (checkRunningDevWorkspacesClusterLimitExceeded as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Cluster limit exceeded');
      });

      await expect(store.dispatch(startWorkspace(mockWorkspace))).rejects.toThrow();

      const actions = store.getActions();
      expect(actions).toHaveLength(3);
      expect(actions[0]).toEqual(
        devWorkspaceWarningUpdateAction({
          workspace: mockWorkspace,
          warning: 'Invalid token for provider',
        }),
      );
      expect(actions[1]).toEqual(devWorkspacesRequestAction());
      expect(actions[2]).toEqual(devWorkspacesErrorAction(expect.any(String)));
    });

    it('should not dispatch a warning for unsupported provider', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Invalid token',
          },
        },
      };

      (OAuthService.refreshTokenIfProjectExists as jest.Mock).mockRejectedValueOnce(mockError);
      (getWarningFromResponse as jest.Mock).mockReturnValueOnce(
        'Cannot build factory with any of the provided parameters. Please check parameters correctness, and resend query.',
      );

      // let's stop the workspace start at this point
      // as we want to test the warning dispatch only
      (checkRunningDevWorkspacesClusterLimitExceeded as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Cluster limit exceeded');
      });

      await expect(store.dispatch(startWorkspace(mockWorkspace))).rejects.toThrow();

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(devWorkspacesErrorAction(expect.any(String)));
    });

    it('should dispatch update action on successful start', async () => {
      await store.dispatch(startWorkspace(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(devWorkspacesUpdateAction(mockWorkspace));

      expect(mockChangeWorkspaceStatus).toHaveBeenCalledWith(mockWorkspace, true, true);
    });

    it('should handle errors when starting the workspace', async () => {
      const errorMessage = 'Failed to start';
      const error = new Error(errorMessage);
      mockChangeWorkspaceStatus.mockRejectedValueOnce(error);
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(startWorkspace(mockWorkspace))).rejects.toThrow(error);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(
        devWorkspacesErrorAction(
          `Failed to start the workspace ${mockWorkspace.metadata.name}, reason: ${errorMessage}`,
        ),
      );
    });
  });
});
