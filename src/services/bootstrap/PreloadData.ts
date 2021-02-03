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
import { lazyInject } from '../../inversify.config';
import { KeycloakSetupService } from '../keycloak/setup';
import { AppState } from '../../store';
import * as BrandingStore from '../../store/Branding';
import * as DevfileRegistriesStore from '../../store/DevfileRegistries';
import * as EnvironmentStore from '../../store/Environment';
import * as InfrastructureNamespaceStore from '../../store/InfrastructureNamespace';
import * as Plugins from '../../store/Plugins';
import * as UserProfileStore from '../../store/UserProfile';
import * as UserPreferencesStore from '../../store/UserPreferences';
import * as UserStore from '../../store/User';
import * as WorkspacesStore from '../../store/Workspaces';
import { KeycloakAuthService } from '../keycloak/auth';
import { CheWorkspaceClient } from '../cheWorkspaceClient';
import { ResourceFetcherService } from '../resource-fetcher';

/**
 * This class prepares all init data.
 * @author Oleksii Orel
 */
export class PreloadData {

  @lazyInject(KeycloakSetupService)
  private readonly keycloakSetup: KeycloakSetupService;

  @lazyInject(KeycloakAuthService)
  private readonly keycloakAuth: KeycloakAuthService;

  @lazyInject(CheWorkspaceClient)
  private readonly cheWorkspaceClient: CheWorkspaceClient;

  private store: Store<AppState>;

  constructor(store: Store<AppState>) {
    this.store = store;
  }

  async init(): Promise<void> {
    this.defineEnvironment();

    await this.updateUser();
    await this.updateUserProfile();
    await this.updateBranding();
    new ResourceFetcherService().prefetchResources(this.store.getState());

    this.updateRestApiClient();
    this.updateJsonRpcMasterApi();

    this.updateWorkspaces();
    this.updateInfrastructureNamespaces();

    const settings = await this.updateWorkspaceSettings();
    await this.updatePlugins(settings);
    await this.updateRegistriesMetadata(settings);
    await this.updateDevfileSchema();
    await this.updateUserPreferences();
  }

  private defineEnvironment(): void {
    const { defineEnvironmentMode } = EnvironmentStore.actionCreators;
    defineEnvironmentMode()(this.store.dispatch, this.store.getState, undefined);
  }

  private async updateBranding(): Promise<void> {
    const { requestBranding } = BrandingStore.actionCreators;
    await requestBranding()(this.store.dispatch, this.store.getState);
  }

  private updateRestApiClient(): void {
    return this.cheWorkspaceClient.updateRestApiClient();
  }

  private async updateJsonRpcMasterApi(): Promise<void> {
    return this.cheWorkspaceClient.updateJsonRpcMasterApi();
  }

  private async updateUser(): Promise<void> {
    await this.keycloakSetup.start();
    const { requestUser, setUser } = UserStore.actionCreators;
    const user = this.keycloakSetup.getUser();
    if (user) {
      setUser(user)(this.store.dispatch, this.store.getState, undefined);
      return;
    }
    await requestUser()(this.store.dispatch, this.store.getState, undefined);
  }

  private async updateWorkspaces(): Promise<void> {
    const { requestWorkspaces } = WorkspacesStore.actionCreators;
    await requestWorkspaces()(this.store.dispatch, this.store.getState, undefined);
  }

  private async updatePlugins(settings: che.WorkspaceSettings): Promise<void> {
    const { requestPlugins } = Plugins.actionCreators;
    await requestPlugins(settings.cheWorkspacePluginRegistryUrl || '')(this.store.dispatch, this.store.getState);
  }

  private async updateInfrastructureNamespaces(): Promise<void> {
    const { requestNamespaces } = InfrastructureNamespaceStore.actionCreators;
    await requestNamespaces()(this.store.dispatch, this.store.getState, undefined);
  }

  private async updateWorkspaceSettings(): Promise<che.WorkspaceSettings> {
    const { requestSettings } = WorkspacesStore.actionCreators;
    await requestSettings()(this.store.dispatch, this.store.getState, undefined);

    return this.store.getState().workspaces.settings;
  }

  private async updateRegistriesMetadata(settings: che.WorkspaceSettings): Promise<void> {
    const { requestRegistriesMetadata } = DevfileRegistriesStore.actionCreators;
    await requestRegistriesMetadata(settings.cheWorkspaceDevfileRegistryUrl || '')(this.store.dispatch, this.store.getState, undefined);
  }

  private async updateDevfileSchema(): Promise<void> {
    const { requestJsonSchema } = DevfileRegistriesStore.actionCreators;
    return requestJsonSchema()(this.store.dispatch, this.store.getState, undefined);
  }

  private async updateUserPreferences(): Promise<void> {
    const { requestUserPreferences } = UserPreferencesStore.actionCreators;
    return requestUserPreferences(undefined)(this.store.dispatch, this.store.getState, undefined);
  }

  private async updateUserProfile(): Promise<void> {
    const { requestUserProfile } = UserProfileStore.actionCreators;
    return requestUserProfile()(this.store.dispatch, this.store.getState, undefined);
  }
}
