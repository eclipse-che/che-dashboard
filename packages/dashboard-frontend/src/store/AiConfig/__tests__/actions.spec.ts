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

import { api, helpers } from '@eclipse-che/common';

import {
  deleteAiProviderKey,
  fetchAiProviderKeyStatus,
  fetchAiRegistry,
  saveAiProviderKey,
} from '@/services/backend-client/aiConfigApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  aiConfigErrorAction,
  aiConfigKeyStatusReceiveAction,
  aiConfigRegistryReceiveAction,
  aiConfigRequestAction,
} from '@/store/AiConfig/actions';
import * as infrastructureNamespacesSelectors from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@eclipse-che/common');
jest.mock('@/services/backend-client/aiConfigApi');
jest.mock('@/store/SanityCheck');

const mockNamespace = 'test-namespace';
jest
  .spyOn(infrastructureNamespacesSelectors, 'selectDefaultNamespace')
  .mockReturnValue({ name: mockNamespace, attributes: { default: 'true', phase: 'Active' } });

const mockProviders: api.AiProviderDefinition[] = [
  {
    id: 'google/gemini',
    name: 'Gemini',
    publisher: 'Google',
  },
];

const mockTools: api.AiToolDefinition[] = [
  {
    providerId: 'google/gemini',
    tag: 'latest',
    name: 'Gemini CLI',
    url: 'https://github.com/google-gemini/gemini-cli',
    binary: 'gemini',
    pattern: 'bundle',
    injectorImage: 'quay.io/example/gemini-cli:next',
    envVarName: 'GEMINI_API_KEY',
  },
];

function buildStore() {
  return createMockStore({
    aiConfig: {
      providers: mockProviders,
      tools: mockTools,
      defaultAiProviders: [],
      providerKeyExists: {},
      isLoading: false,
      error: undefined,
    },
  });
}

describe('AiConfig, actions', () => {
  let store: ReturnType<typeof buildStore>;

  beforeEach(() => {
    store = buildStore();
    jest.clearAllMocks();
  });

  describe('requestAiRegistry', () => {
    it('should dispatch registry receive action', async () => {
      const registry: api.IAiRegistry = {
        providers: mockProviders,
        tools: mockTools,
        defaultAiProviders: ['google/gemini'],
      };

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchAiRegistry as jest.Mock).mockResolvedValue(registry);

      await store.dispatch(actionCreators.requestAiRegistry());

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(aiConfigRegistryReceiveAction(registry));
    });

    it('should dispatch error action on failure', async () => {
      const errorMessage = 'Registry fetch failed';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchAiRegistry as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestAiRegistry())).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(aiConfigErrorAction(errorMessage));
    });
  });

  describe('requestAiProviderKeyStatus', () => {
    it('should dispatch key status receive action', async () => {
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchAiProviderKeyStatus as jest.Mock).mockResolvedValue([]);

      await store.dispatch(actionCreators.requestAiProviderKeyStatus());

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(aiConfigKeyStatusReceiveAction({ 'google/gemini': false }));
    });

    it('should dispatch error action on failed key status fetch', async () => {
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchAiProviderKeyStatus as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestAiProviderKeyStatus())).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(aiConfigErrorAction(errorMessage));
    });
  });

  describe('saveAiProviderKey', () => {
    it('should dispatch key status receive action on success', async () => {
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (saveAiProviderKey as jest.Mock).mockResolvedValue(undefined);
      (fetchAiProviderKeyStatus as jest.Mock).mockResolvedValue(['google-gemini']);

      await store.dispatch(actionCreators.saveAiProviderKey('google/gemini', 'test-api-key'));

      expect(saveAiProviderKey).toHaveBeenCalledWith(
        mockNamespace,
        'google/gemini',
        'GEMINI_API_KEY',
        'test-api-key',
      );
      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(aiConfigKeyStatusReceiveAction({ 'google/gemini': true }));
    });

    it('should dispatch error action on failure', async () => {
      const errorMessage = 'Save failed';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (saveAiProviderKey as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(
        store.dispatch(actionCreators.saveAiProviderKey('google/gemini', 'key')),
      ).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(aiConfigErrorAction(errorMessage));
    });
  });

  describe('deleteAiProviderKey', () => {
    it('should dispatch key status receive action on success', async () => {
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (deleteAiProviderKey as jest.Mock).mockResolvedValue(undefined);
      (fetchAiProviderKeyStatus as jest.Mock).mockResolvedValue([]);

      await store.dispatch(actionCreators.deleteAiProviderKey('google/gemini'));

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(aiConfigKeyStatusReceiveAction({ 'google/gemini': false }));
    });

    it('should dispatch error action on failure', async () => {
      const errorMessage = 'Delete failed';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (deleteAiProviderKey as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(
        store.dispatch(actionCreators.deleteAiProviderKey('google/gemini')),
      ).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(aiConfigErrorAction(errorMessage));
    });
  });
});
