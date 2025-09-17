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
import {
  DEV_WORKSPACE_ATTR,
  EXISTING_WORKSPACE_NAME,
  FACTORY_URL_ATTR,
  POLICIES_CREATE_ATTR,
  REVISION_ATTR,
} from '@/services/helpers/factoryFlow/buildFactoryParams';
import { buildFactoryLocation } from '@/services/helpers/location';
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

      it('should open the existing workspace created from the same repo and revision', async () => {
        searchParams.delete(DEV_WORKSPACE_ATTR);
        searchParams.set(EXISTING_WORKSPACE_NAME, 'project-1');
        searchParams.set(FACTORY_URL_ATTR, 'https://github.com/eclipse-che/che-dashboard');
        searchParams.set(REVISION_ATTR, 'revision');

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
                .withSpec({
                  template: {
                    projects: [
                      {
                        git: {
                          remotes: {
                            origin: 'remote',
                          },
                          checkoutFrom: { revision: 'revision' },
                        },
                        name: 'project-1',
                      },
                    ],
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

        renderComponent(store, searchParams);

        await waitFor(() =>
          expect(mockTabManagerReplace).toHaveBeenCalledWith(
            expect.stringContaining(`/ide/user-che/project-1`),
          ),
        );
      });

      it('should not open the existing workspace created from the same repo with revision in workspace', async () => {
        searchParams.delete(DEV_WORKSPACE_ATTR);
        searchParams.set(EXISTING_WORKSPACE_NAME, 'project-1');
        searchParams.set(FACTORY_URL_ATTR, 'https://github.com/eclipse-che/che-dashboard');

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
                .withSpec({
                  template: {
                    projects: [
                      {
                        git: {
                          remotes: {
                            origin: 'remote',
                          },
                          checkoutFrom: { revision: 'revision' },
                        },
                        name: 'project-1',
                      },
                    ],
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

        renderComponent(store, searchParams);

        await waitFor(() =>
          expect(mockTabManagerReplace).not.toHaveBeenCalledWith(
            expect.stringContaining(`/ide/user-che/project-1`),
          ),
        );
      });

      it('should not open the existing workspace created from the same repo with revision in parameters', async () => {
        searchParams.delete(DEV_WORKSPACE_ATTR);
        searchParams.set(EXISTING_WORKSPACE_NAME, 'project-1');
        searchParams.set(FACTORY_URL_ATTR, 'https://github.com/eclipse-che/che-dashboard');
        searchParams.set(REVISION_ATTR, 'revision');

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

        renderComponent(store, searchParams);

        await waitFor(() =>
          expect(mockTabManagerReplace).not.toHaveBeenCalledWith(
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

      test('should not show notification alert', async () => {
        renderComponent(store, searchParams);

        await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

        await waitFor(() => expect(mockOnError).not.toHaveBeenCalled());
      });

      test('action callback to create a new workspace', async () => {
        renderComponent(store, searchParams);

        await jest.runOnlyPendingTimersAsync();

        await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
        expect(mockOnRestart).not.toHaveBeenCalled();
        expect(mockOnError).not.toHaveBeenCalled();
      });
    });
  });

  describe('creating workspace from devfiles', () => {
    let store: Store;
    let searchParams: URLSearchParams;
    const workspaceName = 'my-project';
    describe('with one existing workspace created from the same repository', () => {
      describe('DEVWORKSPACE_DEVFILE_SOURCE conflict faced', () => {
        beforeEach(() => {
          searchParams = new URLSearchParams({
            [FACTORY_URL_ATTR]: factoryUrl,
            [EXISTING_WORKSPACE_NAME]: 'dummy-workspace-name',
          });

          store = new MockStoreBuilder()
            .withDevWorkspaces({
              workspaces: [
                new DevWorkspaceBuilder()
                  .withMetadata({
                    name: workspaceName,
                    namespace: 'user-che',
                    annotations: {
                      [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                        factory: {
                          params: `url=${factoryUrl}`,
                        },
                      }),
                    },
                  })
                  .build(),
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

        test('notification alert with one existing workspace created from the same repository', async () => {
          renderComponent(store, searchParams);
          await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

          const expectAlertItem = expect.objectContaining({
            title: 'Existing workspace found',
            children: `An existing workspace ${workspaceName} created from the same repository has been found. Should you want to open the existing workspace or proceed to create a new one, please choose the corresponding action.`,
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
    describe('with several existing workspace created from the same repository', () => {
      describe('DEVWORKSPACE_DEVFILE_SOURCE conflict faced', () => {
        beforeEach(() => {
          searchParams = new URLSearchParams({
            [FACTORY_URL_ATTR]: factoryUrl,
            [EXISTING_WORKSPACE_NAME]: 'dummy-workspace-name',
          });

          store = new MockStoreBuilder()
            .withDevWorkspaces({
              workspaces: [
                new DevWorkspaceBuilder()
                  .withMetadata({
                    name: workspaceName,
                    namespace: 'user-che',
                    annotations: {
                      [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                        factory: {
                          params: `url=${factoryUrl}`,
                        },
                      }),
                    },
                  })
                  .build(),
                new DevWorkspaceBuilder()
                  .withMetadata({
                    name: `${workspaceName}-2`,
                    namespace: 'user-che',
                    annotations: {
                      [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                        factory: {
                          params: `url=${factoryUrl}`,
                        },
                      }),
                    },
                  })
                  .build(),
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

        test('notification alert with one existing workspace created from the same repository', async () => {
          renderComponent(store, searchParams);
          await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

          const expectAlertItem = expect.objectContaining({
            title: 'Existing workspaces created from the same repository are found',
            children: `Several workspaces created from the same repository have been found. Should you want to open one of the existing workspaces or create a new one, please choose the corresponding action.`,
            actionCallbacks: [
              expect.objectContaining({
                title: 'Open the existing workspace',
                isGroup: true,
                actionCallbacks: [
                  expect.objectContaining({
                    title: workspaceName,
                    callback: expect.any(Function),
                  }),
                  expect.objectContaining({
                    title: `${workspaceName}-2`,
                    callback: expect.any(Function),
                  }),
                ],
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
