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

import { injectKubeConfig, podmanLogin } from '@/services/backend-client/devWorkspaceApi';
import devfileApi from '@/services/devfileApi';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { refreshKubeconfigWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/refreshKubeconfigWorkspace';

jest.mock('@eclipse-che/common');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators');
jest.mock('@/services/backend-client/devWorkspaceApi');

const mockNamespace = 'test-namespace';
const mockName = 'test-workspace';
const mockDevworkspaceId = 'test-devworkspace-id';
const mockWorkspace = {
  metadata: {
    namespace: mockNamespace,
    name: mockName,
    uid: mockDevworkspaceId,
  },
  status: {
    phase: DevWorkspaceStatus.RUNNING,
    devworkspaceId: mockDevworkspaceId,
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

  describe('refreshKubeconfigWorkspace', () => {
    it('should not call injectKubeConfig if the workspace is not running', async () => {
      const mockStoppedWorkspace = {
        ...mockWorkspace,
        status: {
          phase: DevWorkspaceStatus.STOPPED,
          devworkspaceId: mockDevworkspaceId,
        },
      };
      store.dispatch(refreshKubeconfigWorkspace(mockStoppedWorkspace));
      expect(injectKubeConfig).not.toHaveBeenCalledWith(mockNamespace, mockDevworkspaceId);
      expect(podmanLogin).not.toHaveBeenCalledWith(mockNamespace, mockDevworkspaceId);
    });
    it('should call injectKubeConfig if the workspace is running', async () => {
      await store.dispatch(refreshKubeconfigWorkspace(mockWorkspace));
      expect(injectKubeConfig).toHaveBeenCalledWith(mockNamespace, mockDevworkspaceId);
      expect(podmanLogin).toHaveBeenCalledWith(mockNamespace, mockDevworkspaceId);
    });
    it('should not call injectKubeConfig if devworkspaceId is undefined', async () => {
      const mockWorkspaceWithoutId = {
        ...mockWorkspace,
        status: {
          phase: DevWorkspaceStatus.RUNNING,
        },
      } as devfileApi.DevWorkspace;
      await store.dispatch(refreshKubeconfigWorkspace(mockWorkspaceWithoutId));
      expect(injectKubeConfig).not.toHaveBeenCalled();
      expect(podmanLogin).not.toHaveBeenCalled();
    });
  });
});
