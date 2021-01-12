/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { Store } from 'redux';
import createMockStore from 'redux-mock-store';
import { BrandingData } from '../../services/bootstrap/branding.constant';
import { FactoryResolver } from '../../services/helpers/types';
import { AppState } from '..';
import { State as DevfileRegistriesState } from '../DevfileRegistries/index';
import { State as WorkspacesState } from '../Workspaces/index';
import { State as BrandingState } from '../Branding';
import { State as FactoryResolverState } from '../FactoryResolver';
import { State as InfrastructureNamespaceState } from '../InfrastructureNamespace';
import { State as PluginsState } from '../Plugins';
import { UserState as UserState } from '../User';
import mockThunk from './thunk';

export class FakeStoreBuilder {

  private state: AppState = {
    factoryResolver: {
      isLoading: false,
      resolver: {},
    } as FactoryResolverState,
    plugins: {
      isLoading: false,
      plugins: [],
    } as PluginsState,
    workspaces: {
      isLoading: false,
      settings: {} as any,
      workspaces: [],
      workspacesLogs: {} as Map<string, string[]>,
      namespace: '',
      workspaceName: '',
      workspaceId: '',
      recentNumber: 5,
    } as WorkspacesState,
    branding: {
      isLoading: false,
      data: {},
    } as BrandingState,
    devfileRegistries: {
      isLoading: false,
      devfiles: {},
      filter: '',
      metadata: [],
      schema: {},
    } as DevfileRegistriesState,
    user: {
      isLogged: true,
      user: {},
    } as UserState,
    infrastructureNamespace: {
      isLoading: false,
      namespaces: [],
    } as InfrastructureNamespaceState,
  };

  public withBranding(branding: BrandingData, isLoading = false): FakeStoreBuilder {
    this.state.branding.data = Object.assign({}, branding);
    this.state.branding.isLoading = isLoading;
    return this;
  }

  public withFactoryResolver(resolver: FactoryResolver, isLoading = false): FakeStoreBuilder {
    this.state.factoryResolver.resolver = Object.assign({}, resolver);
    this.state.factoryResolver.isLoading = isLoading;
    return this;
  }

  public withInfrastructureNamespace(namespaces: che.KubernetesNamespace[], isLoading = false): FakeStoreBuilder {
    this.state.infrastructureNamespace.namespaces = Object.assign([], namespaces);
    this.state.infrastructureNamespace.isLoading = isLoading;
    return this;
  }

  public withPlugins(plugins: che.Plugin[], isLoading = false): FakeStoreBuilder {
    this.state.plugins.plugins = Object.assign([], plugins);
    this.state.plugins.isLoading = isLoading;
    return this;
  }

  public withUser(user: che.User, isLogged = true): FakeStoreBuilder {
    this.state.user.user = Object.assign({}, user);
    this.state.user.isLogged = isLogged;
    return this;
  }

  public withDevfileRegistries(
    options: {
      devfiles?: { [location: string]: { content: string, error: string } },
      metadata?: che.DevfileMetaData[],
      schema?: any,
    }, isLoading = false
  ): FakeStoreBuilder {
    if (options.devfiles) {
      this.state.devfileRegistries.devfiles = Object.assign({}, options.devfiles);
    }
    if (options.metadata) {
      this.state.devfileRegistries.metadata = Object.assign([], options.metadata);
    }
    if (options.schema) {
      this.state.devfileRegistries.schema = Object.assign({}, options.schema);
    }
    this.state.devfileRegistries.isLoading = isLoading;
    return this;
  }

  public withWorkspaces(
    options: {
      settings?: che.WorkspaceSettings,
      workspaces?: che.Workspace[],
      workspacesLogs?: Map<string, string[]>,
      namespace?: string,
      workspaceName?: string,
      workspaceId?: string,
      recentNumber?: number
    },
    isLoading = false
  ): FakeStoreBuilder {
    if (options.settings) {
      this.state.workspaces.settings = Object.assign({}, options.settings);
    }
    if (options.workspaces) {
      this.state.workspaces.workspaces = Object.assign([], options.workspaces);
    }
    if (options.workspacesLogs) {
      this.state.workspaces.workspacesLogs = Object.assign({}, options.workspacesLogs);
    }
    if (options.namespace) {
      this.state.workspaces.namespace = options.namespace;
    }
    if (options.workspaceName) {
      this.state.workspaces.workspaceName = options.workspaceName;
    }
    if (options.workspaceId) {
      this.state.workspaces.workspaceId = options.workspaceId;
    }
    if (options.recentNumber) {
      this.state.workspaces.recentNumber = options.recentNumber;
    }
    this.state.workspaces.isLoading = isLoading;
    return this;
  }

  public build(): Store {
    const middlewares = [mockThunk];
    const mockStore = createMockStore(middlewares);
    return mockStore(this.state);
  }

}
