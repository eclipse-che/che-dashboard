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
import { WorkspaceStoppedDetector } from '@/services/bootstrap/workspaceStoppedDetector';
import { ResourceFetcherService } from '@/services/resource-fetcher';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
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
import { usernameActionCreators } from '@/store/User/Name';
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
jest.spyOn(usernameActionCreators, 'requestUsername').mockImplementation(() => jest.fn());
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

    expect(usernameActionCreators.requestUsername).toHaveBeenCalledTimes(1);
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

    expect(mockWebsocketClient.addChannelMessageListener).toHaveBeenCalledTimes(4);
    expect(mockWebsocketClient.addChannelMessageListener).toHaveBeenCalledWith(
      'devWorkspace',
      expect.any(Function),
    );
    expect(mockWebsocketClient.addChannelMessageListener).toHaveBeenCalledWith(
      'event',
      expect.any(Function),
    );
    expect(mockWebsocketClient.addChannelMessageListener).toHaveBeenCalledWith(
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

  test('calls getWorkspaceTimeout when a stopped workspace with timeout issue is detected', async () => {
    const devWorkspace = new DevWorkspaceBuilder()
      .withId('wksp-inactive')
      .withName('wksp-inactive')
      .withNamespace('user-dev')
      .withStatus({ phase: 'Stopped' })
      .build();

    const mockDetector = {
      checkWorkspaceStopped: jest.fn().mockReturnValue({
        id: 'wksp-inactive',
        ideUrl: undefined,
      }),
      getWorkspaceStoppedIssueType: jest.fn().mockReturnValue('workspaceInactive'),
      getWorkspaceStoppedError: jest.fn().mockReturnValue(new Error('workspace inactive')),
    };
    container
      .rebind(WorkspaceStoppedDetector)
      .toConstantValue(mockDetector as unknown as WorkspaceStoppedDetector);

    const store = new MockStoreBuilder()
      .withDevWorkspaces({ workspaces: [devWorkspace] })
      .withDwServerConfig({
        timeouts: {
          inactivityTimeout: 1800,
          runTimeout: 3600,
          startTimeout: 300,
          axiosRequestTimeout: 30000,
          sessionTimeout: 86400,
        },
      })
      .build();
    const bootstrap = new Bootstrap(store);

    await expect(bootstrap.init()).resolves.toBeUndefined();

    expect(mockDetector.checkWorkspaceStopped).toHaveBeenCalled();
    expect(mockDetector.getWorkspaceStoppedIssueType).toHaveBeenCalled();
    expect(mockDetector.getWorkspaceStoppedError).toHaveBeenCalled();
  });

  test('fetches embedded registry when disableInternalRegistry is true', async () => {
    const store = new MockStoreBuilder()
      .withDwServerConfig({
        devfileRegistry: {
          disableInternalRegistry: true,
          externalDevfileRegistries: [{ url: 'https://registry.devfile.io' }],
        },
      })
      .build();
    const bootstrap = new Bootstrap(store);

    await expect(bootstrap.init()).resolves.toBeUndefined();

    // DEFAULT_REGISTRY (embedded, always available) + external registry = 2 calls.
    // getting-started-sample and airgap-sample are skipped when internal registry is disabled.
    expect(devfileRegistriesActionCreators.requestRegistriesMetadata).toHaveBeenCalledTimes(2);
  });
});
