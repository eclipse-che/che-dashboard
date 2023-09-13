/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React, { Suspense } from 'react';
import { Location } from 'history';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { render, screen, waitFor } from '@testing-library/react';
import Routes from '../Routes';
import { FakeStoreBuilder } from '../store/__mocks__/storeBuilder';
import Fallback from '../components/Fallback';
import mockAxios from 'axios';
import { MockStoreEnhanced } from 'redux-mock-store';
import { AppState } from '../store';
import { ThunkDispatch } from 'redux-thunk';
import { AnyAction } from 'redux';
import devfileApi from '../services/devfileApi';
import { ConvertedState } from '../store/FactoryResolver';
import {
  url,
  devfileV2,
  factoryResolver,
  devworkspaceResources,
  plugins,
  targetDevWorkspace,
  devfileContent,
  editorContent,
  namespace,
  targetDevWorkspaceTemplate,
  TIME_LIMIT,
  FACTORY_RESOLVER_DELAY,
  DEVWORKSPACE_RESOURSES_DELAY,
  CREATE_DEVWORKSPACE_DELAY,
  CREATE_DEVWORKSPACETEMPLATE_DELAY,
  PATCH_DEVWORKSPACE_DELAY,
} from './const';
import { api } from '@eclipse-che/common';
import { dump } from 'js-yaml';
import { cloneDeep } from 'lodash';

// mute the outputs
console.error = jest.fn();
console.warn = jest.fn();
console.debug = jest.fn();

