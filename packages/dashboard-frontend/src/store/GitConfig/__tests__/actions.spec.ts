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

import { api, helpers } from '@eclipse-che/common';

import { fetchGitConfig, patchGitConfig } from '@/services/backend-client/gitConfigApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  gitConfigErrorAction,
  gitConfigReceiveAction,
  gitConfigRequestAction,
} from '@/store/GitConfig/actions';
import * as infrastructureNamespaces from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@/services/backend-client/gitConfigApi');
jest.mock('@/store/SanityCheck');
jest.mock('@eclipse-che/common');

describe('GitConfig, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({
      gitConfig: { isLoading: false, config: undefined, error: undefined },
    });
    jest.clearAllMocks();
  });

  describe('requestGitConfig', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockNamespace = 'test-namespace';
      const mockGitConfig = { gitconfig: {} } as api.IGitConfig;

      jest
        .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
        .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchGitConfig as jest.Mock).mockResolvedValue(mockGitConfig);

      await store.dispatch(actionCreators.requestGitConfig());

      const actions = store.getActions();
      expect(actions[0]).toEqual(gitConfigRequestAction());
      expect(actions[1]).toEqual(gitConfigReceiveAction(mockGitConfig));
    });

    it('should dispatch receive action with undefined on 404 error', async () => {
      const mockNamespace = 'test-namespace';
      const errorMessage = 'Not Found';

      jest
        .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
        .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchGitConfig as jest.Mock).mockRejectedValue({
        response: { status: 404 },
      });
      jest.spyOn(helpers.errors, 'includesAxiosResponse').mockReturnValueOnce(true);
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await store.dispatch(actionCreators.requestGitConfig());

      const actions = store.getActions();
      expect(actions[0]).toEqual(gitConfigRequestAction());
      expect(actions[1]).toEqual(gitConfigReceiveAction(undefined));
    });

    it('should dispatch error action on failed fetch', async () => {
      const mockNamespace = 'test-namespace';
      const errorMessage = 'Network error';

      jest
        .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
        .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchGitConfig as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestGitConfig())).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(gitConfigRequestAction());
      expect(actions[1]).toEqual(gitConfigErrorAction(errorMessage));
    });
  });

  describe('updateGitConfig', () => {
    it('should dispatch receive action on successful update', async () => {
      const mockNamespace = 'test-namespace';
      const mockGitConfig = {
        gitconfig: {
          user: {
            name: 'test1',
            email: 'test1@che',
          },
        },
      } as api.IGitConfig;
      const mockUpdatedGitConfig = {
        gitconfig: {
          user: {
            name: 'test2',
            email: 'test2@che',
          },
        },
      } as api.IGitConfig;

      jest
        .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
        .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (patchGitConfig as jest.Mock).mockResolvedValue(mockUpdatedGitConfig);

      await store.dispatch(actionCreators.updateGitConfig(mockGitConfig.gitconfig));

      const actions = store.getActions();
      expect(actions[0]).toEqual(gitConfigRequestAction());
      expect(actions[1]).toEqual(gitConfigReceiveAction(mockUpdatedGitConfig));
    });

    it('should dispatch error action on failed update', async () => {
      const mockNamespace = 'test-namespace';
      const mockGitConfig = { gitconfig: {} } as api.IGitConfig;
      const errorMessage = 'Network error';

      jest.spyOn(infrastructureNamespaces, 'selectDefaultNamespace').mockReturnValue({
        name: mockNamespace,
        attributes: { phase: 'Active' },
      });
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (patchGitConfig as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(
        store.dispatch(actionCreators.updateGitConfig(mockGitConfig.gitconfig)),
      ).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(gitConfigRequestAction());
      expect(actions[1]).toEqual(gitConfigErrorAction(errorMessage));
    });
  });
});
