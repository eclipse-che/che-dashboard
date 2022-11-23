/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
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
import common from '@eclipse-che/common';
import { lazyInject } from '../../inversify.config';
import { AppState } from '../../store';
import * as BannerAlertStore from '../../store/BannerAlert';
import * as BrandingStore from '../../store/Branding';
import * as ClusterConfigStore from '../../store/ClusterConfig';
import * as ClusterInfoStore from '../../store/ClusterInfo';
import * as ServerConfigStore from '../../store/ServerConfig';
import * as DevfileRegistriesStore from '../../store/DevfileRegistries';
import * as InfrastructureNamespacesStore from '../../store/InfrastructureNamespaces';
import * as PluginsStore from '../../store/Plugins/chePlugins';
import * as DwPluginsStore from '../../store/Plugins/devWorkspacePlugins';
import * as UserProfileStore from '../../store/UserProfile';
import * as WorkspacesStore from '../../store/Workspaces';
import * as DevWorkspacesStore from '../../store/Workspaces/devWorkspaces';
import * as WorkspacesSettingsStore from '../../store/Workspaces/Settings';
import { ResourceFetcherService } from '../resource-fetcher';
import { IssuesReporterService, IssueType, WorkspaceData } from './issuesReporter';
import { CheWorkspaceClient } from '../workspace-client/cheworkspace/cheWorkspaceClient';
import { DevWorkspaceClient } from '../workspace-client/devworkspace/devWorkspaceClient';
import { selectDwEditorsPluginsList } from '../../store/Plugins/devWorkspacePlugins/selectors';
import devfileApi from '../devfileApi';
import { selectDefaultNamespace } from '../../store/InfrastructureNamespaces/selectors';
import { selectDevWorkspacesResourceVersion } from '../../store/Workspaces/devWorkspaces/selectors';
import { AppAlerts } from '../alerts/appAlerts';
import { AlertVariant } from '@patternfly/react-core';
import { buildDetailsLocation, buildIdeLoaderLocation } from '../helpers/location';
import { Workspace } from '../workspace-adapter';
import { WorkspaceRunningError, WorkspaceStoppedDetector } from './workspaceStoppedDetector';
import { selectOpenVSXUrl } from '../../store/ServerConfig/selectors';
import { selectEmptyWorkspaceUrl } from '../../store/DevfileRegistries/selectors';

/**
 * This class executes a few initial instructions
 * @author Oleksii Orel
 */
export default class Bootstrap {
  @lazyInject(IssuesReporterService)
  private readonly issuesReporterService: IssuesReporterService;

  @lazyInject(CheWorkspaceClient)
  private readonly cheWorkspaceClient: CheWorkspaceClient;

  @lazyInject(DevWorkspaceClient)
  private readonly devWorkspaceClient: DevWorkspaceClient;

  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  @lazyInject(WorkspaceStoppedDetector)
  private readonly workspaceStoppedDetector: WorkspaceStoppedDetector;

  private store: Store<AppState>;

  private resourceFetcher: ResourceFetcherService;

  constructor(store: Store<AppState>) {
    this.store = store;
    this.resourceFetcher = new ResourceFetcherService();
  }

