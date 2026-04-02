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
  saveAiProviderKey,
} from '@/services/backend-client/aiConfigApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  aiConfigErrorAction,
  aiConfigKeyStatusReceiveAction,
  aiConfigReceiveAction,
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
    id: 'google/gemini/latest',
    name: 'Gemini',
    publisher: 'Google',
  },
];

const mockTools: api.AiToolDefinition[] = [
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    description: 'Gemini CLI',
    url: 'https://github.com/google-gemini/gemini-cli',
    binary: 'gemini',
    pattern: 'bundle',
    injectorImage: 'quay.io/okurinny/tools-injector/gemini-cli:next',
    envVarName: 'GEMINI_API_KEY',
    runCommandLine: 'gemini',
  },
];

function buildStore() {
  return createMockStore({
    aiConfig: {
      providers: mockProviders,
      tools: mockTools,
      defaultProviderId: undefined,
      providerKeyExists: {},
      isLoading: false,
      error: undefined,
    },
    dwServerConfig: {
      isLoading: false,
      config: {
        aiProviders: mockProviders,
        aiTools: mockTools,
        defaultAiProvider: undefined,
        containerBuild: {
          disableContainerBuildCapabilities: true,
        },
        containerRun: {
          disableContainerRunCapabilities: true,
        },
        defaults: {
          editor: undefined,
          components: [],
          plugins: [],
          pvcStrategy: undefined,
        },
        timeouts: {
          inactivityTimeout: -1,
          runTimeout: -1,
          startTimeout: 300,
          axiosRequestTimeout: 30,
        },
        devfileRegistry: {
          disableInternalRegistry: false,
          externalDevfileRegistries: [],
        },
        defaultNamespace: {
          autoProvision: true,
        },
        pluginRegistry: {},
        cheNamespace: 'eclipse-che',
        pluginRegistryURL: '',
        pluginRegistryInternalURL: '',
        allowedSourceUrls: [],
      },
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

  describe('requestAiConfig', () => {
    it('should dispatch receive action reading from server config', async () => {
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchAiProviderKeyStatus as jest.Mock).mockResolvedValue([]);

      await store.dispatch(actionCreators.requestAiConfig());

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(
        aiConfigReceiveAction({
          providers: mockProviders,
          tools: mockTools,
          defaultProviderId: undefined,
        }),
      );
      expect(actions[2]).toEqual(aiConfigKeyStatusReceiveAction({ 'gemini-cli': false }));
    });

    it('should dispatch error action on failed key status fetch', async () => {
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchAiProviderKeyStatus as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestAiConfig())).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(
        aiConfigReceiveAction({
          providers: mockProviders,
          tools: mockTools,
          defaultProviderId: undefined,
        }),
      );
      expect(actions[2]).toEqual(aiConfigErrorAction(errorMessage));
    });
  });

  describe('saveAiProviderKey', () => {
    it('should dispatch key status receive action on success', async () => {
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (saveAiProviderKey as jest.Mock).mockResolvedValue(undefined);
      (fetchAiProviderKeyStatus as jest.Mock).mockResolvedValue(['gemini-cli']);

      await store.dispatch(actionCreators.saveAiProviderKey('gemini-cli', 'test-api-key'));

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(aiConfigKeyStatusReceiveAction({ 'gemini-cli': true }));
    });

    it('should dispatch error action on failure', async () => {
      const errorMessage = 'Save failed';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (saveAiProviderKey as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(
        store.dispatch(actionCreators.saveAiProviderKey('gemini-cli', 'key')),
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

      await store.dispatch(actionCreators.deleteAiProviderKey('gemini-cli'));

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(aiConfigKeyStatusReceiveAction({ 'gemini-cli': false }));
    });

    it('should dispatch error action on failure', async () => {
      const errorMessage = 'Delete failed';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (deleteAiProviderKey as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(
        store.dispatch(actionCreators.deleteAiProviderKey('gemini-cli')),
      ).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(aiConfigRequestAction());
      expect(actions[1]).toEqual(aiConfigErrorAction(errorMessage));
    });
  });
});
