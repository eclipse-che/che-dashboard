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
import { che } from '@/services/models';
import { fetchDevfile, fetchRegistryMetadata } from '@/services/registry/devfiles';
import { fetchResources, loadResourcesContent } from '@/services/registry/resources';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  devfileReceiveAction,
  devfileRequestAction,
  filterClearAction,
  filterSetAction,
  registryMetadataErrorAction,
  registryMetadataReceiveAction,
  registryMetadataRequestAction,
  resourcesErrorAction,
  resourcesReceiveAction,
  resourcesRequestAction,
} from '@/store/DevfileRegistries/actions';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@/services/registry/devfiles');
jest.mock('@/services/registry/resources');
jest.mock('@/store/SanityCheck');
jest.mock('@eclipse-che/common');

describe('DevfileRegistries, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestRegistriesMetadata', () => {
    it('should dispatch receive action on successful fetch the internal registry', async () => {
      const mockMetadata = [{ displayName: 'devfile1' }] as che.DevfileMetaData[];
      (fetchRegistryMetadata as jest.Mock).mockResolvedValue(mockMetadata);
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);

      await store.dispatch(actionCreators.requestRegistriesMetadata('url1 url2', false));

      const actions = store.getActions();
      expect(actions[0]).toEqual(registryMetadataRequestAction());
      expect(actions[1]).toEqual(registryMetadataRequestAction());
      expect(actions[2]).toEqual(
        registryMetadataReceiveAction({ url: 'url1', metadata: mockMetadata }),
      );
      expect(actions[3]).toEqual(
        registryMetadataReceiveAction({ url: 'url2', metadata: mockMetadata }),
      );
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';
      (fetchRegistryMetadata as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(
        store.dispatch(actionCreators.requestRegistriesMetadata('url1', false)),
      ).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(registryMetadataRequestAction());
      expect(actions[1]).toEqual(
        registryMetadataErrorAction({
          url: 'url1',
          error: errorMessage,
        }),
      );
    });
  });

  describe('requestDevfile', () => {
    it('dispatch receive action on successful fetch', async () => {
      const mockDevfile = 'devfile content';
      (fetchDevfile as jest.Mock).mockResolvedValue(mockDevfile);
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);

      const result = await store.dispatch(actionCreators.requestDevfile('url'));

      const actions = store.getActions();
      expect(actions[0]).toEqual(devfileRequestAction());
      expect(actions[1]).toEqual(devfileReceiveAction({ url: 'url', devfile: mockDevfile }));
      expect(result).toEqual(mockDevfile);
    });

    it('should throw error on failed fetch', async () => {
      const errorMessage = 'Network error';
      (fetchDevfile as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);

      await expect(store.dispatch(actionCreators.requestDevfile('url'))).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions[0]).toEqual(devfileRequestAction());
    });
  });

  describe('requestResources', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockResourcesContent = 'resources content';
      const mockResources = [
        { kind: 'DevWorkspace', metadata: { name: 'workspace1' } } as devfileApi.DevWorkspace,
        {
          kind: 'DevWorkspaceTemplate',
          metadata: { name: 'template1' },
        } as devfileApi.DevWorkspaceTemplate,
      ];
      (fetchResources as jest.Mock).mockResolvedValue(mockResourcesContent);
      (loadResourcesContent as jest.Mock).mockReturnValue(mockResources);
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);

      await store.dispatch(actionCreators.requestResources('url'));

      const actions = store.getActions();
      expect(actions[0]).toEqual(resourcesRequestAction());
      expect(actions[1]).toEqual(
        resourcesReceiveAction({
          url: 'url',
          devWorkspace: mockResources[0] as devfileApi.DevWorkspace,
          devWorkspaceTemplate: mockResources[1] as devfileApi.DevWorkspaceTemplate,
        }),
      );
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';
      (fetchResources as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestResources('url'))).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions[0]).toEqual(resourcesRequestAction());
      expect(actions[1]).toEqual(
        resourcesErrorAction({
          url: 'url',
          error: errorMessage,
        }),
      );
    });

    it('should throw error if DevWorkspace is not found in the fetched resources', async () => {
      const mockResourcesContent = 'resources content';
      (fetchResources as jest.Mock).mockResolvedValue(mockResourcesContent);
      (loadResourcesContent as jest.Mock).mockReturnValue([]);

      await expect(store.dispatch(actionCreators.requestResources('url'))).rejects.toThrow(
        'Failed to find a DevWorkspace in the fetched resources.',
      );

      const actions = store.getActions();
      expect(actions[0]).toEqual(resourcesRequestAction());
    });

    it('should throw error if DevWorkspaceTemplate is not found in the fetched resources', async () => {
      const mockResourcesContent = 'resources content';
      (fetchResources as jest.Mock).mockResolvedValue(mockResourcesContent);
      (loadResourcesContent as jest.Mock).mockReturnValue([{ kind: 'DevWorkspace' }]);

      await expect(store.dispatch(actionCreators.requestResources('url'))).rejects.toThrow(
        'Failed to find a DevWorkspaceTemplate in the fetched resources.',
      );

      const actions = store.getActions();
      expect(actions[0]).toEqual(resourcesRequestAction());
    });
  });

  describe('filter actions', () => {
    it('should dispatch setFilter action', () => {
      store.dispatch(actionCreators.setFilter('filter value'));

      const actions = store.getActions();
      expect(actions[0]).toEqual(filterSetAction('filter value'));
    });

    it('should dispatch clearFilter action', () => {
      store.dispatch(actionCreators.clearFilter());

      const actions = store.getActions();
      expect(actions[0]).toEqual(filterClearAction());
    });
  });
});
