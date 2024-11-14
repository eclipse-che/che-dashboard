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

import { api, ClusterConfig, ClusterInfo } from '@eclipse-che/common';
import { CoreV1Event, V1Pod } from '@kubernetes/client-node';
import { configureStore } from '@reduxjs/toolkit';

import { BrandingData } from '@/services/bootstrap/branding.constant';
import devfileApi from '@/services/devfileApi';
import { che } from '@/services/models';
import { RootState } from '@/store';
import { DevWorkspaceResources } from '@/store/DevfileRegistries';
import { RegistryEntry } from '@/store/DockerConfig';
import { FactoryResolverStateResolver } from '@/store/FactoryResolver';
import { IGitOauth } from '@/store/GitOauthConfig';
import { PluginDefinition } from '@/store/Plugins/devWorkspacePlugins';
import { PodLogsState } from '@/store/Pods/Logs';
import { rootReducer } from '@/store/rootReducer';

export class MockStoreBuilder {
  private state: Partial<RootState>;

  constructor(state: Partial<RootState> = {}) {
    this.state = { ...state };
  }

  public withDwServerConfig(config: Partial<api.IServerConfig>): MockStoreBuilder {
    this.state = {
      ...this.state,
      dwServerConfig: {
        isLoading: false,
        config,
      },
    } as RootState;
    return this;
  }

  public withBannerAlert(messages: string[]): MockStoreBuilder {
    this.state = {
      ...this.state,
      bannerAlert: {
        messages: [...messages],
      },
    } as RootState;
    return this;
  }

