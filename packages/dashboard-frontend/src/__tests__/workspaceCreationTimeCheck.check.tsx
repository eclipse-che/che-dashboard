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

import { Store } from '@reduxjs/toolkit';
import { screen, waitFor } from '@testing-library/react';
import mockAxios from 'axios';
import { Location } from 'history';
import MockWebSocket from 'jest-websocket-mock';
import React, { Suspense } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import {
  clusterConfigData,
  devworkspaceResources,
  devworkspacesPostData,
  devworkspaceTemplatesData,
  devWorkspaceWebSocketData,
  editorsData,
  eventsData,
  factoryResolverData,
  kubernetesNamespacesData,
  podsData,
  REQUEST_TIME_200,
  REQUEST_TIME_300,
  REQUEST_TIME_400,
  REQUEST_TIME_500,
  REQUEST_TIME_1300,
  serverConfigData,
  sshKeysData,
  TIME_LIMIT,
  url,
  workspacePreferencesData,
} from '@/__tests__/const';
import Fallback from '@/components/Fallback';
import { AppRoutes } from '@/Routes';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import Bootstrap from '@/services/bootstrap';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

// mute the outputs
console.error = jest.fn();
console.warn = jest.fn();
console.debug = jest.fn();

describe('Workspace creation time', () => {
  const mockGet = mockAxios.get as jest.Mock;
  const mockPatch = mockAxios.patch as jest.Mock;
  const mockPost = mockAxios.post as jest.Mock;

  let mockWS: MockWebSocket;

  beforeAll(() => {
    mockWS = new MockWebSocket('ws://localhost/dashboard/api/websocket');
  });

  afterAll(() => {
    mockWS.close();
  });

  afterEach(() => {
    MockWebSocket.clean();
    jest.resetAllMocks();
  });

  test('workspace creation and start time', async () => {
    // start point for the performance measurement
    const startTime = performance.now();

    /**
     * Mock the backend responses
     */

    mockGet.mockImplementation(url => {
      switch (url) {
        case '/dashboard/api/devworkspace/running-workspaces-cluster-limit-exceeded':
          return responseWithDelay(false, REQUEST_TIME_200);
        case '/dashboard/api/server-config':
          return responseWithDelay(serverConfigData, REQUEST_TIME_200);
        case './assets/branding/product.json':
          return responseWithDelay({}, REQUEST_TIME_200);
        case '/api/kubernetes/namespace':
          return responseWithDelay(kubernetesNamespacesData, REQUEST_TIME_200);
        case '/dashboard/api/cluster-info':
          return responseWithDelay({}, REQUEST_TIME_200);
        case '/dashboard/api/userprofile/user-che':
          return responseWithDelay({}, REQUEST_TIME_400);
        case 'http://localhost/dashboard/devfile-registry/devfiles/index.json':
          return responseWithDelay([], REQUEST_TIME_400);
        case '/dashboard/api/namespace/user-che/devworkspaces':
          return responseWithDelay({}, REQUEST_TIME_500);
        case '/dashboard/api/namespace/user-che/events':
          return responseWithDelay(eventsData, REQUEST_TIME_200);
        case '/dashboard/api/namespace/user-che/pods':
          return responseWithDelay(podsData, REQUEST_TIME_300);
        case '/dashboard/api/cluster-config':
          return responseWithDelay(clusterConfigData, REQUEST_TIME_200);
        case '/dashboard/api/namespace/user-che/ssh-key':
          return responseWithDelay(sshKeysData, REQUEST_TIME_200);
        case '/dashboard/api/workspace-preferences/namespace/user-che':
          return responseWithDelay(workspacePreferencesData, REQUEST_TIME_300);
        case '/dashboard/api/editors':
          return responseWithDelay(editorsData, REQUEST_TIME_500);
        case 'http://localhost/dashboard/api/getting-started-sample':
          return responseWithDelay([], REQUEST_TIME_200);
        case 'http://localhost/dashboard/api/airgap-sample':
          return responseWithDelay([], REQUEST_TIME_200);
        case 'http://localhost/dashboard/devfile-registry/devfiles/empty.yaml':
          return responseWithDelay('', REQUEST_TIME_200);
        default:
          console.warn('GET > unknown url:', url);
          return responseWithDelay({}, REQUEST_TIME_400);
      }
    });

    mockPost.mockImplementation((url: string) => {
      switch (url) {
        case '/api/factory/resolver':
          return responseWithDelay(factoryResolverData, REQUEST_TIME_1300);
        case '/api/kubernetes/namespace/provision':
          return responseWithDelay({}, REQUEST_TIME_1300);
        case '/dashboard/api/devworkspace-resources':
          return responseWithDelay(devworkspaceResources, REQUEST_TIME_200);
        case '/dashboard/api/data/resolver':
          return responseWithDelay([], REQUEST_TIME_300);
        case '/dashboard/api/namespace/user-che/devworkspaces':
          // send WebSocket message to simulate the workspace creation
          setTimeout(() => mockWS.send(JSON.stringify(devWorkspaceWebSocketData)), 0);

          return responseWithDelay(devworkspacesPostData, REQUEST_TIME_200);
        case '/dashboard/api/namespace/user-che/devworkspacetemplates':
          return responseWithDelay(devworkspaceTemplatesData, REQUEST_TIME_200);
        case '/api/factory/token/refresh?url=https://github.com/eclipse-che/che-dashboard.git':
          return responseWithDelay(undefined, REQUEST_TIME_1300);
        default:
          console.warn('POST > unknown url:', url);
          return responseWithDelay({}, REQUEST_TIME_400);
      }
    });

    mockPatch.mockImplementation((url: string) => {
      switch (url) {
        case '/dashboard/api/namespace/user-che/devworkspaces/che-dashboard': {
          return responseWithDelay(devworkspacesPostData, REQUEST_TIME_200);
        }
        default:
          console.warn('PATCH > unknown url:', url);
          return responseWithDelay({}, REQUEST_TIME_400);
      }
    });

    const store = new MockStoreBuilder().build();

    /**
     * Preload data
     */

    await new Bootstrap(store).init();

    /**
     * Render Loader flow
     */

    const { renderComponent } = getComponentRenderer(getComponent);
    renderComponent(`/load-factory?url=${url}`, store);

    /**
     * Wait for all the workspace loading steps to be done
     */

    // the workspace loader page is rendered
    await waitFor(
      () =>
        expect(screen.queryByRole('heading', { name: 'Creating a workspace' })).toBeInTheDocument(),
      { timeout: 5000 },
    );

    // step 1: Initializing
    const stepInitializing = screen.getByRole('button', { name: 'Initializing' });
    expect(stepInitializing).toBeInTheDocument();
    await waitFor(() => expect(stepInitializing).toHaveAttribute('aria-current', 'step'), {
      timeout: 5000,
    });

    // step 2: Checking for the limit of running workspaces
    const stepCheckingForLimit = screen.getByRole('button', {
      name: 'Checking for the limit of running workspaces',
    });
    expect(stepCheckingForLimit).toBeInTheDocument();
    await waitFor(() => expect(stepCheckingForLimit).toHaveAttribute('aria-current', 'step'), {
      timeout: 5000,
    });

    // step 3: Creating a workspace
    // skipping because it is never activated, but it's substeps are

    // step 4: Waiting for workspace to start
    const stepStartingWorkspace = screen.getByRole('button', {
      name: 'Waiting for workspace to start',
    });
    expect(stepStartingWorkspace).toBeInTheDocument();
    await waitFor(() => expect(stepStartingWorkspace).toHaveAttribute('aria-current', 'step'), {
      timeout: 5000,
    });

    // step 5: Open IDE
    const stepOpenIde = screen.getByRole('button', {
      name: 'Open IDE',
    });
    expect(stepOpenIde).toBeInTheDocument();
    await waitFor(() => expect(stepOpenIde).toHaveAttribute('aria-current', 'step'), {
      timeout: 5000,
    });

    // end point for the performance measurement
    const endTime = performance.now();

    console.info('Time elapsed:', Math.floor(endTime - startTime), 'ms');
    expect(endTime - startTime).toBeLessThan(TIME_LIMIT);
  }, 15000);
});

function getComponent(locationOrPath: Location | string, store: Store): React.ReactElement {
  return (
    <Provider store={store}>
      <MemoryRouter initialEntries={[locationOrPath]}>
        <Suspense fallback={Fallback}>
          <AppRoutes />
        </Suspense>
      </MemoryRouter>
    </Provider>
  );
}

function responseWithDelay(
  data: unknown,
  headers: unknown,
  delayMs: number,
): Promise<{ data: unknown; headers: unknown }>;
function responseWithDelay(
  data: unknown,
  delayMs: number,
): Promise<{ data: unknown; headers: unknown }>;
function responseWithDelay(...args: unknown[]): Promise<{ data: unknown; headers: unknown }> {
  let data: unknown;
  let headers: unknown;
  let delayMs: number;
  if (args.length === 2) {
    data = args[0];
    delayMs = args[1] as number;
    headers = {};
  } else {
    data = args[0];
    headers = args[1];
    delayMs = args[2] as number;
  }
  return new Promise(resolve =>
    setTimeout(
      () =>
        resolve({
          data,
          headers,
        }),
      delayMs,
    ),
  );
}
