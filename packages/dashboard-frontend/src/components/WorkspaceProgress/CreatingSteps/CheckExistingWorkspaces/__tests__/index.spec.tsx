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

import { waitFor } from '@testing-library/react';
import { dump } from 'js-yaml';
import React from 'react';
import { Provider } from 'react-redux';
import { Location } from 'react-router-dom';
import { Store } from 'redux';

import { MIN_STEP_DURATION_MS } from '@/components/WorkspaceProgress/const';
import { container } from '@/inversify.config';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import devfileApi from '@/services/devfileApi';
import { getDefer } from '@/services/helpers/deferred';
import {
  DEV_WORKSPACE_ATTR,
  EXISTING_WORKSPACE_NAME,
  FACTORY_URL_ATTR,
  POLICIES_CREATE_ATTR,
} from '@/services/helpers/factoryFlow/buildFactoryParams';
import { buildFactoryLocation } from '@/services/helpers/location';
import { AlertItem, isActionCallback } from '@/services/helpers/types';
import { TabManager } from '@/services/tabManager';
import { DEVWORKSPACE_DEVFILE_SOURCE } from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { DevWorkspaceResources } from '@/store/DevfileRegistries';

import CreatingStepCheckExistingWorkspaces from '..';

const { renderComponent } = getComponentRenderer(getComponent);

let location: Location;
const mockNavigate = jest.fn();

const mockTabManagerReplace = jest.fn();

const mockOnNextStep = jest.fn();
const mockOnRestart = jest.fn();
const mockOnError = jest.fn();
const mockOnHideError = jest.fn();

const resourcesUrl = 'https://resources-url';
const factoryUrl = 'https://factory-url';

// mute console.error
console.error = jest.fn();

