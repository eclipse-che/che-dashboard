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

import { getFactoryResolver } from '@/services/backend-client/factoryApi';
import { getYamlResolver } from '@/services/backend-client/yamlResolverApi';
import devfileApi from '@/services/devfileApi';
import { isOAuthResponse } from '@/services/oauth';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { FactoryResolverStateResolver } from '@/store/FactoryResolver';
import {
  actionCreators,
  factoryResolverErrorAction,
  factoryResolverReceiveAction,
  factoryResolverRequestAction,
} from '@/store/FactoryResolver/actions';
import {
  grabLink,
  isDevfileRegistryLocation,
  normalizeDevfile,
} from '@/store/FactoryResolver/helpers';
import * as infrastructureNamespaces from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';
import { ServerConfigState } from '@/store/ServerConfig';
import * as serverConfig from '@/store/ServerConfig/selectors';

jest.mock('@/services/backend-client/factoryApi');
jest.mock('@/services/backend-client/yamlResolverApi');
jest.mock('@/store/SanityCheck');
jest.mock('@/store/FactoryResolver/helpers');
jest.mock('@eclipse-che/common');
jest.mock('@/services/oauth');

describe('FactoryResolver, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({
      dwServerConfig: {
        config: {},
        isLoading: false,
      } as ServerConfigState,
    });
    jest.clearAllMocks();
  });

  describe('requestFactoryResolver', () => {
    describe('from a devfile registry', () => {
      it('should dispatch receive action on successful fetch from a devfile registry', async () => {
        const mockNamespace = 'test-namespace';
        const mockLocation = 'https://example.com/devfile.yaml';
        const mockFactoryParams = {};
        const mockYamlResolver = { devfile: {} };
        const mockDefaultComponents = [];
        const mockNormalizedDevfile = {};

        jest
          .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (isDevfileRegistryLocation as jest.Mock).mockReturnValue(true);
        (getYamlResolver as jest.Mock).mockResolvedValue(mockYamlResolver);
        jest.spyOn(serverConfig, 'selectDefaultComponents').mockReturnValue(mockDefaultComponents);
        (normalizeDevfile as jest.Mock).mockReturnValue(mockNormalizedDevfile);

        await store.dispatch(
          actionCreators.requestFactoryResolver(mockLocation, mockFactoryParams),
        );

        const actions = store.getActions();
        expect(actions[0]).toEqual(factoryResolverRequestAction());
        expect(actions[1]).toEqual(
          factoryResolverReceiveAction({
            ...mockYamlResolver,
            devfile: mockNormalizedDevfile as devfileApi.Devfile,
            location: mockLocation,
            optionalFilesContent: {},
          }),
        );
      });

      it('should throw an error if the specified link does not contain any Devfile', async () => {
        const mockNamespace = 'test-namespace';
        const mockLocation = 'https://example.com/devfile.yaml';
        const mockFactoryParams = {};
        const mockYamlResolver = { devfile: undefined };

        jest
          .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (isDevfileRegistryLocation as jest.Mock).mockReturnValue(true);
        (getYamlResolver as jest.Mock).mockResolvedValue(mockYamlResolver);

        await expect(
          store.dispatch(actionCreators.requestFactoryResolver(mockLocation, mockFactoryParams)),
        ).rejects.toThrow('The specified link does not contain any Devfile');

        const actions = store.getActions();
        expect(actions[0]).toEqual(factoryResolverRequestAction());
        expect(actions).not.toContainEqual(
          factoryResolverReceiveAction(mockYamlResolver as unknown as FactoryResolverStateResolver),
        );
      });
    });

    describe('from another location', () => {
      it('should dispatch receive action on successful fetch', async () => {
        const mockNamespace = 'test-namespace';
        const mockLocation = 'https://example.com/devfile.yaml';
        const mockFactoryParams = {};
        const mockFactoryResolver = { devfile: {} };
        const mockDefaultComponents = [];
        const mockNormalizedDevfile = {};

        jest
          .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (isDevfileRegistryLocation as jest.Mock).mockReturnValue(false);
        (getFactoryResolver as jest.Mock).mockResolvedValue(mockFactoryResolver);
        (grabLink as jest.Mock).mockResolvedValue(undefined);
        jest.spyOn(serverConfig, 'selectDefaultComponents').mockReturnValue(mockDefaultComponents);
        (normalizeDevfile as jest.Mock).mockReturnValue(mockNormalizedDevfile);

        await store.dispatch(
          actionCreators.requestFactoryResolver(mockLocation, mockFactoryParams),
        );

        const actions = store.getActions();
        expect(actions[0]).toEqual(factoryResolverRequestAction());
        expect(actions[1]).toEqual(
          factoryResolverReceiveAction({
            ...mockFactoryResolver,
            devfile: mockNormalizedDevfile as devfileApi.Devfile,
            location: mockLocation,
            optionalFilesContent: {},
          }),
        );
      });

      it('should dispatch receive action on successful fetch with optional files content', async () => {
        const mockNamespace = 'test-namespace';
        const mockLocation = 'https://example.com/devfile.yaml';
        const mockFactoryParams = {};
        const mockFactoryResolver = { devfile: {}, links: [] };
        const mockDefaultComponents = [];
        const mockNormalizedDevfile = {};
        const mockOptionalFilesContent = { '.che/che-editor.yaml': 'content' };

        jest
          .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (isDevfileRegistryLocation as jest.Mock).mockReturnValue(false);
        (getFactoryResolver as jest.Mock).mockResolvedValue(mockFactoryResolver);
        (grabLink as jest.Mock).mockResolvedValue('content');
        jest.spyOn(serverConfig, 'selectDefaultComponents').mockReturnValue(mockDefaultComponents);
        (normalizeDevfile as jest.Mock).mockReturnValue(mockNormalizedDevfile);

        await store.dispatch(
          actionCreators.requestFactoryResolver(mockLocation, mockFactoryParams),
        );

        const actions = store.getActions();
        expect(actions[0]).toEqual(factoryResolverRequestAction());
        expect(actions[1]).toEqual(
          factoryResolverReceiveAction({
            ...mockFactoryResolver,
            devfile: mockNormalizedDevfile as devfileApi.Devfile,
            location: mockLocation,
            optionalFilesContent: mockOptionalFilesContent,
          }),
        );
      });

      it('should dispatch error action on failed fetch', async () => {
        const mockNamespace = 'test-namespace';
        const mockLocation = 'https://example.com/devfile.yaml';
        const mockFactoryParams = {};
        const errorMessage = 'Network error';

        jest
          .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (isDevfileRegistryLocation as jest.Mock).mockReturnValue(false);
        (getFactoryResolver as jest.Mock).mockRejectedValue(new Error(errorMessage));
        (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

        await expect(
          store.dispatch(actionCreators.requestFactoryResolver(mockLocation, mockFactoryParams)),
        ).rejects.toThrow(errorMessage);

        const actions = store.getActions();
        expect(actions[0]).toEqual(factoryResolverRequestAction());
        expect(actions[1]).toEqual(factoryResolverErrorAction(errorMessage));
      });
    });

    it('should handle OAuth response error', async () => {
      const mockNamespace = 'test-namespace';
      const mockLocation = 'https://example.com/devfile.yaml';
      const mockFactoryParams = {};
      const mockOAuthResponse = { error: 'unauthorized' };
      const mockError = {
        response: {
          status: 401,
          data: mockOAuthResponse,
        },
      };

      jest.spyOn(infrastructureNamespaces, 'selectDefaultNamespace').mockReturnValue({
        name: mockNamespace,
        attributes: { phase: 'Active' },
      });
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (isDevfileRegistryLocation as jest.Mock).mockReturnValue(false);
      (getFactoryResolver as jest.Mock).mockRejectedValue(mockError);
      (common.helpers.errors.includesAxiosResponse as unknown as jest.Mock).mockReturnValue(true);
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue('Unauthorized');
      (isOAuthResponse as unknown as jest.Mock).mockImplementation(() => true);

      await expect(
        store.dispatch(actionCreators.requestFactoryResolver(mockLocation, mockFactoryParams)),
      ).rejects.toEqual(mockOAuthResponse);

      const actions = store.getActions();
      expect(actions[0]).toEqual(factoryResolverRequestAction());
      expect(actions).not.toContainEqual(factoryResolverErrorAction('Unauthorized'));
    });
  });
});
