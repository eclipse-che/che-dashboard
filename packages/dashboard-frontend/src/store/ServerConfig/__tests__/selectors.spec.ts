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

import { V230DevfileComponents } from '@devfile/api';
import { api } from '@eclipse-che/common';

import { RootState } from '@/store';
import {
  selectAdvancedAuthorization,
  selectAllowedSources,
  selectAutoProvision,
  selectDashboardLogo,
  selectDefaultComponents,
  selectDefaultEditor,
  selectDefaultPlugins,
  selectEditorsVisibility,
  selectIsAllowedSourcesConfigured,
  selectOpenVSXUrl,
  selectPluginRegistryInternalUrl,
  selectPluginRegistryUrl,
  selectPvcStrategy,
  selectServerConfigError,
  selectServerConfigState,
  selectStartTimeout,
} from '@/store/ServerConfig/selectors';

describe('ServerConfig Selectors', () => {
  const mockState = {
    dwServerConfig: {
      config: {
        defaults: {
          components: [
            {
              name: 'component1',
            },
            {
              name: 'component2',
            },
          ] as V230DevfileComponents[],
          editor: 'che-incubator/che-code/latest',
          plugins: [
            {
              plugins: ['plugin1'],
            },
            {
              plugins: ['plugin2'],
            },
          ] as api.IWorkspacesDefaultPlugins[],
          pvcStrategy: 'per-user',
        },
        pluginRegistry: {
          disableInternalRegistry: false,
          openVSXURL: 'https://openvsx.org',
        },
        pluginRegistryURL: 'https://plugin.registry',
        pluginRegistryInternalURL: 'https://internal.plugin.registry',
        timeouts: {
          startTimeout: 300,
          axiosRequestTimeout: 30000,
        },
        dashboardLogo: {
          base64data: 'base64data',
          mediatype: 'image/png',
        },
        networking: {
          auth: {
            advancedAuthorization: {
              allowUsers: ['user1'],
            },
          },
        },
        defaultNamespace: {
          autoProvision: true,
        },
        allowedSourceUrls: ['https://allowed.source'],
        editorsVisibility: {
          showDeprecated: true,
          hideById: ['che-incubator/che-clion-server/latest, che-incubator/che-clion-server/next'],
        },
      },
      isLoading: false,
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select the server config state', () => {
    const result = selectServerConfigState(mockState);
    expect(result).toEqual(mockState.dwServerConfig);
  });

  it('should select default components', () => {
    const result = selectDefaultComponents(mockState);
    expect(result).toEqual([{ name: 'component1' }, { name: 'component2' }]);
  });

  it('should select default editor', () => {
    const result = selectDefaultEditor(mockState);
    expect(result).toEqual('che-incubator/che-code/latest');
  });

  it('should select default plugins', () => {
    const result = selectDefaultPlugins(mockState);
    expect(result).toEqual([{ plugins: ['plugin1'] }, { plugins: ['plugin2'] }]);
  });

  it('should select plugin registry URL', () => {
    const result = selectPluginRegistryUrl(mockState);
    expect(result).toEqual('https://plugin.registry');
  });

  it('should select plugin registry internal URL', () => {
    const result = selectPluginRegistryInternalUrl(mockState);
    expect(result).toEqual('https://internal.plugin.registry');
  });

  it('should select OpenVSX URL', () => {
    const result = selectOpenVSXUrl(mockState);
    expect(result).toEqual('https://openvsx.org');
  });

  it('should select PVC strategy', () => {
    const result = selectPvcStrategy(mockState);
    expect(result).toEqual('per-user');
  });

  it('should select start timeout', () => {
    const result = selectStartTimeout(mockState);
    expect(result).toEqual(300);
  });

  it('should select dashboard logo', () => {
    const result = selectDashboardLogo(mockState);
    expect(result).toEqual({ base64data: 'base64data', mediatype: 'image/png' });
  });

  it('should select advanced authorization', () => {
    const result = selectAdvancedAuthorization(mockState);
    expect(result).toEqual({ allowUsers: ['user1'] });
  });

  it('should select auto provision', () => {
    const result = selectAutoProvision(mockState);
    expect(result).toEqual(true);
  });

  it('should select allowed sources', () => {
    const result = selectAllowedSources(mockState);
    expect(result).toEqual(['https://allowed.source']);
  });

  it('should select if allowed sources are configured', () => {
    const result = selectIsAllowedSourcesConfigured(mockState);
    expect(result).toEqual(true);
  });

  it('should select server config error', () => {
    const result = selectServerConfigError(mockState);
    expect(result).toEqual('Something went wrong');
  });

  it('should return an empty array if default components are not set', () => {
    const stateWithoutComponents = {
      ...mockState,
      dwServerConfig: {
        ...mockState.dwServerConfig,
        config: {
          ...mockState.dwServerConfig.config,
          defaults: {
            ...mockState.dwServerConfig.config.defaults,
            components: undefined as unknown,
          },
        },
      },
    } as Partial<RootState> as RootState;
    const result = selectDefaultComponents(stateWithoutComponents);
    expect(result).toEqual([]);
  });

  it('should return default editor if not set', () => {
    const stateWithoutEditor = {
      ...mockState,
      dwServerConfig: {
        ...mockState.dwServerConfig,
        config: {
          ...mockState.dwServerConfig.config,
          defaults: {
            ...mockState.dwServerConfig.config.defaults,
            editor: undefined,
          },
        },
      },
    } as RootState;
    const result = selectDefaultEditor(stateWithoutEditor);
    expect(result).toEqual('che-incubator/che-code/latest');
  });

  it('should return an empty array if default plugins are not set', () => {
    const stateWithoutPlugins = {
      ...mockState,
      dwServerConfig: {
        ...mockState.dwServerConfig,
        config: {
          ...mockState.dwServerConfig.config,
          defaults: {
            ...mockState.dwServerConfig.config.defaults,
            plugins: undefined as unknown,
          },
        },
      },
    } as RootState;
    const result = selectDefaultPlugins(stateWithoutPlugins);
    expect(result).toEqual([]);
  });

  it('should return an empty string if plugin registry URL is not set', () => {
    const stateWithoutPluginRegistryUrl = {
      ...mockState,
      dwServerConfig: {
        ...mockState.dwServerConfig,
        config: {
          ...mockState.dwServerConfig.config,
          pluginRegistryURL: undefined as unknown,
        },
      },
    } as RootState;
    const result = selectPluginRegistryUrl(stateWithoutPluginRegistryUrl);
    expect(result).toEqual('');
  });

  it('should return an empty string if PVC strategy is not set', () => {
    const stateWithoutPvcStrategy = {
      ...mockState,
      dwServerConfig: {
        ...mockState.dwServerConfig,
        config: {
          ...mockState.dwServerConfig.config,
          defaults: {
            ...mockState.dwServerConfig.config.defaults,
            pvcStrategy: undefined,
          },
        },
      },
    } as RootState;
    const result = selectPvcStrategy(stateWithoutPvcStrategy);
    expect(result).toEqual('');
  });

  it('should return an empty array if allowed sources are not set', () => {
    const stateWithoutAllowedSources = {
      ...mockState,
      dwServerConfig: {
        ...mockState.dwServerConfig,
        config: {
          ...mockState.dwServerConfig.config,
          allowedSourceUrls: undefined as unknown,
        },
      },
    } as RootState;
    const result = selectAllowedSources(stateWithoutAllowedSources);
    expect(result).toEqual([]);
  });

  it('should return false if allowed sources are not configured', () => {
    const stateWithoutAllowedSources = {
      ...mockState,
      dwServerConfig: {
        ...mockState.dwServerConfig,
        config: {
          ...mockState.dwServerConfig.config,
          allowedSourceUrls: [],
        },
      },
    } as RootState;
    const result = selectIsAllowedSourcesConfigured(stateWithoutAllowedSources);
    expect(result).toEqual(false);
  });

  it('should select editors visibility', () => {
    const result = selectEditorsVisibility(mockState);
    expect(result).toEqual({
      hideById: ['che-incubator/che-clion-server/latest, che-incubator/che-clion-server/next'],
      showDeprecated: true,
    });
  });
});
