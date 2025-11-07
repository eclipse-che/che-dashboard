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

import common, { api } from '@eclipse-che/common';

import {
  addTrustedSource,
  getWorkspacePreferences,
} from '@/services/backend-client/workspacePreferencesApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';
import {
  actionCreators,
  preferencesErrorAction,
  preferencesReceiveAction,
  preferencesRequestAction,
} from '@/store/Workspaces/Preferences/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/services/backend-client/workspacePreferencesApi');
jest.mock('@/store/SanityCheck');
jest.mock('@/store/InfrastructureNamespaces/selectors');

describe('Preferences, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});

    (verifyAuthorized as jest.Mock).mockResolvedValue(true);

    const defaultNamespace = { name: 'test-namespace' };
    (selectDefaultNamespace as unknown as jest.Mock).mockReturnValue(defaultNamespace);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPreferences', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockPreferences = {
        'skip-authorisation': ['github'],
      } as api.IWorkspacePreferences;

      (getWorkspacePreferences as jest.Mock).mockResolvedValue(mockPreferences);

      await store.dispatch(actionCreators.requestPreferences());

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(preferencesRequestAction());
      expect(actions[1]).toEqual(preferencesReceiveAction(mockPreferences));
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (getWorkspacePreferences as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestPreferences())).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(preferencesRequestAction());
      expect(actions[1]).toEqual(preferencesErrorAction(errorMessage));
    });
  });

  describe('addTrustedSource', () => {
    it('should dispatch preferences and requestPreferences on success', async () => {
      const trustedSource = 'https://trusted-source.com' as api.TrustedSourceUrl;
      const mockPreferences = {
        'skip-authorisation': ['gitlab'],
      } as api.IWorkspacePreferences;

      (addTrustedSource as jest.Mock).mockResolvedValue(undefined);
      (getWorkspacePreferences as jest.Mock).mockResolvedValue(mockPreferences);

      await store.dispatch(actionCreators.addTrustedSource(trustedSource));

      const actions = store.getActions();
      expect(actions).toHaveLength(4);
      expect(actions[0]).toEqual(preferencesRequestAction());
      expect(actions[1]).toEqual(preferencesReceiveAction(undefined));
      expect(actions[2]).toEqual(preferencesRequestAction());
      expect(actions[3]).toEqual(preferencesReceiveAction(mockPreferences));
    });

    it('should dispatch error action on failed addTrustedSource', async () => {
      const errorMessage = 'Network error';
      const trustedSource = 'https://trusted-source.com' as api.TrustedSourceUrl;

      (addTrustedSource as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.addTrustedSource(trustedSource))).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(preferencesRequestAction());
      expect(actions[1]).toEqual(preferencesErrorAction(errorMessage));
    });
  });
});
