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
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { verifyAuthorized } from '@/store/SanityCheck';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { stopWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/stopWorkspace';
import { devWorkspacesErrorAction } from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@/store/SanityCheck');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers');
jest.mock('@eclipse-che/common');

(verifyAuthorized as jest.Mock).mockResolvedValue(true);

const mockNamespace = 'test-namespace';
const mockName = 'test-workspace';
const mockWorkspace = {
  metadata: {
    namespace: mockNamespace,
    name: mockName,
    annotations: {},
  },
  status: {
    phase: 'Running',
  },
} as devfileApi.DevWorkspace;

describe('devWorkspaces, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('stopWorkspace', () => {
    it('should stop the workspace successfully', async () => {
      const changeWorkspaceStatus = jest.fn().mockResolvedValue(undefined);
      (getDevWorkspaceClient as jest.Mock).mockReturnValue({ changeWorkspaceStatus });

      await store.dispatch(stopWorkspace(mockWorkspace));

      expect(changeWorkspaceStatus).toHaveBeenCalledWith(mockWorkspace, false);
    });

    it('should handle errors during stopping the workspace', async () => {
      const error = new Error('Test Error');
      const changeWorkspaceStatus = jest.fn().mockRejectedValue(error);
      (getDevWorkspaceClient as jest.Mock).mockReturnValue({ changeWorkspaceStatus });
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue('Test Error Message');

      await expect(store.dispatch(stopWorkspace(mockWorkspace))).rejects.toThrow('Test Error');

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        devWorkspacesErrorAction(
          'Failed to stop the workspace test-workspace, reason: Test Error Message',
        ),
      );
    });
  });
});