describe('Workspace creation time', () => {
  const mockGet = mockAxios.get as jest.Mock;
  const mockPatch = mockAxios.patch as jest.Mock;
  const mockPost = mockAxios.post as jest.Mock;

  const dateConstructor = window.Date;
  const timestampNew = '2023-09-04T14:09:42.560Z';
  let execTime: number;
  let execTimer: number | undefined = undefined;
  beforeEach(() => {
    class MockDate extends Date {
      constructor() {
        super(timestampNew);
      }
    }
    window.Date = MockDate as DateConstructor;

    execTime = 0;
    execTimer = window.setInterval(() => (execTime += 100), 100);
  });

  afterEach(() => {
    jest.resetAllMocks();
    window.Date = dateConstructor;
    if (execTimer) {
      clearInterval(execTimer);
    }
  });

  it('should be less then the TIME_LIMIT', async () => {
    mockPost.mockResolvedValueOnce(
      new Promise(resolve =>
        setTimeout(
          () =>
            resolve({
              data: factoryResolver,
            }),
          FACTORY_RESOLVER_DELAY,
        ),
      ),
    );

    const { rerender } = render(
      getComponent(
        `/load-factory?url=${url}`,
        new FakeStoreBuilder().withInfrastructureNamespace([namespace]).build(),
      ),
    );

    await waitFor(
      () =>
        expect(mockPost).toBeCalledWith('/api/factory/resolver', { error_code: undefined, url }),
      { timeout: 4000 },
    );
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockPatch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument();

    mockPost.mockClear();
    mockPost.mockResolvedValueOnce(
      new Promise(resolve =>
        setTimeout(
          () =>
            resolve({
              data: devworkspaceResources,
            }),
          DEVWORKSPACE_RESOURSES_DELAY,
        ),
      ),
    );
    mockPost.mockResolvedValueOnce(
      new Promise(resolve =>
        setTimeout(
          () =>
            resolve({
              data: Object.assign(cloneDeep(targetDevWorkspace), {
                metadata: {
                  annotations: {
                    'che.eclipse.org/che-editor': 'che-incubator/che-code/insiders',
                    'che.eclipse.org/last-updated-timestamp': `${timestampNew}`,
                  },
                  name: 'che-dashboard',
                  namespace: namespace.name,
                  uid: 'che-dashboard-test-uid',
                  labels: {},
                },
              }),
              headers: {},
            }),
          CREATE_DEVWORKSPACE_DELAY,
        ),
      ),
    );
    mockPost.mockResolvedValueOnce(
      new Promise(resolve =>
        setTimeout(
          () =>
            resolve({
              data: cloneDeep(targetDevWorkspaceTemplate),
              headers: {},
            }),
          CREATE_DEVWORKSPACETEMPLATE_DELAY,
        ),
      ),
    );

    mockPatch.mockResolvedValueOnce(
      new Promise(resolve =>
        setTimeout(
          () =>
            resolve({
              data: cloneDeep(targetDevWorkspace),
            }),
          PATCH_DEVWORKSPACE_DELAY,
        ),
      ),
    );

    rerender(
      getComponent(
        `/load-factory?url=${url}`,
        new FakeStoreBuilder()
          .withInfrastructureNamespace([namespace])
          .withFactoryResolver({
            resolver: Object.assign(
              { location: 'https://github.com/eclipse-che/che-dashboard' },
              factoryResolver,
            ),
            converted: {
              isConverted: false,
              devfileV2: devfileV2,
            } as ConvertedState,
          })
          .withDwServerConfig({
            defaults: {
              editor: 'che-incubator/che-code/insiders',
            },
            pluginRegistryURL: 'http://localhost/plugin-registry/v3',
          } as api.IServerConfig)
          .withDwPlugins(plugins)
          .withDevfileRegistries({
            devfiles: {
              ['http://localhost/plugin-registry/v3/plugins/che-incubator/che-code/insiders/devfile.yaml']:
                {
                  content: dump({
                    schemaVersion: '2.2.0',
                    metadata: {
                      name: 'che-code',
                    },
                  } as devfileApi.Devfile),
                },
            },
          })
          .build(),
      ),
    );

    await waitFor(
      () =>
        expect(mockPost.mock.calls).toEqual([
          [
            '/dashboard/api/devworkspace-resources',
            {
              devfileContent: devfileContent,
              editorContent: editorContent,
              editorId: undefined,
              editorPath: undefined,
              pluginRegistryUrl: 'http://localhost/plugin-registry/v3',
            },
          ],
          [
            `/dashboard/api/namespace/${namespace.name}/devworkspaces`,
            {
              devworkspace: targetDevWorkspace,
            },
          ],
          [
            `/dashboard/api/namespace/${namespace.name}/devworkspacetemplates`,
            {
              template: cloneDeep(targetDevWorkspaceTemplate),
            },
          ],
        ]),
      { timeout: 1500 },
    );
    expect(mockPost).toBeCalledTimes(3);

    await waitFor(
      () =>
        expect(mockPatch.mock.calls).toEqual([
          [
            `/dashboard/api/namespace/${namespace.name}/devworkspaces/${targetDevWorkspace.metadata.name}`,
            [
              {
                op: 'replace',
                path: '/spec/template/components',
                value: [
                  {
                    container: {
                      env: [
                        {
                          name: 'CHE_DASHBOARD_URL',
                          value: 'http://localhost',
                        },
                        {
                          name: 'CHE_PLUGIN_REGISTRY_URL',
                          value: 'http://localhost/plugin-registry/v3',
                        },
                        {
                          name: 'CHE_PLUGIN_REGISTRY_INTERNAL_URL',
                          value: '',
                        },
                        {
                          name: 'OPENVSX_REGISTRY_URL',
                          value: '',
                        },
                      ],
                      image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
                    },
                    name: 'universal-developer-image',
                  },
                ],
              },
            ],
          ],
        ]),
      { timeout: 1500 },
    );
    expect(mockPatch).toBeCalledTimes(1);
    expect(mockGet).not.toBeCalled();
    expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument();

    expect(execTime).toBeLessThan(TIME_LIMIT);
  }, 15000);
});

function getComponent(
  locationOrPath: Location | string,
  store: MockStoreEnhanced<AppState, ThunkDispatch<AppState, undefined, AnyAction>>,
): React.ReactElement {
  return (
    <Provider store={store}>
      <MemoryRouter initialEntries={[locationOrPath]}>
        <Suspense fallback={Fallback}>
          <Routes />
        </Suspense>
      </MemoryRouter>
    </Provider>
  );
}