  public withGitOauthConfig(
    gitOauth: IGitOauth[],
    providersWithToken: api.GitOauthProvider[],
    skipOauthProviders: api.GitOauthProvider[],
    isLoading = false,
    error?: string,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      gitOauthConfig: {
        gitOauth,
        providersWithToken,
        skipOauthProviders,
        isLoading,
        error,
      },
    } as RootState;
    return this;
  }

  public withDockerConfig(
    registries: RegistryEntry[],
    isLoading = false,
    error?: string,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      dockerConfig: {
        registries,
        isLoading,
        error,
      },
    } as RootState;
    return this;
  }

  public withClusterConfig(
    clusterConfig: Partial<ClusterConfig> = {},
    isLoading = false,
    error?: string,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      clusterConfig: {
        clusterConfig: {
          allWorkspacesLimit:
            clusterConfig.allWorkspacesLimit ??
            this.state.clusterConfig?.clusterConfig.allWorkspacesLimit,
          runningWorkspacesLimit:
            clusterConfig.runningWorkspacesLimit ??
            this.state.clusterConfig?.clusterConfig.runningWorkspacesLimit,
          dashboardFavicon:
            clusterConfig.dashboardFavicon ??
            this.state.clusterConfig?.clusterConfig.dashboardFavicon,
          dashboardWarning:
            clusterConfig.dashboardWarning ??
            this.state.clusterConfig?.clusterConfig.dashboardWarning,
        },
        isLoading,
        error,
      },
    } as RootState;

    return this;
  }

  public withClusterInfo(
    clusterInfo: Partial<ClusterInfo>,
    isLoading = false,
    error?: string,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      clusterInfo: {
        clusterInfo: {
          applications:
            clusterInfo.applications ?? this.state.clusterInfo?.clusterInfo.applications,
        },
        isLoading,
        error,
      },
    } as RootState;
    return this;
  }

  public withBranding(branding: BrandingData, isLoading = false, error?: string): MockStoreBuilder {
    this.state = {
      ...this.state,
      branding: {
        data: branding,
        isLoading,
        error,
      },
    };
    return this;
  }

  public withFactoryResolver(
    options: {
      resolver?: Partial<FactoryResolverStateResolver>;
    },
    isLoading = false,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      factoryResolver: {
        resolver: options.resolver,
        isLoading,
      },
    } as RootState;
    return this;
  }

  public withInfrastructureNamespace(
    namespaces: che.KubernetesNamespace[],
    isLoading = false,
    error?: string,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      infrastructureNamespaces: {
        namespaces,
        isLoading,
        error,
      },
    } as RootState;
    return this;
  }

  public withPlugins(plugins: che.Plugin[], isLoading = false, error?: string): MockStoreBuilder {
    this.state = {
      ...this.state,
      plugins: {
        plugins,
        isLoading,
        error,
      },
    } as RootState;
    return this;
  }

  public withUserProfile(profile: api.IUserProfile, error?: string): MockStoreBuilder {
    this.state = {
      ...this.state,
      userProfile: {
        userProfile: profile,
        isLoading: false,
        error,
      },
    } as RootState;
    return this;
  }

  public withDevfileRegistries(
    options: {
      devfiles?: { [location: string]: { content?: string; error?: string } };
      registries?: { [location: string]: { metadata?: che.DevfileMetaData[]; error?: string } };
      devWorkspaceResources?: {
        [location: string]: { resources?: DevWorkspaceResources; error?: string };
      };
      filter?: string;
    },
    isLoading = false,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      devfileRegistries: {
        isLoading,
        devfiles: options.devfiles ?? this.state.devfileRegistries?.devfiles ?? {},
        registries: options.registries ?? this.state.devfileRegistries?.registries ?? {},
        devWorkspaceResources:
          options.devWorkspaceResources ??
          this.state.devfileRegistries?.devWorkspaceResources ??
          {},
        filter: options.filter || '',
      },
    } as RootState;
    return this;
  }

  public withDevWorkspacesCluster(
    options: { isRunningDevWorkspacesClusterLimitExceeded: boolean },
    isLoading = false,
    error?: string,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      devWorkspacesCluster: {
        isRunningDevWorkspacesClusterLimitExceeded:
          options.isRunningDevWorkspacesClusterLimitExceeded,
        isLoading,
        error,
      },
    } as RootState;
    return this;
  }

  public withDevWorkspaces(
    options: {
      workspaces?: devfileApi.DevWorkspace[];
      startedWorkspaces?: { [uid: string]: string };
      warnings?: { [uid: string]: string };
    },
    isLoading = false,
    error?: string,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      devWorkspaces: {
        workspaces: options.workspaces ?? this.state.devWorkspaces?.workspaces ?? [],
        startedWorkspaces:
          options.startedWorkspaces ?? this.state.devWorkspaces?.startedWorkspaces ?? {},
        warnings: options.warnings ?? this.state.devWorkspaces?.warnings ?? {},
        isLoading,
        error,
      },
    } as RootState;
    return this;
  }

  public withWorkspaces(
    options: {
      namespace?: string;
      workspaceName?: string;
      workspaceUID?: string;
      recentNumber?: number;
    },
    isLoading = false,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      workspaces: {
        namespace: options.namespace ?? '',
        workspaceName: options.workspaceName ?? '',
        workspaceUID: options.workspaceUID ?? '',
        recentNumber: options.recentNumber ?? 0,
        isLoading,
      },
    };
    return this;
  }

  public withDwPlugins(
    plugins: { [url: string]: PluginDefinition },
    editors: { [url: string]: PluginDefinition },
    isLoading = false,
    cmEditors?: devfileApi.Devfile[],
    defaultEditorError?: string,
    defaultEditorName?: string,
  ) {
    this.state = {
      ...this.state,
      dwPlugins: {
        defaultEditorError,
        plugins,
        editors,
        isLoading,
        defaultEditorName,
        cmEditors,
      },
    } as RootState;
    return this;
  }

  public withEvents(
    options: { events: CoreV1Event[]; error?: string; resourceVersion?: string },
    isLoading = false,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      events: {
        events: options.events,
        error: options.error,
        resourceVersion: options.resourceVersion,
        isLoading,
      },
    } as RootState;
    return this;
  }

  public withPods(
    options: { pods: V1Pod[]; error?: string; resourceVersion?: string },
    isLoading = false,
  ): MockStoreBuilder {
    this.state = {
      ...this.state,
      pods: {
        pods: options.pods,
        error: options.error,
        resourceVersion: options.resourceVersion,
        isLoading,
      },
    } as RootState;
    return this;
  }

  public withSanityCheck(options: { authorized?: boolean; error?: string; lastFetched?: number }) {
    this.state = {
      ...this.state,
      sanityCheck: {
        authorized: options.authorized,
        error: options.error,
        lastFetched: options.lastFetched || Date.now(),
      },
    } as RootState;
    return this;
  }

  public withLogs(logs: PodLogsState['logs']) {
    this.state = {
      ...this.state,
      logs: {
        logs,
      },
    };
    return this;
  }

  public withPersonalAccessTokens(
    options: { tokens: api.PersonalAccessToken[]; error?: string },
    isLoading = false,
  ) {
    this.state = {
      ...this.state,
      personalAccessToken: {
        tokens: options.tokens,
        error: options.error,
        isLoading,
      },
    };
    return this;
  }

  public withCheUserId(options: { cheUserId: string; error?: string }, isLoading = false) {
    this.state = {
      ...this.state,
      userId: {
        cheUserId: options.cheUserId,
        error: options.error,
        isLoading,
      },
    };
    return this;
  }

  public withGitConfig(
    options: {
      config?: api.IGitConfig;
      error?: string;
    },
    isLoading = false,
  ) {
    this.state = {
      ...this.state,
      gitConfig: {
        ...this.state.gitConfig,
        config: options.config,
        error: options.error,
        isLoading,
      },
    };
    return this;
  }

  public withSshKeys(
    options: {
      keys?: api.SshKey[];
      error?: string;
    },
    isLoading = false,
  ) {
    this.state = {
      ...this.state,
      sshKeys: {
        keys: options.keys || [],
        error: options.error,
        isLoading,
      },
    };
    return this;
  }

  public withWorkspacePreferences(
    options: {
      'skip-authorisation'?: api.GitProvider[];
      'trusted-sources'?: api.TrustedSources;
      error?: string;
    },
    isLoading = false,
  ) {
    this.state = {
      ...this.state,
      workspacePreferences: {
        preferences: options,
        error: options.error,
        isLoading,
      },
    } as RootState;
    return this;
  }

  public build() {
    return configureStore({
      middleware: getDefaultMiddleware => {
        const middleware = getDefaultMiddleware({
          serializableCheck: true,
          immutableCheck: true,
        });
        return middleware;
      },
      reducer: rootReducer,
      preloadedState: this.state,
    });
  }
}
