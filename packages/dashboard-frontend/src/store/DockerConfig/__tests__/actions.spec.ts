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

import { helpers } from '@eclipse-che/common';

import * as DwApi from '@/services/backend-client/devWorkspaceApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  dockerConfigErrorAction,
  dockerConfigReceiveAction,
  dockerConfigRequestAction,
  getDockerConfig,
  putDockerConfig,
} from '@/store/DockerConfig/actions';
import * as namespaceSelectors from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@/services/backend-client/devWorkspaceApi');
jest.mock('@/store/SanityCheck');
jest.mock('@eclipse-che/common');

describe('DockerConfig', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('actions', () => {
    const mockNamespace = 'test-namespace';
    let store: ReturnType<typeof createMockStore>;

    beforeEach(() => {
      store = createMockStore({});
    });

    describe('requestCredentials', () => {
      it('should dispatch receive action on successful fetch', async () => {
        const mockRegistries = [
          { url: 'https://registry.com', username: 'user', password: 'pass' },
        ];

        jest
          .spyOn(namespaceSelectors, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (DwApi.getDockerConfig as jest.Mock).mockResolvedValue(
          window.btoa(
            JSON.stringify({
              auths: {
                'https://registry.com': {
                  auth: window.btoa('user:pass'),
                },
              },
            }),
          ),
        );

        await store.dispatch(actionCreators.requestCredentials());

        const actions = store.getActions();
        expect(actions[0]).toEqual(dockerConfigRequestAction());
        expect(actions[1]).toEqual(
          dockerConfigReceiveAction({
            registries: mockRegistries,
          }),
        );
      });

      it('should dispatch error action on failed fetch', async () => {
        const errorMessage = 'Network error';

        jest
          .spyOn(namespaceSelectors, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (DwApi.getDockerConfig as jest.Mock).mockRejectedValue(new Error(errorMessage));
        (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

        await expect(store.dispatch(actionCreators.requestCredentials())).rejects.toThrow(
          errorMessage,
        );

        const actions = store.getActions();
        expect(actions[0]).toEqual(dockerConfigRequestAction());
        expect(actions[1]).toEqual(dockerConfigErrorAction(errorMessage));
      });
    });

    describe('updateCredentials', () => {
      it('should dispatch receive action on successful update', async () => {
        const mockRegistries = [
          { url: 'https://registry.com', username: 'user', password: 'pass' },
        ];

        jest
          .spyOn(namespaceSelectors, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (DwApi.putDockerConfig as jest.Mock).mockResolvedValue({});

        await store.dispatch(actionCreators.updateCredentials(mockRegistries));

        const actions = store.getActions();
        expect(actions[0]).toEqual(dockerConfigRequestAction());
        expect(actions[1]).toEqual(
          dockerConfigReceiveAction({
            registries: mockRegistries,
          }),
        );
      });

      it('should dispatch error action on failed update', async () => {
        const errorMessage = 'Network error';
        const mockRegistries = [
          { url: 'https://registry.com', username: 'user', password: 'pass' },
        ];

        jest
          .spyOn(namespaceSelectors, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (DwApi.putDockerConfig as jest.Mock).mockRejectedValue(new Error(errorMessage));
        (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

        await expect(
          store.dispatch(actionCreators.updateCredentials(mockRegistries)),
        ).rejects.toThrow(errorMessage);

        const actions = store.getActions();
        expect(actions[0]).toEqual(dockerConfigRequestAction());
        expect(actions[1]).toEqual(dockerConfigErrorAction(errorMessage));
      });
    });
  });

  describe('getDockerConfig', () => {
    it('should return registries and resourceVersion on successful fetch', async () => {
      const mockNamespace = 'test-namespace';
      const mockDockerConfig = window.btoa(
        JSON.stringify({
          auths: {
            'https://registry.com': {
              auth: window.btoa('user:pass'),
            },
          },
        }),
      );

      (DwApi.getDockerConfig as jest.Mock).mockResolvedValue(mockDockerConfig);

      const result = await getDockerConfig(mockNamespace);

      expect(result).toEqual({
        registries: [{ url: 'https://registry.com', username: 'user', password: 'pass' }],
      });
    });

    it('should throw an error if fetching docker config fails', async () => {
      const mockNamespace = 'test-namespace';
      const errorMessage = 'Network error';

      (DwApi.getDockerConfig as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(getDockerConfig(mockNamespace)).rejects.toThrow(
        `Failed to request the docker config. Reason: ${errorMessage}`,
      );
    });

    it('should throw an error if decoding and parsing docker config fails', async () => {
      const mockNamespace = 'test-namespace';
      const mockDockerConfig = 'invalid-base64';
      const errorMessage = 'Invalid base64 string';

      (DwApi.getDockerConfig as jest.Mock).mockResolvedValue({
        dockerconfig: mockDockerConfig,
        resourceVersion: '12345',
      });
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(getDockerConfig(mockNamespace)).rejects.toThrow(
        `Unable to decode and parse data. Reason: ${errorMessage}`,
      );
    });

    it('should return empty registries if dockerconfig returns undefined', async () => {
      const mockNamespace = 'test-namespace';

      (DwApi.getDockerConfig as jest.Mock).mockResolvedValue(undefined);

      const result = await getDockerConfig(mockNamespace);

      expect(result).toEqual({
        registries: [],
      });
    });
  });

  describe('putDockerConfig', () => {
    it('should update docker config successfully', async () => {
      const mockNamespace = 'test-namespace';
      const mockRegistries = [{ url: 'https://registry.com', username: 'user', password: 'pass' }];
      const mockResponse = 'mockDockerConfig';

      (DwApi.putDockerConfig as jest.Mock).mockResolvedValue(mockResponse);

      const result = await putDockerConfig(mockNamespace, mockRegistries);

      expect(result).toEqual(mockResponse);
      expect(DwApi.putDockerConfig).toHaveBeenCalledWith(
        mockNamespace,
        window.btoa(
          JSON.stringify({
            auths: {
              'https://registry.com': {
                username: 'user',
                password: 'pass',
                auth: window.btoa('user:pass'),
              },
            },
          }),
        ),
      );
    });

    it('should throw an error if updating docker config fails', async () => {
      const mockNamespace = 'test-namespace';
      const mockRegistries = [{ url: 'https://registry.com', username: 'user', password: 'pass' }];
      const errorMessage = 'Network error';

      (DwApi.putDockerConfig as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(putDockerConfig(mockNamespace, mockRegistries)).rejects.toThrow(
        `Failed to update the docker config. Reason: ${errorMessage}`,
      );
    });

    it('should throw an error if encoding and parsing data fails', async () => {
      const mockNamespace = 'test-namespace';
      const mockRegistries = [{ url: 'https://registry.com', username: 'user', password: 'pass' }];
      const errorMessage = 'Encoding error';

      jest.spyOn(window, 'btoa').mockImplementation(() => {
        throw new Error(errorMessage);
      });
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(putDockerConfig(mockNamespace, mockRegistries)).rejects.toThrow(
        `Unable to parse and code data. Reason: ${errorMessage}`,
      );
    });
  });
});
