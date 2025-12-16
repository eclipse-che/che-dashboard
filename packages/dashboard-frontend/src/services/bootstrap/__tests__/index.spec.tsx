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

import { container } from '@/inversify.config';
import { provisionKubernetesNamespace } from '@/services/backend-client/kubernetesNamespaceApi';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import Bootstrap from '@/services/bootstrap';
import { signIn } from '@/services/helpers/login';
import { ResourceFetcherService } from '@/services/resource-fetcher';
import { hasLoginPage, isForbidden, isUnauthorized } from '@/services/workspace-client/helpers';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { bannerAlertActionCreators } from '@/store/BannerAlert';
import { brandingActionCreators } from '@/store/Branding';
import { clusterConfigActionCreators } from '@/store/ClusterConfig';
import { clusterInfoActionCreators } from '@/store/ClusterInfo';
import { devfileRegistriesActionCreators } from '@/store/DevfileRegistries';
import { eventsActionCreators } from '@/store/Events';
import { infrastructureNamespacesActionCreators } from '@/store/InfrastructureNamespaces';
import { chePluginsActionCreators } from '@/store/Plugins/chePlugins';
import { devWorkspacePluginsActionCreators } from '@/store/Plugins/devWorkspacePlugins';
import { podsActionCreators } from '@/store/Pods';
import { serverConfigActionCreators } from '@/store/ServerConfig';
import { sshKeysActionCreators } from '@/store/SshKeys';
import { userProfileActionCreators } from '@/store/User/Profile';
import { workspacesActionCreators } from '@/store/Workspaces';
import { workspacePreferencesActionCreators } from '@/store/Workspaces/Preferences';

const mockPrefetchResources = jest.fn().mockResolvedValue(undefined);
jest.spyOn(ResourceFetcherService.prototype, 'prefetchResources').mockImplementation(() => {
  return mockPrefetchResources();
});

jest.spyOn(serverConfigActionCreators, 'requestServerConfig').mockImplementation(() => jest.fn());
jest.mock('@/services/backend-client/kubernetesNamespaceApi', () => {
  const originalModule = jest.requireActual(
    '@/services/backend-client/kubernetesNamespaceApi',
  ) as Record<string, unknown>;
  return {
    ...originalModule,
    provisionKubernetesNamespace: jest.fn(),
  };
});
jest.spyOn(brandingActionCreators, 'requestBranding').mockImplementation(() => jest.fn());
jest.mock('@/store/InfrastructureNamespaces', () => ({
  ...jest.requireActual('@/store/InfrastructureNamespaces'),
  selectDefaultNamespace: jest
    .fn()
    .mockReturnValue({ name: 'test-che', attributes: { phase: 'Active' } }),
}));
jest
  .spyOn(infrastructureNamespacesActionCreators, 'requestNamespaces')
  .mockImplementation(() => jest.fn());
jest.spyOn(clusterInfoActionCreators, 'requestClusterInfo').mockImplementation(() => jest.fn());
jest.spyOn(userProfileActionCreators, 'requestUserProfile').mockImplementation(() => jest.fn());
jest.spyOn(chePluginsActionCreators, 'requestPlugins').mockImplementation(() => jest.fn());
jest
  .spyOn(devWorkspacePluginsActionCreators, 'requestDwDefaultEditor')
  .mockImplementation(() => jest.fn());
jest
  .spyOn(devWorkspacePluginsActionCreators, 'requestDwDefaultPlugins')
  .mockImplementation(() => jest.fn());
jest.mock('@/store/DevfileRegistries', () => ({
  ...jest.requireActual('@/store/DevfileRegistries'),
  selectEmptyWorkspaceUrl: jest.fn().mockReturnValue('empty-workspace-url'),
}));
jest
  .spyOn(devfileRegistriesActionCreators, 'requestRegistriesMetadata')
  .mockImplementation(() => jest.fn());