describe('Creating steps, checking existing workspaces', () => {
  beforeEach(() => {
    location = buildFactoryLocation();

    jest.useFakeTimers();

    class MockTabManager extends TabManager {
      public replace(url: string): void {
        mockTabManagerReplace(url);
      }
    }

    container.snapshot();
    container.rebind(TabManager).to(MockTabManager).inSingletonScope();
  });

  afterEach(() => {
    container.restore();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('creating workspace from resources', () => {
    let searchParams: URLSearchParams;

    beforeEach(() => {
      searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: factoryUrl,
        [DEV_WORKSPACE_ATTR]: resourcesUrl,
      });
    });

    test('policy "perclick"', async () => {
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: factoryUrl,
        [POLICIES_CREATE_ATTR]: 'perclick',
        [DEV_WORKSPACE_ATTR]: resourcesUrl,
      });
      const store = new MockStoreBuilder().build();
      renderComponent(store, searchParams);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
      expect(mockOnError).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    describe('no workspace names conflicts', () => {
      let store: Store;
      const workspaceName = 'my-project';

      beforeEach(() => {
        const resources: DevWorkspaceResources = [
          {
            metadata: {
              name: workspaceName,
            },
          } as devfileApi.DevWorkspace,
          {} as devfileApi.DevWorkspaceTemplate,
        ];
        store = new MockStoreBuilder()
          .withDevWorkspaces({
            workspaces: [
              new DevWorkspaceBuilder()
                .withMetadata({
                  name: 'project-1',
                  namespace: 'user-che',
                  annotations: {
                    [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                      factory: {
                        params: 'url=https://github.com/eclipse-che/che-dashboard',
                      },
                    }),
                  },
                })
                .build(),
              new DevWorkspaceBuilder()
                .withMetadata({
                  name: 'project-2',
                  namespace: 'user-che',
                  annotations: {
                    [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                      factory: {
                        params: 'url=https://github.com/eclipse-che/che-dashboard',
                      },
                    }),
                  },
                })
                .build(),
            ],
          })
          .withDevfileRegistries({
            devWorkspaceResources: {
              [resourcesUrl]: {
                resources,
              },
            },
          })
          .withFactoryResolver({
            resolver: {
              location: 'https://github.com/eclipse-che/che-dashboard',
              devfile: {
                schemaVersion: '2.1.0',
                metadata: {
                  name: workspaceName,
                },
              } as devfileApi.Devfile,
            },
          })
          .build();
      });

      it('should open the warning message with the existing workspaces created from the same repo list', async () => {
        searchParams.delete(DEV_WORKSPACE_ATTR);
        searchParams.set(FACTORY_URL_ATTR, 'https://github.com/eclipse-che/che-dashboard');

        renderComponent(store, searchParams);

        await waitFor(() =>
          expect(mockOnError).toHaveBeenCalledWith(
            expect.objectContaining({
              actionCallbacks: expect.arrayContaining([
                {
                  isGroup: true,
                  title: 'Open the existing workspace',
                  actionCallbacks: [
                    {
                      title: 'project-1',
                      callback: expect.any(Function),
                    },
                    {
                      title: 'project-2',
                      callback: expect.any(Function),
                    },
                  ],
                },
              ]),
            }),
          ),
        );

        expect(mockTabManagerReplace).not.toHaveBeenCalled();
      });

      it('should open the existing workspace created from the same repo with the name project-1', async () => {
        searchParams.delete(DEV_WORKSPACE_ATTR);
        searchParams.set(EXISTING_WORKSPACE_NAME, 'project-1');
        searchParams.set(FACTORY_URL_ATTR, 'https://github.com/eclipse-che/che-dashboard');

        renderComponent(store, searchParams);

        await waitFor(() =>
          expect(mockTabManagerReplace).toHaveBeenCalledWith(
            expect.stringContaining(`/ide/user-che/project-1`),
          ),
        );
      });

      it('should open the existing workspace created from the same repo with the name project-2', async () => {
        searchParams.delete(DEV_WORKSPACE_ATTR);
        searchParams.set(EXISTING_WORKSPACE_NAME, 'project-2');
        searchParams.set(FACTORY_URL_ATTR, 'https://github.com/eclipse-che/che-dashboard');

        renderComponent(store, searchParams);

        await waitFor(() =>
          expect(mockTabManagerReplace).toHaveBeenCalledWith(
            expect.stringContaining(`/ide/user-che/project-2`),
          ),
        );
      });

      it('should proceed to the next step', async () => {
        renderComponent(store, searchParams);

        await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

        await jest.runOnlyPendingTimersAsync();

        await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
        expect(mockOnError).not.toHaveBeenCalled();
        expect(mockOnRestart).not.toHaveBeenCalled();
      });
    });

    describe('workspace names conflict faced', () => {
      let store: Store;
      const workspaceName = 'my-project';

      beforeEach(() => {
        const resources: DevWorkspaceResources = [
          {
            metadata: {
              name: workspaceName,
            },
          } as devfileApi.DevWorkspace,
          {} as devfileApi.DevWorkspaceTemplate,
        ];
        store = new MockStoreBuilder()
          .withDevWorkspaces({
            workspaces: [
              new DevWorkspaceBuilder().withName(workspaceName).withNamespace('user-che').build(),
            ],
          })
          .withDevfileRegistries({
            devWorkspaceResources: {
              [resourcesUrl]: {
                resources,
              },
            },
          })
          .build();
      });

      test('notification alert', async () => {
        renderComponent(store, searchParams);

        await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

        const expectAlertItem = expect.objectContaining({
          title: 'Existing workspace found',
          children: `A workspace with the same name (${workspaceName}) has been found. Should you want to open the existing workspace or proceed to create a new one, please choose the corresponding action.`,
          actionCallbacks: [
            expect.objectContaining({
              title: 'Open the existing workspace',
              callback: expect.any(Function),
            }),
            expect.objectContaining({
              title: 'Create a new workspace',
              callback: expect.any(Function),
            }),
          ],
        });
        await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

        expect(mockOnNextStep).not.toHaveBeenCalled();
        expect(mockOnRestart).not.toHaveBeenCalled();
      });

      test('action callback to open the existing workspace', async () => {
        // this deferred object will help run the callback at the right time
        const deferred = getDefer();

        const openExistingWorkspaceActionTitle = 'Open the existing workspace';
        mockOnError.mockImplementationOnce(async (alertItem: AlertItem) => {
          const openExistingWorkspaceAction = alertItem.actionCallbacks?.find(action =>
            action.title.startsWith(openExistingWorkspaceActionTitle),
          );
          expect(openExistingWorkspaceAction).toBeDefined();

          if (openExistingWorkspaceAction && isActionCallback(openExistingWorkspaceAction)) {
            deferred.promise.then(openExistingWorkspaceAction.callback);
          } else {
            throw new Error('Action not found');
          }
        });

        renderComponent(store, searchParams);
        await jest.runAllTimersAsync();

        await waitFor(() => expect(mockOnError).toHaveBeenCalled());
        expect(mockOnNextStep).not.toHaveBeenCalled();
        expect(mockOnRestart).not.toHaveBeenCalled();

        mockOnError.mockClear();

        /* test the action */

        // resolve deferred to trigger the callback
        deferred.resolve();
        await jest.runOnlyPendingTimersAsync();

        await waitFor(() =>
          expect(mockTabManagerReplace).toHaveBeenCalledWith(
            expect.stringContaining(`/ide/user-che/my-project`),
          ),
        );

        expect(mockOnNextStep).not.toHaveBeenCalled();
        expect(mockOnRestart).not.toHaveBeenCalled();
        expect(mockOnError).not.toHaveBeenCalled();
      });

      test('action callback to create a new workspace', async () => {
        // this deferred object will help run the callback at the right time
        const deferred = getDefer();

        const createWorkspaceActionTitle = 'Create a new workspace';
        mockOnError.mockImplementationOnce(async (alertItem: AlertItem) => {
          const createWorkspaceAction = alertItem.actionCallbacks?.find(action =>
            action.title.startsWith(createWorkspaceActionTitle),
          );
          expect(createWorkspaceAction).toBeDefined();

          if (createWorkspaceAction && isActionCallback(createWorkspaceAction)) {
            deferred.promise.then(createWorkspaceAction.callback);
          } else {
            throw new Error('Action not found');
          }
        });

        renderComponent(store, searchParams);
        await jest.runAllTimersAsync();

        await waitFor(() => expect(mockOnError).toHaveBeenCalled());
        expect(mockOnNextStep).not.toHaveBeenCalled();
        expect(mockOnRestart).not.toHaveBeenCalled();

        mockOnError.mockClear();

        /* test the action */

        // resolve deferred to trigger the callback
        deferred.resolve();
        await jest.runOnlyPendingTimersAsync();

        await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
        expect(mockOnRestart).not.toHaveBeenCalled();
        expect(mockOnError).not.toHaveBeenCalled();
      });
    });
  });

  describe('creating workspace from devfiles', () => {
    describe('workspace names conflict faced', () => {
      let store: Store;
      let searchParams: URLSearchParams;
      const workspaceName = 'my-project';

      beforeEach(() => {
        searchParams = new URLSearchParams({
          [FACTORY_URL_ATTR]: factoryUrl,
        });

        store = new MockStoreBuilder()
          .withDevWorkspaces({
            workspaces: [
              new DevWorkspaceBuilder().withName(workspaceName).withNamespace('user-che').build(),
            ],
          })
          .withFactoryResolver({
            resolver: {
              location: factoryUrl,
              devfile: {
                schemaVersion: '2.1.0',
                metadata: {
                  name: workspaceName,
                },
              } as devfileApi.Devfile,
            },
          })
          .build();
      });

      test('notification alert', async () => {
        renderComponent(store, searchParams);
        await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

        const expectAlertItem = expect.objectContaining({
          title: 'Existing workspace found',
          children: `A workspace with the same name (${workspaceName}) has been found. Should you want to open the existing workspace or proceed to create a new one, please choose the corresponding action.`,
          actionCallbacks: [
            expect.objectContaining({
              title: 'Open the existing workspace',
              callback: expect.any(Function),
            }),
            expect.objectContaining({
              title: 'Create a new workspace',
              callback: expect.any(Function),
            }),
          ],
        });
        await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));
        expect(mockOnNextStep).not.toHaveBeenCalled();
        expect(mockOnRestart).not.toHaveBeenCalled();
      });
    });
  });
});

function getComponent(store: Store, searchParams: URLSearchParams): React.ReactElement {
  const component = (
    <CreatingStepCheckExistingWorkspaces
      distance={0}
      hasChildren={false}
      searchParams={searchParams}
      location={location}
      navigate={mockNavigate}
      onNextStep={mockOnNextStep}
      onRestart={mockOnRestart}
      onError={mockOnError}
      onHideError={mockOnHideError}
    />
  );
  return <Provider store={store}>{component}</Provider>;
}
