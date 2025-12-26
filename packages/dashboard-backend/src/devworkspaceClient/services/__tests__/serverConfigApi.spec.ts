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

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as mockClient from '@kubernetes/client-node';
import { CustomObjectsApi } from '@kubernetes/client-node';

import { CheClusterCustomResource, CustomResourceDefinitionList } from '@/devworkspaceClient';
import {
  getEnvVarValue,
  ServerConfigApiService,
} from '@/devworkspaceClient/services/serverConfigApi';

jest.mock('@/helpers/getUserName.ts');

const mockRun = jest.fn();
jest.mock('@/devworkspaceClient/services/helpers/exec', () => ({
  run: (command: string, args: string[]) => mockRun(command, args),
  runWithOutput: jest.fn(),
}));

describe('Server Config API Service', () => {
  const env = process.env;
  let serverConfigService: ServerConfigApiService;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      CHECLUSTER_CR_NAME: 'eclipse-che',
      CHECLUSTER_CR_NAMESPACE: 'eclipse-che',
    };

    const { KubeConfig } = mockClient;
    const kubeConfig = new KubeConfig();

    kubeConfig.makeApiClient = jest.fn().mockImplementation((_api: unknown) => {
      return {
        listClusterCustomObject: () => {
          return Promise.resolve(buildCustomResourceList().body);
        },
      } as unknown as CustomObjectsApi;
    });

    serverConfigService = new ServerConfigApiService(kubeConfig);
  });

  afterEach(() => {
    process.env = env;
    jest.clearAllMocks();
  });

  test('fetching custom resource definition', async () => {
    const res = await serverConfigService.fetchCheCustomResource();
    expect(res).toEqual(buildCustomResource());
  });

  test('getting container build options', () => {
    const res = serverConfigService.getContainerBuild(buildCustomResource());
    expect(res.containerBuildConfiguration).toEqual(
      expect.objectContaining({
        openShiftSecurityContextConstraint: 'container-build',
      }),
    );
    expect(res.disableContainerBuildCapabilities).toEqual(false);
  });

  test('getting container run options', () => {
    const res = serverConfigService.getContainerRun(buildCustomResource());
    expect(res.containerRunConfiguration).toEqual(
      expect.objectContaining({
        openShiftSecurityContextConstraint: 'container-run',
      }),
    );
    expect(res.disableContainerRunCapabilities).toEqual(false);
  });

  test('getting default plugins', () => {
    const res = serverConfigService.getDefaultPlugins(buildCustomResource());
    expect(res).toEqual([]);
  });

  test('getting default editor', () => {
    const res = serverConfigService.getDefaultEditor(buildCustomResource());
    expect(res).toEqual('eclipse/che-theia/latest');
  });

  test('getting default components', () => {
    const res = serverConfigService.getDefaultComponents(buildCustomResource());
    expect(res).toEqual([{ container: { image: 'component-image' }, name: 'component-name' }]);
  });

  test('getting openVSXURL from the CR', () => {
    const openVSXURL = 'https://open-vsx.org';
    const res = serverConfigService.getPluginRegistry(buildCustomResource({ openVSXURL }));
    expect(res).toEqual({ openVSXURL: 'https://open-vsx.org' });
  });

  test('getting openVSXURL from the env var', () => {
    process.env.CHE_DEFAULT_SPEC_COMPONENTS_PLUGINREGISTRY_OPENVSXURL = 'https://open-vsx.org';
    const res = serverConfigService.getPluginRegistry(buildCustomResource());
    expect(res).toEqual({ openVSXURL: 'https://open-vsx.org' });
  });

  test('getting empty openVSXURL from the env var', () => {
    process.env.CHE_DEFAULT_SPEC_COMPONENTS_PLUGINREGISTRY_OPENVSXURL = '';
    const res = serverConfigService.getPluginRegistry(buildCustomResource());
    expect(res).toEqual({ openVSXURL: '' });
  });

  test('getting PVC strategy', () => {
    const res = serverConfigService.getPvcStrategy(buildCustomResource());
    expect(res).toEqual('per-user');
  });

  test('getting dashboard warning', () => {
    const res = serverConfigService.getDashboardWarning(buildCustomResource());
    expect(res).toEqual('dashboard banner text');
  });

  test('getting running workspaces limit', () => {
    const res = serverConfigService.getRunningWorkspacesLimit(buildCustomResource());
    expect(res).toEqual(1);
  });

  test('getting running workspaces cluster limit', () => {
    const res = serverConfigService.getRunningWorkspacesClusterLimit(buildCustomResource());
    expect(res).toEqual(100);
  });

  test('getting workspace inactivity timeout', () => {
    const res = serverConfigService.getWorkspaceInactivityTimeout(buildCustomResource());
    expect(res).toEqual(1800);
  });

  test('getting workspace run timeout', () => {
    const res = serverConfigService.getWorkspaceRunTimeout(buildCustomResource());
    expect(res).toEqual(-1);
  });

  test('getting internal registry disable status', () => {
    const customResource = buildCustomResource();
    let res = serverConfigService.getInternalRegistryDisableStatus(customResource);
    expect(res).toBeFalsy();

    if (customResource.spec.components?.devfileRegistry) {
      customResource.spec.components.devfileRegistry.disableInternalRegistry = true;
    }
    res = serverConfigService.getInternalRegistryDisableStatus(customResource);
    expect(res).toBeTruthy();
  });

  test('getting external devfile registries', () => {
    const res = serverConfigService.getExternalDevfileRegistries(buildCustomResource());
    expect(res.length).toEqual(1);
    expect(res[0]?.url).toEqual('https://devfile.registry.test.org/');
  });

  test('getting default plugin registry URL', () => {
    const res = serverConfigService.getDefaultPluginRegistryUrl(buildCustomResource());
    expect(res).toEqual('http://plugin-registry.eclipse-che.svc/v3');
  });

  test('getting autoProvision value', () => {
    const res = serverConfigService.getAutoProvision(buildCustomResource());
    expect(res).toBeTruthy();
  });

  test('getting advanced authorization object', () => {
    const res = serverConfigService.getAdvancedAuthorization(buildCustomResource());
    expect(res).toEqual({ allowUsers: ['user1', 'user2'] });
  });

  test('getting allowed source urls', () => {
    const res = serverConfigService.getAllowedSourceUrls(buildCustomResource());
    expect(res).toEqual(['https://github.com']);
  });

  describe('Axios Request Timeout', () => {
    test('getting default value', () => {
      const res = serverConfigService.getAxiosRequestTimeout();
      expect(res).toEqual(30000);
    });
    test('getting custom value', () => {
      process.env['CHE_DASHBOARD_AXIOS_REQUEST_TIMEOUT'] = '55000';
      const res = serverConfigService.getAxiosRequestTimeout();
      expect(res).toEqual(55000);
    });
  });

  describe('Show deprecated editors', () => {
    test('getting default value', () => {
      const res = serverConfigService.getShowDeprecatedEditors(buildCustomResource());
      expect(res).toBeFalsy();
    });
    test('getting custom value', () => {
      process.env['CHE_SHOW_DEPRECATED_EDITORS'] = 'true';
      const res = serverConfigService.getShowDeprecatedEditors(buildCustomResource());
      expect(res).toBeTruthy();
    });
  });

  describe('Hide editors by name array', () => {
    test('getting showDeprecated value', () => {
      const res = serverConfigService.getHideEditorsById(buildCustomResource());
      expect(res).toEqual([]);
    });
    test('getting hideByName value', () => {
      process.env['CHE_HIDE_EDITORS_BY_ID'] =
        'che-incubator/che-idea-server/latest, che-incubator/che-idea-server/next';
      const res = serverConfigService.getHideEditorsById(buildCustomResource());
      expect(res).toEqual([
        'che-incubator/che-idea-server/latest',
        'che-incubator/che-idea-server/next',
      ]);
    });

    describe('Get Current Architecture', () => {
      beforeEach(() => {
        // setting the initial value of cached architecture to undefined
        (ServerConfigApiService as any).currentArchitecture = undefined;
      });
      afterEach(() => {
        // Reset the mock after each test
        mockRun.mockReset();
      });

      test('getting value and check that the architecture was cached', async () => {
        // Mocking the run function to simulate the command execution
        mockRun.mockResolvedValue('ppc64le');

        let res = await serverConfigService.getCurrentArchitecture();
        // Verifying that the run function was called with the correct command and arguments
        expect(mockRun).toHaveBeenCalledWith('uname', ['-m']);
        // Checking the result of the getCurrentArchitecture method
        expect(res).toEqual('ppc64le');
        // Clearing the mock to ensure it doesn't affect subsequent tests
        mockRun.mockClear();

        res = await serverConfigService.getCurrentArchitecture();
        // Verifying that the run function was not called again
        expect(mockRun).not.toHaveBeenCalled();
        // Checking the cached value
        expect(res).toEqual('ppc64le');
      });

      test('getting value and change "amd64" to "x86_64"', async () => {
        // Mocking the run function to simulate the command execution
        mockRun.mockResolvedValue('amd64');

        const res = await serverConfigService.getCurrentArchitecture();
        // Verifying that the run function was called with the correct command and arguments
        expect(mockRun).toHaveBeenCalledWith('uname', ['-m']);
        // Checking the result of the getCurrentArchitecture method
        expect(res).toEqual('x86_64');
      });

      test('error on execution command "uname -m"', async () => {
        // Mocking the run function to simulate the command execution error
        mockRun.mockRejectedValueOnce(new Error('Command failed'));
        try {
          await serverConfigService.getCurrentArchitecture();
          // If the error is not thrown, the test should fail
          fail('should throw an error');
        } catch (e) {
          expect((e as Error).message).toBe(
            'Failed to determine the current architecture using the `uname -m` command.: Command failed',
          );
        }
      });
    });
  });

  describe('getEnvVarValue', () => {
    test('getting default value', () => {
      const res = getEnvVarValue('CHE_SHOW_DEPRECATED_EDITORS', {
        spec: {},
      } as CheClusterCustomResource);
      expect(res).toBeUndefined();
    });

    test('getting value from custom resource', () => {
      const res = getEnvVarValue('CHE_SHOW_DEPRECATED_EDITORS', {
        spec: {
          components: {
            dashboard: {
              deployment: {
                containers: [{ env: [{ name: 'CHE_SHOW_DEPRECATED_EDITORS', value: 'true' }] }],
              },
            },
          },
        },
      } as CheClusterCustomResource);
      expect(res).toEqual('true');
    });

    test('getting value from env variable', () => {
      process.env['CHE_SHOW_DEPRECATED_EDITORS'] = 'true';
      const res = getEnvVarValue('CHE_SHOW_DEPRECATED_EDITORS', buildCustomResource());
      expect(res).toEqual('true');
    });

    test('preferred value from custom resource', () => {
      process.env['CHE_SHOW_DEPRECATED_EDITORS'] = 'true';

      let res = getEnvVarValue('CHE_SHOW_DEPRECATED_EDITORS', {
        spec: {},
      } as CheClusterCustomResource);

      expect(res).toEqual('true');

      res = getEnvVarValue('CHE_SHOW_DEPRECATED_EDITORS', {
        spec: {
          components: {
            dashboard: {
              deployment: {
                containers: [{ env: [{ name: 'CHE_SHOW_DEPRECATED_EDITORS', value: 'false' }] }],
              },
            },
          },
        },
      } as CheClusterCustomResource);

      expect(res).toEqual('false');
    });
  });
});