jest.spyOn(devfileRegistriesActionCreators, 'requestDevfile').mockImplementation(() => jest.fn());
jest.spyOn(workspacesActionCreators, 'requestWorkspaces').mockImplementation(() => jest.fn());
jest.mock('@/store/Workspaces/devWorkspaces', () => ({
  ...jest.requireActual('@/store/Workspaces/devWorkspaces'),
  selectDevWorkspacesResourceVersion: jest.fn(),
}));
jest.mock('@/store/Events', () => ({
  ...jest.requireActual('@/store/Events'),
  selectEventsResourceVersion: jest.fn(),
}));
jest.spyOn(eventsActionCreators, 'requestEvents').mockImplementation(() => jest.fn());
jest.spyOn(eventsActionCreators, 'handleWebSocketMessage').mockImplementation(() => jest.fn());
jest.spyOn(podsActionCreators, 'requestPods').mockImplementation(() => jest.fn());
jest.mock('@/store/ClusterConfig', () => ({
  ...jest.requireActual('@/store/ClusterConfig'),
  selectDashboardFavicon: jest.fn(),
}));
jest.spyOn(clusterConfigActionCreators, 'requestClusterConfig').mockImplementation(() => jest.fn());
jest.spyOn(sshKeysActionCreators, 'requestSshKeys').mockImplementation(() => jest.fn());
jest
  .spyOn(workspacePreferencesActionCreators, 'requestPreferences')
  .mockImplementation(() => jest.fn());
jest.spyOn(bannerAlertActionCreators, 'addBanner').mockImplementation(() => jest.fn());

jest.mock('@/services/helpers/login');
jest.mock('@/services/workspace-client/helpers');

const mockWebsocketClient = {
  connect: jest.fn(),
  addChannelMessageListener: jest.fn(),
  subscribeToChannel: jest.fn(),
};

// mute the outputs
console.error = jest.fn();
console.log = jest.fn();

