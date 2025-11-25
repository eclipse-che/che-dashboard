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
import {
  DEVWORKSPACE_DEVFILE_SOURCE,
  DEVWORKSPACE_LABEL_METADATA_NAME,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';
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

  describe('getSameRepoWorkspaces method', () => {
    it('should match workspace with propagated factory attributes (real data scenario)', async () => {
      // This test uses the EXACT data structure from the bug report
      const baseUrl =
        'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=java-lombok';

      // The workspace has factory params with propagated attributes
      // This causes workspace.source to include: che-editor and storageType parameters
      const javaLombokWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'java-lombok',
          namespace: 'admin-devspaces',
          annotations: {
            'che.eclipse.org/che-editor': 'che-incubator/che-code/latest',
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              url: {
                location: baseUrl,
              },
              factory: {
                params: `che-editor=che-incubator/che-code/latest&storageType=per-workspace&url=${baseUrl}`,
              },
            }),
          },
        })
        .build();

      // factoryParams.sourceUrl will now also include propagated attributes
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: baseUrl,
        'che-editor': 'che-incubator/che-code/latest',
        storageType: 'per-workspace',
        [EXISTING_WORKSPACE_NAME]: 'dummy-workspace-name', // Trigger the existing workspace check
      });

      const store = new MockStoreBuilder()
        .withDevWorkspaces({
          workspaces: [javaLombokWorkspace],
        })
        .withFactoryResolver({
          resolver: {
            location: baseUrl,
            devfile: {
              schemaVersion: '2.2.2',
              metadata: {
                name: 'java-lombok',
              },
            } as devfileApi.Devfile,
          },
        })
        .build();

      renderComponent(store, searchParams);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      // Should find the workspace - both URLs now have propagated attributes
      // - workspace.source = "baseUrl?id=java-lombok&che-editor=...&storageType=..."
      // - factoryParams.sourceUrl = "baseUrl?id=java-lombok&che-editor=...&storageType=..."
      const expectAlertItem = expect.objectContaining({
        title: 'Existing workspace found',
        children: `An existing workspace java-lombok created from the same repository has been found. Should you want to open the existing workspace or proceed to create a new one, please choose the corresponding action.`,
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

    it('should filter workspaces by matching source URL with airgap sample data', () => {
      const airgapSourceUrl =
        'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=java-lombok';

      // Create workspace using the exact structure from the provided data
      const javaLombokWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'java-lombok',
          namespace: 'admin-devspaces',
          annotations: {
            'che.eclipse.org/che-editor': 'che-incubator/che-code/latest',
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              url: {
                location: airgapSourceUrl,
              },
              factory: {
                params: `che-editor=che-incubator/che-code/latest&storageType=per-workspace&url=${airgapSourceUrl}`,
              },
            }),
          },
        })
        .withSpec({
          template: {
            projects: [
              {
                name: 'lombok-project-sample',
                zip: {
                  location:
                    'CHE_DASHBOARD_INTERNAL_URL/dashboard/api/airgap-sample/project/download?id=java-lombok',
                },
              },
            ],
          },
        })
        .build();

      // Create another workspace with a different source
      const differentWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'different-project',
          namespace: 'admin-devspaces',
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params: 'url=https://github.com/different/repo',
              },
            }),
          },
        })
        .build();

      // Create another workspace with the same source
      const anotherJavaLombokWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'java-lombok-2',
          namespace: 'admin-devspaces',
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params: `url=${airgapSourceUrl}&storageType=ephemeral`,
              },
            }),
          },
        })
        .build();

      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: airgapSourceUrl,
        'che-editor': 'che-incubator/che-code/latest',
        storageType: 'per-workspace',
      });

      const store = new MockStoreBuilder()
        .withDevWorkspaces({
          workspaces: [javaLombokWorkspace, differentWorkspace, anotherJavaLombokWorkspace],
        })
        .withFactoryResolver({
          resolver: {
            location: airgapSourceUrl,
            devfile: {
              schemaVersion: '2.2.2',
              metadata: {
                name: 'java-lombok',
              },
            } as devfileApi.Devfile,
          },
        })
        .build();

      renderComponent(store, searchParams);

      // The component should find 2 workspaces with matching sources
      // and show an alert with options to open them
      waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Existing workspace'),
          }),
        );
      });
    });

    it('should return empty array when no workspaces match the source URL', () => {
      const factoryUrl =
        'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=new';

      // Create workspace with different source
      const existingWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'existing-project',
          namespace: 'admin-devspaces',
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params: 'url=https://github.com/different/repo',
              },
            }),
          },
        })
        .build();

      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: factoryUrl,
        [POLICIES_CREATE_ATTR]: 'perclick',
      });

      const store = new MockStoreBuilder()
        .withDevWorkspaces({
          workspaces: [existingWorkspace],
        })
        .withFactoryResolver({
          resolver: {
            location: factoryUrl,
            devfile: {
              schemaVersion: '2.2.2',
              metadata: {
                name: 'new-project',
              },
            } as devfileApi.Devfile,
          },
        })
        .build();

      renderComponent(store, searchParams);

      // With perclick policy, should proceed to next step without showing error
      jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      waitFor(() => {
        expect(mockOnNextStep).toHaveBeenCalled();
        expect(mockOnError).not.toHaveBeenCalled();
      });
    });

    it('should handle workspaces with propagated factory attributes in source URL', () => {
      const baseUrl = 'http://localhost:8080/dashboard/api/airgap-sample/devfile/download';
      const fullSourceUrl = `${baseUrl}?id=java-lombok&che-editor=che-incubator/che-code/latest&storageType=per-workspace`;

      // Workspace with propagated attributes in source
      const workspaceWithAttrs = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'java-lombok-with-attrs',
          namespace: 'admin-devspaces',
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params: `che-editor=che-incubator/che-code/latest&storageType=per-workspace&url=${baseUrl}?id=java-lombok`,
              },
            }),
          },
        })
        .build();

      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: `${baseUrl}?id=java-lombok`,
        'che-editor': 'che-incubator/che-code/latest',
        storageType: 'per-workspace',
      });

      const store = new MockStoreBuilder()
        .withDevWorkspaces({
          workspaces: [workspaceWithAttrs],
        })
        .withFactoryResolver({
          resolver: {
            location: fullSourceUrl,
            devfile: {
              schemaVersion: '2.2.2',
              metadata: {
                name: 'java-lombok',
              },
            } as devfileApi.Devfile,
          },
        })
        .build();

      renderComponent(store, searchParams);

      // Should find the workspace despite the propagated attributes
      waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Existing workspace found',
            actionCallbacks: expect.arrayContaining([
              expect.objectContaining({
                title: 'Open the existing workspace',
              }),
            ]),
          }),
        );
      });
    });

    it('should correctly match URL location source type', () => {
      const urlLocation =
        'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=test';

      // Workspace with url.location source (not factory params)
      const workspaceWithUrlLocation = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'url-location-workspace',
          namespace: 'admin-devspaces',
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              url: {
                location: urlLocation,
              },
            }),
          },
        })
        .build();

      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: urlLocation,
      });

      const store = new MockStoreBuilder()
        .withDevWorkspaces({
          workspaces: [workspaceWithUrlLocation],
        })
        .withFactoryResolver({
          resolver: {
            location: urlLocation,
            devfile: {
              schemaVersion: '2.2.2',
              metadata: {
                name: 'test-project',
              },
            } as devfileApi.Devfile,
          },
        })
        .build();

      renderComponent(store, searchParams);

      // Should find the workspace with url.location source
      waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Existing workspace found',
          }),
        );
      });
    });
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
                  name: 'empty-4ccb-7qbk',
                  namespace: 'user-che',
                  annotations: {
                    [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                      factory: {
                        params: 'url=https://github.com/eclipse-che/che-dashboard',
                      },
                    }),
                  },
                  labels: {
                    [DEVWORKSPACE_LABEL_METADATA_NAME]: 'project-1',
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

    describe('workspace names conflict faced with the "metadata.name"', () => {
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

    describe('workspace names conflict faced with the "kubernetes.io/metadata.name" label', () => {
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
                  name: 'empty-4ccb-7qbk',
                  namespace: 'user-che',
                  labels: {
                    [DEVWORKSPACE_LABEL_METADATA_NAME]: workspaceName,
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
