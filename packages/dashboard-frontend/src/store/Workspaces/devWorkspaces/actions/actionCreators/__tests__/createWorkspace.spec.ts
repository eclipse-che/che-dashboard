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
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { createWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/createWorkspace';
import {
  devWorkspacesAddAction,
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/services/backend-client/workspaceCreationApi');

import { createWorkspaceViaEndpoint } from '@/services/backend-client/workspaceCreationApi';

const mockNamespace = 'test-namespace';
const mockDevWorkspace = {
  metadata: {
    namespace: mockNamespace,
    name: 'test-workspace',
    uid: 'uid-123',
  },
  spec: {},
  status: {},
} as devfileApi.DevWorkspace;

describe('devWorkspaces, createWorkspace action', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('should dispatch request and add actions on success', async () => {
      (createWorkspaceViaEndpoint as jest.Mock).mockResolvedValueOnce(mockDevWorkspace);

      const params = { devfileContent: 'schemaVersion: 2.2.0\n' };
      await store.dispatch(createWorkspace(mockNamespace, params));

      expect(createWorkspaceViaEndpoint).toHaveBeenCalledWith(mockNamespace, params);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(devWorkspacesAddAction(mockDevWorkspace));
    });

    it('should dispatch request and error actions on failure', async () => {
      const error = new Error('Network Error');
      (createWorkspaceViaEndpoint as jest.Mock).mockRejectedValueOnce(error);
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue('Network Error');

      const params = { devfileContent: 'schemaVersion: 2.2.0\n' };
      await expect(store.dispatch(createWorkspace(mockNamespace, params))).rejects.toThrow(
        'Network Error',
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(devWorkspacesErrorAction('Network Error'));
    });

    it('should call createWorkspaceViaEndpoint with namespace and params', async () => {
      (createWorkspaceViaEndpoint as jest.Mock).mockResolvedValueOnce(mockDevWorkspace);

      const params = {
        devfileContent: 'schemaVersion: 2.2.0\n',
        gitBranch: 'main',
        remoteUrl: 'https://github.com/example/repo',
      };
      await store.dispatch(createWorkspace(mockNamespace, params));

      expect(createWorkspaceViaEndpoint).toHaveBeenCalledWith(mockNamespace, params);
    });
  });
});