  async init(): Promise<void> {
    this.prefetchResources();

    await Promise.all([
      this.fetchBranding(),
      this.fetchInfrastructureNamespaces(),
      this.fetchWorkspaceSettings(),
      this.fetchServerConfig(),
    ]);

    const results = await Promise.allSettled([
      this.fetchUserProfile(),
      this.fetchPlugins().then(() => this.fetchDevfileSchema()),
      this.fetchDwPlugins(),
      this.fetchDefaultDwPlugins(),
      this.fetchRegistriesMetadata().then(() => this.fetchEmptyWorkspace()),
      this.updateDevWorkspaceTemplates(),
      this.fetchWorkspaces().then(() => {
        this.checkWorkspaceStopped();
        return this.watchNamespaces();
      }),
      this.fetchClusterInfo(),
      this.fetchClusterConfig(),
    ]);

    const errors = results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason.toString());
    if (errors.length > 0) {
      throw errors;
    }
  }

  private prefetchResources(): void {
    const state = this.store.getState();
    this.resourceFetcher.prefetchResources(state).catch(e => {
      console.warn('Unable to fetch prefetch resources.', e);
    });
  }

  private async fetchClusterConfig(): Promise<void> {
    const { requestClusterConfig } = ClusterConfigStore.actionCreators;
    try {
      await requestClusterConfig()(this.store.dispatch, this.store.getState, undefined);
    } catch (e) {
      console.warn(
        'Unable to fetch cluster configuration. This is expected behavior unless backend is configured to provide this information.',
      );
    }
  }

  private async fetchClusterInfo(): Promise<void> {
    const { requestClusterInfo } = ClusterInfoStore.actionCreators;
    try {
      await requestClusterInfo()(this.store.dispatch, this.store.getState, undefined);
    } catch (e) {
      console.warn(
        'Unable to fetch cluster info. This is expected behavior unless backend is configured to provide this information.',
      );
    }
  }

  private async fetchBranding(): Promise<void> {
    const { requestBranding } = BrandingStore.actionCreators;
    try {
      await requestBranding()(this.store.dispatch, this.store.getState, undefined);
    } catch (e) {
      const errorMessage = common.helpers.errors.getMessage(e);
      this.issuesReporterService.registerIssue('unknown', new Error(errorMessage));
    }
  }

  private async watchNamespaces(): Promise<void> {
    const defaultKubernetesNamespace = selectDefaultNamespace(this.store.getState());
    const namespace = defaultKubernetesNamespace.name;
    const { updateDevWorkspaceStatus, updateDeletedDevWorkspaces, updateAddedDevWorkspaces } =
      DevWorkspacesStore.actionCreators;
    const getResourceVersion = async () =>
      selectDevWorkspacesResourceVersion(this.store.getState());
    const dispatch = this.store.dispatch;
    const getState = this.store.getState;
    const callbacks = {
      getResourceVersion,
      updateDevWorkspaceStatus: statusUpdate =>
        updateDevWorkspaceStatus(statusUpdate)(dispatch, getState, undefined),
      updateDeletedDevWorkspaces: workspaceIds =>
        updateDeletedDevWorkspaces(workspaceIds)(dispatch, getState, undefined),
      updateAddedDevWorkspaces: workspaces =>
        updateAddedDevWorkspaces(workspaces)(dispatch, getState, undefined),
    };

    return await this.devWorkspaceClient.subscribeToNamespace({ namespace, callbacks });
  }

  private async fetchWorkspaces(): Promise<void> {
    const { requestWorkspaces } = WorkspacesStore.actionCreators;
    await requestWorkspaces()(this.store.dispatch, this.store.getState, undefined);
  }

  private async fetchPlugins(): Promise<void> {
    const { requestPlugins } = PluginsStore.actionCreators;
    const settings = this.store.getState().workspacesSettings.settings;
    await requestPlugins(settings.cheWorkspacePluginRegistryUrl || '')(
      this.store.dispatch,
      this.store.getState,
      undefined,
    );
  }

  private async fetchDwPlugins(): Promise<void> {
    const { requestDwDefaultEditor } = DwPluginsStore.actionCreators;
    const settings = this.store.getState().workspacesSettings.settings;
    try {
      await requestDwDefaultEditor(settings)(this.store.dispatch, this.store.getState, undefined);
    } catch (e) {
      const message = `Required sources failed when trying to create the workspace: ${e}`;
      const { addBanner } = BannerAlertStore.actionCreators;
      addBanner(message)(this.store.dispatch, this.store.getState, undefined);

      throw e;
    }
  }

  private async fetchDefaultDwPlugins(): Promise<void> {
    const { requestDwDefaultPlugins } = DwPluginsStore.actionCreators;
    try {
      await requestDwDefaultPlugins()(this.store.dispatch, this.store.getState, undefined);
    } catch (e) {
      console.error('Failed to retrieve default plug-ins.', e);
    }
  }

  private async updateDevWorkspaceTemplates(): Promise<void> {
    const defaultKubernetesNamespace = selectDefaultNamespace(this.store.getState());
    const defaultNamespace = defaultKubernetesNamespace.name;
    try {
      const pluginsByUrl: { [url: string]: devfileApi.Devfile } = {};
      const state = this.store.getState();
      selectDwEditorsPluginsList(state.dwPlugins.defaultEditorName)(state).forEach(dwEditor => {
        pluginsByUrl[dwEditor.url] = dwEditor.devfile;
      });
      const openVSXUrl = selectOpenVSXUrl(state);
      const settings = this.store.getState().workspacesSettings.settings;
      const pluginRegistryUrl = settings['cheWorkspacePluginRegistryUrl'];
      const pluginRegistryInternalUrl = settings['cheWorkspacePluginRegistryInternalUrl'];
      const updates = await this.devWorkspaceClient.checkForTemplatesUpdate(
        defaultNamespace,
        pluginsByUrl,
        pluginRegistryUrl,
        pluginRegistryInternalUrl,
        openVSXUrl,
      );
      if (Object.keys(updates).length > 0) {
        await this.devWorkspaceClient.updateTemplates(defaultNamespace, updates);
      }
    } catch (e) {
      console.error('Failed to update templates.', e);
    }
  }

  private async fetchInfrastructureNamespaces(): Promise<void> {
    const { requestNamespaces } = InfrastructureNamespacesStore.actionCreators;
    try {
      await requestNamespaces()(this.store.dispatch, this.store.getState, undefined);
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'bootstrap-request-namespaces',
        title: common.helpers.errors.getMessage(e),
        variant: AlertVariant.danger,
      });
    }
  }

  private async fetchWorkspaceSettings(): Promise<che.WorkspaceSettings> {
    const { requestSettings } = WorkspacesSettingsStore.actionCreators;
    try {
      await requestSettings()(this.store.dispatch, this.store.getState, undefined);
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'bootstrap-request-workspace-settings',
        title: common.helpers.errors.getMessage(e),
        variant: AlertVariant.danger,
      });
    }

    return this.store.getState().workspacesSettings.settings;
  }

  private async fetchServerConfig(): Promise<void> {
    const { requestServerConfig } = ServerConfigStore.actionCreators;
    try {
      await requestServerConfig()(this.store.dispatch, this.store.getState, undefined);
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'bootstrap-request-server-config',
        title: common.helpers.errors.getMessage(e),
        variant: AlertVariant.danger,
      });
    }
  }

  private async fetchRegistriesMetadata(): Promise<void> {
    const { requestRegistriesMetadata } = DevfileRegistriesStore.actionCreators;
    const settings = this.store.getState().workspacesSettings.settings;
    await requestRegistriesMetadata(settings.cheWorkspaceDevfileRegistryUrl || '')(
      this.store.dispatch,
      this.store.getState,
      undefined,
    );
  }

  private async fetchEmptyWorkspace(): Promise<void> {
    const { requestDevfile } = DevfileRegistriesStore.actionCreators;
    const state = this.store.getState();
    const emptyWorkspaceUrl = selectEmptyWorkspaceUrl(state);
    if (emptyWorkspaceUrl) {
      await requestDevfile(emptyWorkspaceUrl)(this.store.dispatch, this.store.getState, undefined);
    }
  }

  private async fetchDevfileSchema(): Promise<void> {
    const { requestJsonSchema } = DevfileRegistriesStore.actionCreators;
    return requestJsonSchema()(this.store.dispatch, this.store.getState, undefined);
  }

  private async fetchUserProfile(): Promise<void> {
    const defaultKubernetesNamespace = selectDefaultNamespace(this.store.getState());
    const defaultNamespace = defaultKubernetesNamespace.name;

    const { requestUserProfile } = UserProfileStore.actionCreators;
    return requestUserProfile(defaultNamespace)(
      this.store.dispatch,
      this.store.getState,
      undefined,
    );
  }

  private checkWorkspaceStopped(): void {
    let stoppedWorkspace: Workspace | undefined = undefined;

    try {
      stoppedWorkspace = this.workspaceStoppedDetector.checkWorkspaceStopped(this.store.getState());
      if (!stoppedWorkspace) {
        return;
      }

      const type: IssueType =
        this.workspaceStoppedDetector.getWorkspaceStoppedIssueType(stoppedWorkspace);
      const workspaceData: WorkspaceData = {
        ideLoaderPath: buildIdeLoaderLocation(stoppedWorkspace).pathname,
        workspaceDetailsPath: buildDetailsLocation(stoppedWorkspace).pathname,
      };
      if (type === 'workspaceInactive' || type === 'workspaceRunTimeout') {
        workspaceData.timeout = this.getWorkspaceTimeout(type);
      }

      const error = this.workspaceStoppedDetector.getWorkspaceStoppedError(stoppedWorkspace, type);
      this.issuesReporterService.registerIssue(type, error, workspaceData);
    } catch (e) {
      if (e instanceof WorkspaceRunningError) {
        // workspace is running, redirect to workspace url
        if (stoppedWorkspace?.ideUrl) {
          window.location.href = stoppedWorkspace.ideUrl;
          return;
        }
      } else {
        console.warn('Unable to check for stopped workspace.', e);
      }
    }
  }

  private getWorkspaceTimeout(issueType: IssueType): number {
    if (issueType === 'workspaceInactive') {
      return this.store.getState().dwServerConfig.config.timeouts.inactivityTimeout;
    }

    if (issueType === 'workspaceRunTimeout') {
      return this.store.getState().dwServerConfig.config.timeouts.runTimeout;
    }
    return -1;
  }
}