function buildCustomResourceList(): { body: CustomResourceDefinitionList } {
  return {
    body: {
      apiVersion: 'org.eclipse.che/v2',
      items: [buildCustomResource()],
      kind: 'CheClusterList',
    },
  };
}

function buildCustomResource(options?: { openVSXURL?: string }): CheClusterCustomResource {
  return {
    apiVersion: 'org.eclipse.che/v2',
    kind: 'CheCluster',
    metadata: {
      name: 'eclipse-che',
      namespace: 'eclipse-che',
    },
    spec: {
      components: {
        dashboard: {
          headerMessage: {
            show: true,
            text: 'dashboard banner text',
          },
        },
        devWorkspace: {},
        pluginRegistry: options?.openVSXURL ? { openVSXURL: options.openVSXURL } : {},
        devfileRegistry: {
          externalDevfileRegistries: [
            {
              url: 'https://devfile.registry.test.org/',
            },
          ],
        },
      },
      devEnvironments: {
        disableContainerRunCapabilities: false,
        containerRunConfiguration: {
          openShiftSecurityContextConstraint: 'container-run',
        },
        disableContainerBuildCapabilities: false,
        containerBuildConfiguration: {
          openShiftSecurityContextConstraint: 'container-build',
        },
        defaultComponents: [
          {
            container: {
              image: 'component-image',
            },
            name: 'component-name',
          },
        ],
        defaultNamespace: {
          autoProvision: true,
        },
        defaultEditor: 'eclipse/che-theia/latest',
        secondsOfInactivityBeforeIdling: 1800,
        secondsOfRunBeforeIdling: -1,
        maxNumberOfRunningWorkspacesPerCluster: 100,
        storage: { pvcStrategy: 'per-user' },
        allowedSources: {
          urls: ['https://github.com'],
        },
      },
      networking: {
        auth: {
          advancedAuthorization: {
            allowUsers: ['user1', 'user2'],
          },
        },
      },
    },
    status: {
      pluginRegistryURL: 'http://plugin-registry.eclipse-che.svc/v3',
    },
  } as CheClusterCustomResource;
}