describe('Dashboard bootstrap', () => {
  beforeEach(() => {
    container.snapshot();
    container
      .rebind(WebsocketClient)
      .toConstantValue(mockWebsocketClient as unknown as WebsocketClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    container.restore();
  });

  test('all resources fetched successfully', async () => {
    const store = new MockStoreBuilder().build();
    const bootstrap = new Bootstrap(store);

    await expect(bootstrap.init()).resolves.toBeUndefined();
    // await bootstrap.init();

    expect(serverConfigActionCreators.requestServerConfig).toHaveBeenCalledTimes(1);
    expect(provisionKubernetesNamespace).toHaveBeenCalledTimes(1);

    expect(mockPrefetchResources).toHaveBeenCalledTimes(1);

    expect(brandingActionCreators.requestBranding).toHaveBeenCalledTimes(1);
    expect(infrastructureNamespacesActionCreators.requestNamespaces).toHaveBeenCalledTimes(1);
    expect(clusterInfoActionCreators.requestClusterInfo).toHaveBeenCalledTimes(1);

    expect(userProfileActionCreators.requestUserProfile).toHaveBeenCalledTimes(1);
    expect(chePluginsActionCreators.requestPlugins).toHaveBeenCalledTimes(1);
    expect(devWorkspacePluginsActionCreators.requestDwDefaultEditor).toHaveBeenCalledTimes(1);
    expect(devWorkspacePluginsActionCreators.requestDwDefaultPlugins).toHaveBeenCalledTimes(1);
    expect(devfileRegistriesActionCreators.requestRegistriesMetadata).toHaveBeenCalledTimes(3);
    expect(devfileRegistriesActionCreators.requestDevfile).toHaveBeenCalledTimes(1);
    expect(workspacesActionCreators.requestWorkspaces).toHaveBeenCalledTimes(1);
    expect(eventsActionCreators.requestEvents).toHaveBeenCalledTimes(1);
    expect(podsActionCreators.requestPods).toHaveBeenCalledTimes(1);
    expect(clusterConfigActionCreators.requestClusterConfig).toHaveBeenCalledTimes(1);
    expect(sshKeysActionCreators.requestSshKeys).toHaveBeenCalledTimes(1);
    expect(workspacePreferencesActionCreators.requestPreferences).toHaveBeenCalledTimes(1);

    /* WebSocket Client */

    expect(mockWebsocketClient.connect).toHaveBeenCalledTimes(3);

    expect(mockWebsocketClient.addChannelMessageListener).toHaveBeenCalledTimes(3);
    expect(mockWebsocketClient.addChannelMessageListener).toHaveBeenNthCalledWith(
      1,
      'devWorkspace',
      expect.any(Function),
    );
    expect(mockWebsocketClient.addChannelMessageListener).toHaveBeenNthCalledWith(
      2,
      'event',
      expect.any(Function),
    );
    expect(mockWebsocketClient.addChannelMessageListener).toHaveBeenNthCalledWith(
      3,
      'pod',
      expect.any(Function),
    );

    expect(mockWebsocketClient.subscribeToChannel).toHaveBeenCalledTimes(3);
    expect(mockWebsocketClient.subscribeToChannel).toHaveBeenNthCalledWith(
      1,
      'devWorkspace',
      'test-che',
      { getResourceVersion: expect.any(Function) },
    );
    expect(mockWebsocketClient.subscribeToChannel).toHaveBeenNthCalledWith(2, 'event', 'test-che', {
      getResourceVersion: expect.any(Function),
    });
    expect(mockWebsocketClient.subscribeToChannel).toHaveBeenNthCalledWith(3, 'pod', 'test-che', {
      getResourceVersion: expect.any(Function),
    });
  });

  describe('error handling for expired authorization', () => {
    it('should call signIn when provisionKubernetesNamespace throws 401 Unauthorized error', async () => {
      const store = new MockStoreBuilder().build();
      const bootstrap = new Bootstrap(store);
      const unauthorizedError = new Error('Unauthorized');
      (provisionKubernetesNamespace as jest.Mock).mockRejectedValue(unauthorizedError);
      (isUnauthorized as jest.Mock).mockReturnValue(true);
      (isForbidden as jest.Mock).mockReturnValue(false);
      (hasLoginPage as jest.Mock).mockReturnValue(false);

      await expect(bootstrap.init()).rejects.toThrow();

      expect(signIn).toHaveBeenCalledTimes(1);
    });

    it('should call signIn when provisionKubernetesNamespace throws 403 Forbidden error with login page', async () => {
      const store = new MockStoreBuilder().build();
      const bootstrap = new Bootstrap(store);
      const forbiddenError = new Error('Forbidden');
      (provisionKubernetesNamespace as jest.Mock).mockRejectedValue(forbiddenError);
      (isUnauthorized as jest.Mock).mockReturnValue(false);
      (isForbidden as jest.Mock).mockReturnValue(true);
      (hasLoginPage as jest.Mock).mockReturnValue(true);

      await expect(bootstrap.init()).rejects.toThrow();

      expect(signIn).toHaveBeenCalledTimes(1);
    });

    it('should not call signIn when provisionKubernetesNamespace throws 403 Forbidden error without login page', async () => {
      const store = new MockStoreBuilder().build();
      const bootstrap = new Bootstrap(store);
      const forbiddenError = new Error('Forbidden');
      (provisionKubernetesNamespace as jest.Mock).mockRejectedValue(forbiddenError);
      (isUnauthorized as jest.Mock).mockReturnValue(false);
      (isForbidden as jest.Mock).mockReturnValue(true);
      (hasLoginPage as jest.Mock).mockReturnValue(false);

      await expect(bootstrap.init()).rejects.toThrow();

      expect(signIn).not.toHaveBeenCalled();
    });

    it('should not call signIn when provisionKubernetesNamespace throws other errors', async () => {
      const store = new MockStoreBuilder().build();
      const bootstrap = new Bootstrap(store);
      const networkError = new Error('Network error');
      (provisionKubernetesNamespace as jest.Mock).mockRejectedValue(networkError);
      (isUnauthorized as jest.Mock).mockReturnValue(false);
      (isForbidden as jest.Mock).mockReturnValue(false);
      (hasLoginPage as jest.Mock).mockReturnValue(false);

      await expect(bootstrap.init()).rejects.toThrow();

      expect(signIn).not.toHaveBeenCalled();
    });
  });
});
